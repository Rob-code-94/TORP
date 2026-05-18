import { FieldValue } from 'firebase-admin/firestore';
import { countSquareDirectoryCustomers } from './directory-stats.mjs';
import { getSquareEnvironmentLabel } from './env.mjs';
import { buildCreateCustomerBody } from './create-customer-from-client.mjs';
import { mergeBillingForFirestore } from './merge-client-billing.mjs';
import {
  emailsMatchSquareAndCrm,
  normalizeEmailForMatch,
  resolveClientContactEmail,
  searchSquareCustomersMatchingCrmEmail,
} from './search-customers-by-email.mjs';
import { clientHasSyncableEmail } from './syncable-email.mjs';
import { syncCustomerBillingData } from './sync-customer.mjs';

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

export async function commitSquareCustomerLink(square, locationId, ref, data, squareCustomerId) {
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

/**
 * Link or create a Square directory customer for a TORP client.
 * @param {{
 *   square: import('square').SquareClient;
 *   locationId: string;
 *   ref: import('firebase-admin/firestore').DocumentReference;
 *   data: Record<string, unknown>;
 *   clientId: string;
 *   createIfMissing?: boolean;
 *   searchEmail?: string;
 *   manualPickId?: string;
 * }} params
 */
export async function ensureClientSquareCustomer(params) {
  const {
    square,
    locationId,
    ref,
    data,
    clientId,
    createIfMissing = false,
    searchEmail,
    manualPickId,
  } = params;

  const existingSquareId =
    typeof data.squareCustomerId === 'string' ? data.squareCustomerId.trim() : '';

  if (!clientHasSyncableEmail(data) && !manualPickId) {
    return {
      ok: true,
      status: 'skipped_no_email',
      message: 'Quick-add placeholder email — add a real email to sync to Square.',
    };
  }

  const clientEmail = resolveClientContactEmail(data, searchEmail);
  const emailNorm = normalizeEmailForMatch(clientEmail);
  if (!emailNorm && !manualPickId) {
    return {
      ok: false,
      status: 'error',
      httpStatus: 400,
      error:
        'Client has no usable email on file. Add an email, pass searchEmail, or set squareCustomerId manually.',
    };
  }

  const manualPick = typeof manualPickId === 'string' ? manualPickId.trim() : '';
  if (manualPick) {
    const getRes = await square.customers.get({ customerId: manualPick });
    if (getRes.errors?.length) {
      return {
        ok: false,
        status: 'error',
        httpStatus: 400,
        error: getRes.errors.map((e) => e.detail ?? e.code).join('; '),
      };
    }
    if (!emailsMatchSquareAndCrm(getRes.customer?.emailAddress, clientEmail)) {
      return {
        ok: false,
        status: 'error',
        httpStatus: 400,
        error: 'Selected Square customer email does not match this client.',
      };
    }
    try {
      const billing = await commitSquareCustomerLink(square, locationId, ref, data, manualPick);
      return { ok: true, status: 'linked', squareCustomerId: manualPick, billing };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Square sync failed';
      return { ok: false, status: 'error', httpStatus: 502, error: msg };
    }
  }

  if (existingSquareId) {
    return { ok: true, status: 'already_linked', squareCustomerId: existingSquareId };
  }

  const { customers, error: searchErr } = await searchSquareCustomersMatchingCrmEmail(square, clientEmail);
  if (searchErr) {
    return { ok: false, status: 'error', httpStatus: 502, error: searchErr };
  }

  if (customers.length > 1) {
    return { ok: true, status: 'choose', matches: toMatchRows(customers) };
  }

  if (customers.length === 1) {
    const sid = customers[0].id;
    if (!sid) {
      return { ok: false, status: 'error', httpStatus: 502, error: 'Square customer missing id' };
    }
    try {
      const billing = await commitSquareCustomerLink(square, locationId, ref, data, sid);
      return { ok: true, status: 'linked', squareCustomerId: sid, billing };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Square sync failed';
      return { ok: false, status: 'error', httpStatus: 502, error: msg };
    }
  }

  if (!createIfMissing) {
    let directoryCustomerCount;
    try {
      directoryCustomerCount = await countSquareDirectoryCustomers(square);
    } catch {
      directoryCustomerCount = undefined;
    }
    return {
      ok: true,
      status: 'no_match',
      searchedEmail: clientEmail,
      squareEnvironment: getSquareEnvironmentLabel(),
      directoryCustomerCount,
    };
  }

  const built = buildCreateCustomerBody(data, clientId, searchEmail);
  if (built.error || !built.body) {
    return { ok: false, status: 'error', httpStatus: 400, error: built.error ?? 'Invalid client data' };
  }

  const createRes = await square.customers.create(built.body);
  if (createRes.errors?.length) {
    return {
      ok: false,
      status: 'error',
      httpStatus: 400,
      error: createRes.errors.map((e) => e.detail ?? e.code).join('; '),
    };
  }

  const newId = createRes.customer?.id;
  if (!newId) {
    return { ok: false, status: 'error', httpStatus: 502, error: 'Square did not return a customer id' };
  }

  try {
    const billing = await commitSquareCustomerLink(square, locationId, ref, data, newId);
    return { ok: true, status: 'created', squareCustomerId: newId, billing };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Square sync failed';
    return { ok: false, status: 'error', httpStatus: 502, error: msg };
  }
}
