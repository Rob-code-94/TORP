import {
  customerIdFromInvoice,
  deriveBillingFromSquareData,
} from './billing-merge.mjs';

export async function fetchInvoicesForCustomer(sq, locationId, customerId) {
  const all = [];
  let cursor;
  let guard = 0;
  while (guard++ < 25) {
    const res = await sq.invoices.search({
      query: {
        filter: {
          locationIds: [locationId],
          customerIds: [customerId],
        },
      },
      limit: 200,
      cursor: cursor ?? undefined,
    });
    all.push(...(res.invoices ?? []));
    cursor = res.cursor ?? undefined;
    if (!cursor) break;
  }
  return all;
}

export async function fetchPaymentsForCustomer(sq, locationId, customerId) {
  const begin = new Date();
  begin.setFullYear(begin.getFullYear() - 1);
  const beginTime = begin.toISOString();
  const out = [];
  let page = await sq.payments.list({
    locationId,
    beginTime,
    limit: 100,
    sortOrder: 'DESC',
  });
  for (const p of page.data) {
    if (p.customerId === customerId) out.push(p);
  }
  let guard = 0;
  while (page.hasNextPage() && guard++ < 50) {
    page = await page.getNextPage();
    for (const p of page.data) {
      if (p.customerId === customerId) out.push(p);
    }
  }
  return out;
}

export async function syncCustomerBillingData(sq, locationId, customerId) {
  const [invoices, payments] = await Promise.all([
    fetchInvoicesForCustomer(sq, locationId, customerId),
    fetchPaymentsForCustomer(sq, locationId, customerId),
  ]);
  return deriveBillingFromSquareData(invoices, payments);
}

export function groupInvoicesByCustomerId(invoices) {
  const map = new Map();
  for (const inv of invoices) {
    const cid = customerIdFromInvoice(inv);
    if (!cid) continue;
    const list = map.get(cid) ?? [];
    list.push(inv);
    map.set(cid, list);
  }
  return map;
}

export async function fetchInvoicesForLocation(sq, locationId, maxPages) {
  const all = [];
  let cursor;
  for (let p = 0; p < maxPages; p++) {
    const res = await sq.invoices.search({
      query: {
        filter: { locationIds: [locationId] },
      },
      limit: 200,
      cursor: cursor ?? undefined,
    });
    all.push(...(res.invoices ?? []));
    cursor = res.cursor ?? undefined;
    if (!cursor) break;
  }
  return all;
}
