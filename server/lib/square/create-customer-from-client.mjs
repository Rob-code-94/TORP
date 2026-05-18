import { resolveClientContactEmail } from './search-customers-by-email.mjs';
import { isSyncableEmail } from './syncable-email.mjs';

const PLACEHOLDER_PHONE = '(000) 000-0000';

function splitContactName(name) {
  const trimmed = typeof name === 'string' ? name.trim() : '';
  if (!trimmed) return { givenName: undefined, familyName: undefined };
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return { givenName: parts[0], familyName: undefined };
  return { givenName: parts[0], familyName: parts.slice(1).join(' ') };
}

/** Normalize to E.164-ish digits for Square (9–16 digits, optional leading +). */
export function normalizePhoneForSquare(phone) {
  if (typeof phone !== 'string') return undefined;
  const raw = phone.trim();
  if (!raw || raw === PLACEHOLDER_PHONE) return undefined;
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 9 || digits.length > 15) return undefined;
  return raw.startsWith('+') ? `+${digits}` : digits;
}

/**
 * Build Square CreateCustomer body from Firestore client fields.
 * @param {Record<string, unknown>} data
 * @param {string} clientId
 * @param {string} [searchEmailOverride]
 */
export function buildCreateCustomerBody(data, clientId, searchEmailOverride) {
  const email = resolveClientContactEmail(data, searchEmailOverride);
  if (!isSyncableEmail(email)) {
    return { error: 'Client needs a real email (not quick-add placeholder) to create in Square.' };
  }

  const company =
    typeof data.company === 'string' && data.company.trim() ? data.company.trim() : undefined;
  const contactName =
    typeof data.billingContactName === 'string' && data.billingContactName.trim()
      ? data.billingContactName.trim()
      : typeof data.name === 'string'
        ? data.name.trim()
        : '';
  const { givenName, familyName } = splitContactName(contactName);
  const phone = normalizePhoneForSquare(
    typeof data.phone === 'string' ? data.phone : undefined,
  );

  const body = {
    idempotencyKey: `torp-client-${clientId}`,
    emailAddress: email.trim(),
  };
  if (company) body.companyName = company;
  if (givenName) body.givenName = givenName;
  if (familyName) body.familyName = familyName;
  if (phone) body.phoneNumber = phone;

  const city = typeof data.addressCity === 'string' ? data.addressCity.trim() : '';
  const state = typeof data.addressState === 'string' ? data.addressState.trim() : '';
  const postal = typeof data.addressPostal === 'string' ? data.addressPostal.trim() : '';
  const country = typeof data.addressCountry === 'string' ? data.addressCountry.trim() : '';
  if (city || state || postal || country) {
    body.address = {
      ...(city ? { locality: city } : {}),
      ...(state ? { administrativeDistrictLevel1: state } : {}),
      ...(postal ? { postalCode: postal } : {}),
      ...(country ? { country: country.length === 2 ? country : 'US' } : {}),
    };
  }

  if (!company && !givenName && !familyName && !body.emailAddress && !phone) {
    return { error: 'Not enough client data to create a Square customer.' };
  }

  return { body };
}
