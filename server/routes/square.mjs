import { FieldValue } from 'firebase-admin/firestore';
import { WebhooksHelper } from 'square';
import { getAdminDb } from '../lib/firebase-admin.mjs';
import { assertClientTenant, getTenantIdFromDecoded, requireAdminUser } from '../lib/require-admin.mjs';
import { getSquareClient } from '../lib/square/client.mjs';
import { countSquareDirectoryCustomers } from '../lib/square/directory-stats.mjs';
import {
  getSquareEnvironmentLabel,
  getSquareLocationId,
  getSquareWebhookNotificationUrl,
  getSquareWebhookSignatureKey,
} from '../lib/square/env.mjs';
import { squareJsonSafe } from '../lib/square/json-safe.mjs';
import { mergeBillingForFirestore } from '../lib/square/merge-client-billing.mjs';
import { parseSquareWebhookPayload } from '../lib/square/parse-webhook.mjs';
import {
  emailsMatchSquareAndCrm,
  normalizeEmailForMatch,
  resolveClientContactEmail,
  searchSquareCustomersMatchingCrmEmail,
} from '../lib/square/search-customers-by-email.mjs';
import {
  fetchInvoicesForCustomer,
  fetchInvoicesForLocation,
  fetchPaymentsForCustomer,
  syncCustomerBillingData,
} from '../lib/square/sync-customer.mjs';

const INVOICE_EVENT_PREFIX = 'invoice.';
const MAX_SYNC_PAGES = 8;
const MAX_CUSTOMERS_PER_RUN = 80;

function toMatchRows(customers) {
  return customers
    .filter((c) => typeof c.id === 'string' && c.id.length > 0)
    .map((c) => ({
      id: c.id,
      givenName: c.givenName,
      familyName: c.familyName,
      emailAddress: c.emailAddress,
    }));
}

async function commitSquareCustomerLink(square, locationId, ref, data, squareCustomerId) {
  const patch = await syncCustomerBillingData(square, locationId, squareCustomerId);
  const existingBilling =
    data.billing && typeof data.billing === 'object' ? data.billing : undefined;
  const billing = mergeBillingForFirestore(existingBilling, patch);
  await ref.update({
    squareCustomerId,
    billing,
    billingSquareSyncedAt: FieldValue.serverTimestamp(),
  });
  return patch;
}

async function loadClientForAdmin(db, clientId, tenantId) {
  const ref = db.collection('clients').doc(clientId);
  const snap = await ref.get();
  if (!snap.exists) return { error: 'Client not found', status: 404 };
  const data = snap.data();
  if (!assertClientTenant(data, tenantId)) {
    return { error: 'Forbidden', status: 403 };
  }
  return { ref, data };
}

