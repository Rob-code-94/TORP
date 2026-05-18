import { FieldValue } from 'firebase-admin/firestore';
import { WebhooksHelper } from 'square';
import { getAdminDb } from '../lib/firebase-admin.mjs';
import {
  assertClientTenant,
  getTenantIdFromDecoded,
  requireAdminUser,
  respondAdminAuthFailure,
} from '../lib/require-admin.mjs';
import { getSquareClient } from '../lib/square/client.mjs';
import { ensureClientSquareCustomer } from '../lib/square/ensure-client-square.mjs';
import {
  getSquareLocationId,
  getSquareWebhookNotificationUrl,
  getSquareWebhookSignatureKey,
} from '../lib/square/env.mjs';
import { squareJsonSafe } from '../lib/square/json-safe.mjs';
import { mergeBillingForFirestore } from '../lib/square/merge-client-billing.mjs';
import { parseSquareWebhookPayload } from '../lib/square/parse-webhook.mjs';
import {
  createSquareInvoiceDraft,
  getSquareInvoice,
  publishSquareInvoice,
  squareInvoiceToBillingPatch,
} from '../lib/square/create-invoice.mjs';
import { upsertHqInvoiceFromSquare } from '../lib/square/link-hq-invoice.mjs';
import {
  fetchInvoicesForCustomer,
  fetchInvoicesForLocation,
  fetchPaymentsForCustomer,
  syncCustomerBillingData,
} from '../lib/square/sync-customer.mjs';

const INVOICE_EVENT_PREFIX = 'invoice.';
const MAX_SYNC_PAGES = 8;
const MAX_CUSTOMERS_PER_RUN = 80;

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
  if (respondAdminAuthFailure(res, auth)) return;

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

function squareConfigOrError(res) {
  const square = getSquareClient();
  const locationId = getSquareLocationId();
  if (!square) {
    res.status(503).json({
      error:
        'Square not configured: missing SQUARE_ACCESS_TOKEN. Add it to Cloud Run env and restart.',
    });
    return null;
  }
  if (!locationId) {
    res.status(503).json({ error: 'Square not configured: missing SQUARE_LOCATION_ID.' });
    return null;
  }
  return { square, locationId };
}

function sendEnsureResult(res, result) {
  if (!result.ok && result.status === 'error') {
    return res.status(result.httpStatus ?? 500).json({ error: result.error });
  }
  const { ok: _ok, status, httpStatus: _hs, error: _err, ...payload } = result;
  return res.json({ ok: true, status, ...payload });
}

export async function squareLinkByEmailHandler(req, res) {
  const auth = await requireAdminUser(req);
  if (respondAdminAuthFailure(res, auth)) return;

  const { clientId: rawClientId, squareCustomerId: pickId, searchEmail } = req.body ?? {};
  const clientId = typeof rawClientId === 'string' ? rawClientId.trim() : '';
  if (!clientId) return res.status(400).json({ error: 'clientId required' });

  const db = getAdminDb();
  if (!db) return res.status(503).json({ error: 'Firebase Admin not configured' });

  const cfg = squareConfigOrError(res);
  if (!cfg) return;

  const tenantId = getTenantIdFromDecoded(auth.decoded);
  const loaded = await loadClientForAdmin(db, clientId, tenantId);
  if (loaded.error) return res.status(loaded.status).json({ error: loaded.error });

  const result = await ensureClientSquareCustomer({
    square: cfg.square,
    locationId: cfg.locationId,
    ref: loaded.ref,
    data: loaded.data,
    clientId,
    createIfMissing: false,
    searchEmail,
    manualPickId: pickId,
  });
  return sendEnsureResult(res, result);
}

export async function squareEnsureCustomerHandler(req, res) {
  const auth = await requireAdminUser(req);
  if (respondAdminAuthFailure(res, auth)) return;

  const clientId = typeof req.body?.clientId === 'string' ? req.body.clientId.trim() : '';
  if (!clientId) return res.status(400).json({ error: 'clientId required' });

  const db = getAdminDb();
  if (!db) return res.status(503).json({ error: 'Firebase Admin not configured' });

  const cfg = squareConfigOrError(res);
  if (!cfg) return;

  const tenantId = getTenantIdFromDecoded(auth.decoded);
  const loaded = await loadClientForAdmin(db, clientId, tenantId);
  if (loaded.error) return res.status(loaded.status).json({ error: loaded.error });

  const result = await ensureClientSquareCustomer({
    square: cfg.square,
    locationId: cfg.locationId,
    ref: loaded.ref,
    data: loaded.data,
    clientId,
    createIfMissing: true,
  });
  return sendEnsureResult(res, result);
}

