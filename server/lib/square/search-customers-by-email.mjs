export function normalizeEmailForMatch(email) {
  return email.trim().toLowerCase().replace(/\u200b/g, '');
}

export function canonicalGmailEmail(email) {
  const n = normalizeEmailForMatch(email);
  const m = n.match(/^([^@]+)@(gmail\.com|googlemail\.com)$/);
  if (!m) return n;
  let local = m[1];
  const p = local.indexOf('+');
  if (p !== -1) local = local.slice(0, p);
  return `${local.replace(/\./g, '')}@gmail.com`;
}

export function emailsMatchSquareAndCrm(squareEmail, crmEmail) {
  if (!squareEmail?.trim() || !crmEmail.trim()) return false;
  if (normalizeEmailForMatch(squareEmail) === normalizeEmailForMatch(crmEmail)) return true;
  return canonicalGmailEmail(squareEmail) === canonicalGmailEmail(crmEmail);
}

export function resolveClientContactEmail(data, searchEmailOverride) {
  const o = typeof searchEmailOverride === 'string' ? searchEmailOverride.trim() : '';
  if (o && normalizeEmailForMatch(o)) return o;
  const keys = ['email', 'contactEmail', 'primaryEmail', 'clientEmail', 'personalEmail', 'billingEmail'];
  for (const k of keys) {
    const v = data[k];
    if (typeof v === 'string' && normalizeEmailForMatch(v)) return v.trim();
  }
  const contact = data.contact;
  if (contact && typeof contact === 'object') {
    const nested = contact.email;
    if (typeof nested === 'string' && normalizeEmailForMatch(nested)) return nested.trim();
  }
  return typeof data.email === 'string' ? data.email.trim() : '';
}

function dedupeCustomersById(customers) {
  const map = new Map();
  for (const c of customers) {
    const id = c.id;
    if (typeof id === 'string' && id.length) map.set(id, c);
  }
  return [...map.values()];
}

async function collectWithFilter(sq, filter) {
  const out = [];
  let cursor;
  for (let guard = 0; guard < 25; guard++) {
    const res = await sq.customers.search({
      limit: BigInt(100),
      cursor,
      query: { filter },
    });
    if (res.errors?.length) {
      return {
        customers: [],
        error: res.errors.map((e) => [e.code, e.detail].filter(Boolean).join(': ')).join('; '),
      };
    }
    out.push(...(res.customers ?? []));
    cursor = res.cursor;
    if (!cursor) break;
  }
  return { customers: out };
}

async function listCustomersMatchingEmailScan(sq, crmEmail, maxPages) {
  const matches = [];
  try {
    let page = await sq.customers.list({ limit: 100, sortOrder: 'DESC' });
    for (let p = 0; p < maxPages; p++) {
      for (const c of page.data) {
        if (emailsMatchSquareAndCrm(c.emailAddress, crmEmail)) matches.push(c);
      }
      if (!page.hasNextPage()) break;
      page = await page.getNextPage();
    }
    return { customers: dedupeCustomersById(matches) };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { customers: [], error: msg };
  }
}

export async function searchSquareCustomersMatchingCrmEmail(sq, crmEmail) {
  const target = normalizeEmailForMatch(crmEmail);
  if (!target) return { customers: [] };

  const merged = [];
  const tried = new Set();
  const variants = [crmEmail.trim(), target, canonicalGmailEmail(crmEmail.trim())].filter(Boolean);
  for (const variant of variants) {
    if (!variant || tried.has(variant)) continue;
    tried.add(variant);
    const { customers, error } = await collectWithFilter(sq, {
      emailAddress: { exact: variant },
    });
    if (error) return { customers: [], error };
    merged.push(...customers);
  }

  let matched = dedupeCustomersById(merged).filter((c) =>
    emailsMatchSquareAndCrm(c.emailAddress, crmEmail),
  );
  if (matched.length) return { customers: matched };

  const { customers: fuzzyHits, error: fuzzyErr } = await collectWithFilter(sq, {
    emailAddress: { fuzzy: crmEmail.trim() },
  });
  if (fuzzyErr) return { customers: [], error: fuzzyErr };
  matched = dedupeCustomersById(fuzzyHits).filter((c) =>
    emailsMatchSquareAndCrm(c.emailAddress, crmEmail),
  );
  if (matched.length) return { customers: matched };

  const { customers: fuzzyNorm, error: fuzzyNormErr } = await collectWithFilter(sq, {
    emailAddress: { fuzzy: target },
  });
  if (fuzzyNormErr) return { customers: [], error: fuzzyNormErr };
  matched = dedupeCustomersById(fuzzyNorm).filter((c) =>
    emailsMatchSquareAndCrm(c.emailAddress, crmEmail),
  );
  if (matched.length) return { customers: matched };

  const { customers: listed, error: listErr } = await listCustomersMatchingEmailScan(sq, crmEmail, 25);
  if (listErr) return { customers: [], error: listErr };
  return { customers: listed };
}