export async function squareHealthHandler(req, res) {
  const auth = await requireAdminUser(req);
  if (!auth) return res.status(401).json({ error: 'Unauthorized' });

  const client = getSquareClient();
  if (!client) {
    return res.status(503).json({ ok: false, error: 'SQUARE_ACCESS_TOKEN not configured' });
  }

  try {
    const listRes = await client.locations.list();
    const locs = listRes.locations ?? [];
    const configured = getSquareLocationId();
    const match = configured ? locs.find((l) => l.id === configured) : locs[0];
    let directoryCustomerCount;
    try {
      directoryCustomerCount = await countSquareDirectoryCustomers(client);
    } catch {
      directoryCustomerCount = undefined;
    }
    return res.json({
      ok: true,
      squareEnvironment: getSquareEnvironmentLabel(),
      locationCount: locs.length,
      locationIdConfigured: Boolean(configured),
      activeLocationId: match?.id ?? null,
      activeLocationName: match?.name ?? null,
      directoryCustomerCount,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Square request failed';
    return res.status(502).json({ ok: false, error: msg });
  }
}

export async function squareLinkByEmailHandler(req, res) {
  const auth = await requireAdminUser(req);
  if (!auth) return res.status(401).json({ error: 'Unauthorized' });

  const { clientId: rawClientId, squareCustomerId: pickId, searchEmail } = req.body ?? {};
  const clientId = typeof rawClientId === 'string' ? rawClientId.trim() : '';
  if (!clientId) return res.status(400).json({ error: 'clientId required' });

  const db = getAdminDb();
  if (!db) return res.status(503).json({ error: 'Firebase Admin not configured' });

  const square = getSquareClient();
  const locationId = getSquareLocationId();
  if (!square) {
    return res.status(503).json({
      error:
        'Square not configured: missing SQUARE_ACCESS_TOKEN. Add it to Cloud Run env and restart.',
    });
  }
  if (!locationId) {
    return res.status(503).json({
      error: 'Square not configured: missing SQUARE_LOCATION_ID.',
    });
  }

  const tenantId = getTenantIdFromDecoded(auth.decoded);
  const loaded = await loadClientForAdmin(db, clientId, tenantId);
  if (loaded.error) return res.status(loaded.status).json({ error: loaded.error });
  const { ref, data } = loaded;

  const existingSquareId =
    typeof data.squareCustomerId === 'string' ? data.squareCustomerId.trim() : '';
  const clientEmail = resolveClientContactEmail(data, searchEmail);
  const emailNorm = normalizeEmailForMatch(clientEmail);
  if (!emailNorm) {
    return res.status(400).json({
      error:
        'Client has no usable email on file. Add an email, pass searchEmail, or set squareCustomerId manually.',
    });
  }

  const manualPick = typeof pickId === 'string' ? pickId.trim() : '';
  if (manualPick) {
    const getRes = await square.customers.get({ customerId: manualPick });
    if (getRes.errors?.length) {
      return res.status(400).json({
        error: getRes.errors.map((e) => e.detail ?? e.code).join('; '),
      });
    }
    if (!emailsMatchSquareAndCrm(getRes.customer?.emailAddress, clientEmail)) {
      return res.status(400).json({ error: 'Selected Square customer email does not match this client.' });
    }
    try {
      const billing = await commitSquareCustomerLink(square, locationId, ref, data, manualPick);
      return res.json({ ok: true, status: 'linked', squareCustomerId: manualPick, billing });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Square sync failed';
      return res.status(502).json({ error: msg });
    }
  }

  if (existingSquareId) {
    return res.json({ ok: true, status: 'already_linked', squareCustomerId: existingSquareId });
  }

  const { customers, error: searchErr } = await searchSquareCustomersMatchingCrmEmail(square, clientEmail);
  if (searchErr) return res.status(502).json({ error: searchErr });

  if (customers.length === 0) {
    let directoryCustomerCount;
    try {
      directoryCustomerCount = await countSquareDirectoryCustomers(square);
    } catch {
      directoryCustomerCount = undefined;
    }
    return res.json({
      ok: true,
      status: 'no_match',
      searchedEmail: clientEmail,
      squareEnvironment: getSquareEnvironmentLabel(),
      directoryCustomerCount,
    });
  }

  if (customers.length > 1) {
    return res.json({ ok: true, status: 'choose', matches: toMatchRows(customers) });
  }

  const only = customers[0];
  const sid = only.id;
  if (!sid) return res.status(502).json({ error: 'Square customer missing id' });

  try {
    const billing = await commitSquareCustomerLink(square, locationId, ref, data, sid);
    return res.json({ ok: true, status: 'linked', squareCustomerId: sid, billing });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Square sync failed';
    return res.status(502).json({ error: msg });
  }
}

export async function squareSyncClientHandler(req, res) {
  const auth = await requireAdminUser(req);
  if (!auth) return res.status(401).json({ error: 'Unauthorized' });

  const clientId = typeof req.body?.clientId === 'string' ? req.body.clientId.trim() : '';
  if (!clientId) return res.status(400).json({ error: 'clientId required' });

  const db = getAdminDb();
  if (!db) return res.status(503).json({ error: 'Firebase Admin not configured' });

  const square = getSquareClient();
  const locationId = getSquareLocationId();
  if (!square || !locationId) {
    return res.status(503).json({ error: 'Square not configured (token or SQUARE_LOCATION_ID)' });
  }

  const tenantId = getTenantIdFromDecoded(auth.decoded);
  const loaded = await loadClientForAdmin(db, clientId, tenantId);
  if (loaded.error) return res.status(loaded.status).json({ error: loaded.error });
  const { ref, data } = loaded;

  const squareCustomerId =
    typeof data.squareCustomerId === 'string' ? data.squareCustomerId.trim() : '';
  if (!squareCustomerId) {
    return res.status(400).json({ error: 'Client has no squareCustomerId' });
  }

  try {
    const patch = await syncCustomerBillingData(square, locationId, squareCustomerId);
    const existingBilling =
      data.billing && typeof data.billing === 'object' ? data.billing : undefined;
    const billing = mergeBillingForFirestore(existingBilling, patch);
    await ref.update({
      billing,
      billingSquareSyncedAt: FieldValue.serverTimestamp(),
    });
    return res.json({ ok: true, billing: patch });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Square sync failed';
    return res.status(502).json({ error: msg });
  }
}

export async function squareSyncLocationHandler(_req, res) {
  const auth = await requireAdminUser(_req);
  if (!auth) return res.status(401).json({ error: 'Unauthorized' });

  const db = getAdminDb();
  if (!db) return res.status(503).json({ error: 'Firebase Admin not configured' });

  const square = getSquareClient();
  const locationId = getSquareLocationId();
  if (!square || !locationId) {
    return res.status(503).json({ error: 'Square not configured' });
  }

  const customerIds = new Set();
  try {
    const invoiceList = await fetchInvoicesForLocation(square, locationId, MAX_SYNC_PAGES);
    for (const inv of invoiceList) {
      const cid = inv.primaryRecipient?.customerId;
      if (typeof cid === 'string' && cid) customerIds.add(cid);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Invoice search failed';
    return res.status(502).json({ error: msg });
  }

  const ids = [...customerIds].slice(0, MAX_CUSTOMERS_PER_RUN);
  let updated = 0;
  const errors = [];

  for (const cid of ids) {
    const qs = await db.collection('clients').where('squareCustomerId', '==', cid).limit(5).get();
    if (qs.empty) continue;

    try {
      const patch = await syncCustomerBillingData(square, locationId, cid);
      for (const doc of qs.docs) {
        const data = doc.data();
        const existingBilling =
          data.billing && typeof data.billing === 'object' ? data.billing : undefined;
        const billing = mergeBillingForFirestore(existingBilling, patch);
        await doc.ref.update({
          billing,
          billingSquareSyncedAt: FieldValue.serverTimestamp(),
        });
        updated += 1;
      }
    } catch (e) {
      errors.push(`${cid}: ${e instanceof Error ? e.message : 'sync failed'}`);
    }
  }

  return res.json({
    ok: true,
    customersConsidered: ids.length,
    clientsUpdated: updated,
    errors: errors.slice(0, 10),
  });
}

export async function squareActivityHandler(req, res) {
  const auth = await requireAdminUser(req);
  if (!auth) return res.status(401).json({ error: 'Unauthorized' });

  const clientId = typeof req.query.clientId === 'string' ? req.query.clientId.trim() : '';
  if (!clientId) return res.status(400).json({ error: 'clientId required' });

  const db = getAdminDb();
  if (!db) return res.status(503).json({ error: 'Firebase Admin not configured' });

  const square = getSquareClient();
  const locationId = getSquareLocationId();
  if (!square || !locationId) {
    return res.status(503).json({ error: 'Square not configured' });
  }

  const tenantId = getTenantIdFromDecoded(auth.decoded);
  const loaded = await loadClientForAdmin(db, clientId, tenantId);
  if (loaded.error) return res.status(loaded.status).json({ error: loaded.error });
  const { data } = loaded;

  const squareCustomerId =
    typeof data.squareCustomerId === 'string' ? data.squareCustomerId.trim() : '';
  if (!squareCustomerId) {
    return res.status(400).json({ error: 'No squareCustomerId', invoices: [], payments: [] });
  }

  try {
    const [invoices, payments] = await Promise.all([
      fetchInvoicesForCustomer(square, locationId, squareCustomerId),
      fetchPaymentsForCustomer(square, locationId, squareCustomerId),
    ]);
    return res.json({
      invoices: squareJsonSafe(invoices),
      payments: squareJsonSafe(payments),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Square fetch failed';
    return res.status(502).json({ error: msg });
  }
}

export async function squareWebhookHandler(req, res) {
  const signatureKey = getSquareWebhookSignatureKey();
  const notificationUrl = getSquareWebhookNotificationUrl();
  if (!signatureKey || !notificationUrl) {
    return res.status(503).json({ error: 'Webhook not configured' });
  }

  const sig =
    req.headers['x-square-hmacsha256-signature'] ??
    req.headers['X-Square-HmacSha256-Signature'] ??
    '';

  const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : String(req.body ?? '');

  const ok = await WebhooksHelper.verifySignature({
    requestBody: rawBody,
    signatureHeader: sig,
    signatureKey,
    notificationUrl,
  });

  if (!ok) {
    return res.status(403).json({ error: 'Invalid signature' });
  }

  let parsed;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const { eventId, type, invoiceId, embeddedInvoice } = parseSquareWebhookPayload(parsed);

  if (!eventId) {
    return res.json({ ok: true, note: 'no event id' });
  }

  const db = getAdminDb();
  if (!db) {
    return res.status(503).json({ error: 'Admin not configured' });
  }

  const dupRef = db.collection('square_webhook_events').doc(eventId);
  const dupSnap = await dupRef.get();
  if (dupSnap.exists) {
    return res.json({ ok: true, duplicate: true });
  }

  await dupRef.set({
    type: type ?? 'unknown',
    receivedAt: FieldValue.serverTimestamp(),
  });

  if (!type?.startsWith(INVOICE_EVENT_PREFIX)) {
    return res.json({ ok: true, ignored: true });
  }

  const square = getSquareClient();
  const locationId = getSquareLocationId();
  if (!square || !locationId) {
    return res.json({ ok: true, note: 'square not configured' });
  }

  let invoice = embeddedInvoice;
  const idToFetch = invoice?.id ?? (typeof invoiceId === 'string' ? invoiceId : null);
  if ((!invoice?.primaryRecipient?.customerId || !invoice?.id) && idToFetch) {
    try {
      const invRes = await square.invoices.get({ invoiceId: idToFetch });
      if (invRes.invoice) invoice = invRes.invoice;
    } catch (e) {
      console.warn('[square webhook] get invoice failed:', e);
    }
  }

  const customerId =
    typeof invoice?.primaryRecipient?.customerId === 'string'
      ? invoice.primaryRecipient.customerId
      : null;
  if (!customerId) {
    return res.json({ ok: true, noCustomer: true });
  }

  try {
    const patch = await syncCustomerBillingData(square, locationId, customerId);
    const qs = await db
      .collection('clients')
      .where('squareCustomerId', '==', customerId)
      .limit(10)
      .get();

    for (const doc of qs.docs) {
      const data = doc.data();
      const existingBilling =
        data.billing && typeof data.billing === 'object' ? data.billing : undefined;
      const billing = mergeBillingForFirestore(existingBilling, patch);
      await doc.ref.update({
        billing,
        billingSquareSyncedAt: FieldValue.serverTimestamp(),
      });
    }
  } catch (e) {
    console.error('[square webhook] sync failed:', e);
  }

  return res.json({ ok: true });
}