export async function squareSyncClientHandler(req, res) {
  const auth = await requireAdminUser(req);
  if (respondAdminAuthFailure(res, auth)) return;

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
  if (respondAdminAuthFailure(res, auth)) return;

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

function parseLineItems(body) {
  const raw = body?.lineItems;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((li) => ({
      label: typeof li?.label === 'string' ? li.label.trim() : '',
      amount: Number(li?.amount),
    }))
    .filter((li) => li.label && Number.isFinite(li.amount) && li.amount > 0);
}

export async function squareCreateInvoiceHandler(req, res) {
  const auth = await requireAdminUser(req);
  if (respondAdminAuthFailure(res, auth)) return;

  const cfg = squareConfigOrError(res);
  if (!cfg) return;

  const clientId = typeof req.body?.clientId === 'string' ? req.body.clientId.trim() : '';
  if (!clientId) return res.status(400).json({ error: 'clientId required' });

  const lineItems = parseLineItems(req.body);
  if (!lineItems.length) return res.status(400).json({ error: 'lineItems required' });

  const dueDate = typeof req.body?.dueDate === 'string' ? req.body.dueDate.trim() : undefined;
  const memo = typeof req.body?.memo === 'string' ? req.body.memo.trim() : undefined;
  const projectId = typeof req.body?.projectId === 'string' ? req.body.projectId.trim() : undefined;

  const db = getAdminDb();
  if (!db) return res.status(503).json({ error: 'Firebase Admin not configured' });

  const tenantId = getTenantIdFromDecoded(auth.decoded);
  const loaded = await loadClientForAdmin(db, clientId, tenantId);
  if (loaded.error) return res.status(loaded.status).json({ error: loaded.error });
  const { data } = loaded;

  const squareCustomerId =
    typeof data.squareCustomerId === 'string' ? data.squareCustomerId.trim() : '';
  if (!squareCustomerId) {
    return res.status(400).json({ error: 'Client has no squareCustomerId — link or create in Square first.' });
  }

  try {
    const invoice = await createSquareInvoiceDraft(cfg.square, {
      locationId: cfg.locationId,
      squareCustomerId,
      lineItems,
      dueDate,
      memo,
    });

    let hqInvoice;
    const docTenant = typeof data.tenantId === 'string' ? data.tenantId : tenantId;
    if (docTenant && projectId) {
      const clientName =
        typeof data.company === 'string' && data.company
          ? data.company
          : typeof data.name === 'string'
            ? data.name
            : 'Client';
      hqInvoice = await upsertHqInvoiceFromSquare(db, {
        tenantId: docTenant,
        projectId,
        clientName,
        squareInvoice: invoice,
      });
    }

    return res.json({
      ok: true,
      squareInvoiceId: invoice.id,
      version: invoice.version,
      status: invoice.status,
      publicUrl: invoice.publicUrl ?? null,
      hqInvoiceId: hqInvoice?.id ?? null,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Square invoice create failed';
    return res.status(502).json({ error: msg });
  }
}

export async function squarePublishInvoiceHandler(req, res) {
  const auth = await requireAdminUser(req);
  if (respondAdminAuthFailure(res, auth)) return;

  const cfg = squareConfigOrError(res);
  if (!cfg) return;

  const squareInvoiceId =
    typeof req.body?.squareInvoiceId === 'string' ? req.body.squareInvoiceId.trim() : '';
  const clientId = typeof req.body?.clientId === 'string' ? req.body.clientId.trim() : '';
  const versionRaw = req.body?.version;
  const projectId = typeof req.body?.projectId === 'string' ? req.body.projectId.trim() : undefined;
  const hqInvoiceId =
    typeof req.body?.hqInvoiceId === 'string' ? req.body.hqInvoiceId.trim() : undefined;

  if (!squareInvoiceId) return res.status(400).json({ error: 'squareInvoiceId required' });
  if (!clientId) return res.status(400).json({ error: 'clientId required' });

  const db = getAdminDb();
  if (!db) return res.status(503).json({ error: 'Firebase Admin not configured' });

  const tenantId = getTenantIdFromDecoded(auth.decoded);
  const loaded = await loadClientForAdmin(db, clientId, tenantId);
  if (loaded.error) return res.status(loaded.status).json({ error: loaded.error });
  const { ref, data } = loaded;

  try {
    let version = versionRaw;
    if (version == null) {
      const current = await getSquareInvoice(cfg.square, squareInvoiceId);
      if (!current?.version) {
        return res.status(404).json({ error: 'Invoice not found in Square' });
      }
      version = current.version;
    }

    const published = await publishSquareInvoice(cfg.square, squareInvoiceId, version);
    const patch = squareInvoiceToBillingPatch(published);
    const existingBilling =
      data.billing && typeof data.billing === 'object' ? data.billing : undefined;
    const billing = mergeBillingForFirestore(existingBilling, patch);
    await ref.update({
      billing,
      billingSquareSyncedAt: FieldValue.serverTimestamp(),
    });

    let hqInvoice;
    const docTenant = typeof data.tenantId === 'string' ? data.tenantId : tenantId;
    if (docTenant && projectId) {
      const clientName =
        typeof data.company === 'string' && data.company
          ? data.company
          : typeof data.name === 'string'
            ? data.name
            : 'Client';
      hqInvoice = await upsertHqInvoiceFromSquare(db, {
        tenantId: docTenant,
        projectId,
        clientName,
        squareInvoice: published,
        existingInvoiceId: hqInvoiceId,
      });
    }

    return res.json({
      ok: true,
      squareInvoiceId: published.id,
      status: published.status,
      publicUrl: published.publicUrl ?? null,
      billing: patch,
      hqInvoiceId: hqInvoice?.id ?? hqInvoiceId ?? null,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Square invoice publish failed';
    return res.status(502).json({ error: msg });
  }
}

export async function squareGetInvoiceHandler(req, res) {
  const auth = await requireAdminUser(req);
  if (respondAdminAuthFailure(res, auth)) return;

  const cfg = squareConfigOrError(res);
  if (!cfg) return;

  const squareInvoiceId =
    typeof req.params?.squareInvoiceId === 'string' ? req.params.squareInvoiceId.trim() : '';
  if (!squareInvoiceId) return res.status(400).json({ error: 'squareInvoiceId required' });

  try {
    const invoice = await getSquareInvoice(cfg.square, squareInvoiceId);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    return res.json({
      ok: true,
      invoice: squareJsonSafe(invoice),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Square invoice fetch failed';
    return res.status(502).json({ error: msg });
  }
}

export async function squareActivityHandler(req, res) {
  const auth = await requireAdminUser(req);
  if (respondAdminAuthFailure(res, auth)) return;

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
