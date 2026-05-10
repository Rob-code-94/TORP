import type { ClientProfile } from '../types';
import { getHqClientDirectory } from './hqSyncDirectory';
import { hqDeleteClient, hqUpsertClient } from './hqFirestoreService';
import { getHqTenantForWrites } from './hqWriteContext';

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizeClientInput(input: {
  company: string;
  name: string;
  email: string;
  phone?: string;
  billingEmail: string;
  billingContactName: string;
  addressCity: string;
  addressState: string;
  addressPostal: string;
  addressCountry: string;
  preferredCommunication: 'email' | 'sms' | 'phone';
  timezone: string;
  clientStatus: 'active' | 'prospect' | 'paused';
  notes?: string;
}) {
  return {
    company: input.company.trim(),
    name: input.name.trim(),
    email: normalizeEmail(input.email),
    phone: input.phone?.trim() || '(000) 000-0000',
    billingEmail: normalizeEmail(input.billingEmail),
    billingContactName: input.billingContactName.trim(),
    addressCity: input.addressCity.trim(),
    addressState: input.addressState.trim(),
    addressPostal: input.addressPostal.trim(),
    addressCountry: input.addressCountry.trim() || 'US',
    preferredCommunication: input.preferredCommunication,
    timezone: input.timezone.trim() || 'America/New_York',
    clientStatus: input.clientStatus,
    notes: input.notes?.trim() || '',
  };
}

function validateClientInput(input: ReturnType<typeof normalizeClientInput>): string | null {
  if (!input.company) return 'Company is required.';
  if (!input.name) return 'Primary contact is required.';
  if (!isValidEmail(input.email)) return 'Valid email is required.';
  if (!isValidEmail(input.billingEmail)) return 'Valid billing email is required.';
  if (!input.billingContactName) return 'Billing contact is required.';
  if (!input.addressCity || !input.addressState || !input.addressPostal || !input.addressCountry) {
    return 'Full billing location is required.';
  }
  if (!input.timezone) return 'Timezone is required.';
  return null;
}

const SYNTHETIC_EMAIL_SUFFIX = '@quick-add.local';

function syntheticQuickEmail(): string {
  const id =
    typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.randomUUID === 'function'
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  return `quick-${id}${SYNTHETIC_EMAIL_SUFFIX}`;
}

function validateClientInputQuick(input: { company: string; name: string }): string | null {
  if (!input.company.trim() && !input.name.trim()) {
    return 'Enter a company name or primary contact.';
  }
  return null;
}

function normalizeClientInputQuick(input: {
  company: string;
  name: string;
  email: string;
  phone?: string;
  billingEmail: string;
  billingContactName: string;
  addressCity: string;
  addressState: string;
  addressPostal: string;
  addressCountry: string;
  preferredCommunication: 'email' | 'sms' | 'phone';
  timezone: string;
  clientStatus: 'active' | 'prospect' | 'paused';
  notes?: string;
}): ReturnType<typeof normalizeClientInput> {
  const co = input.company.trim();
  const nm = input.name.trim();
  const company = co || nm;
  const name = nm || co;

  const contactRaw = input.email.trim();
  const billingRaw = input.billingEmail.trim();

  let emailOut = normalizeEmail(contactRaw);
  if (!isValidEmail(emailOut)) {
    emailOut = syntheticQuickEmail();
  }

  let billingEmailOut = normalizeEmail(billingRaw);
  if (!isValidEmail(billingEmailOut)) {
    billingEmailOut = isValidEmail(normalizeEmail(contactRaw)) ? normalizeEmail(contactRaw) : emailOut;
  }

  const billingContactName = input.billingContactName.trim() || name;

  return {
    company,
    name,
    email: emailOut,
    phone: input.phone?.trim() || '(000) 000-0000',
    billingEmail: billingEmailOut,
    billingContactName,
    addressCity: input.addressCity.trim() || 'TBD',
    addressState: input.addressState.trim() || '—',
    addressPostal: input.addressPostal.trim() || '00000',
    addressCountry: input.addressCountry.trim() || 'US',
    preferredCommunication: input.preferredCommunication,
    timezone: input.timezone.trim() || 'America/New_York',
    clientStatus: input.clientStatus,
    notes: input.notes?.trim() || '',
  };
}

function isSyntheticQuickEmail(email: string): boolean {
  return email.toLowerCase().endsWith(SYNTHETIC_EMAIL_SUFFIX);
}

function emailConflictsWithRow(normEmail: string, row: ClientProfile): boolean {
  if (!normEmail || isSyntheticQuickEmail(normEmail)) return false;
  const e = normEmail.toLowerCase();
  return row.email.toLowerCase() === e || row.billingEmail.toLowerCase() === e;
}

function findDuplicateClientQuick(normalized: ReturnType<typeof normalizeClientInput>): ClientProfile | undefined {
  return getHqClientDirectory().find(
    (item) =>
      emailConflictsWithRow(normalized.email, item) || emailConflictsWithRow(normalized.billingEmail, item),
  );
}

export type CreateClientProfileOptions = { quick?: boolean };

export async function persistClientProfile(client: ClientProfile): Promise<void> {
  await hqUpsertClient(getHqTenantForWrites(), client);
}

export function createClientProfile(
  input: {
    company: string;
    name: string;
    email: string;
    phone?: string;
    billingEmail: string;
    billingContactName: string;
    addressCity: string;
    addressState: string;
    addressPostal: string;
    addressCountry: string;
    preferredCommunication: 'email' | 'sms' | 'phone';
    timezone: string;
    clientStatus: 'active' | 'prospect' | 'paused';
    notes?: string;
  },
  options?: CreateClientProfileOptions,
): { ok: true; client: ClientProfile } | { ok: false; error: string } {
  let normalized: ReturnType<typeof normalizeClientInput>;

  if (options?.quick) {
    const quickErr = validateClientInputQuick(input);
    if (quickErr) return { ok: false, error: quickErr };
    normalized = normalizeClientInputQuick(input);
    const duplicateQuick = findDuplicateClientQuick(normalized);
    if (duplicateQuick) {
      return { ok: false, error: 'A client with matching company or email already exists.' };
    }
  } else {
    normalized = normalizeClientInput(input);
    const error = validateClientInput(normalized);
    if (error) return { ok: false, error };

    const duplicate = getHqClientDirectory().find(
      (item) =>
        item.company.toLowerCase() === normalized.company.toLowerCase() ||
        item.email.toLowerCase() === normalized.email ||
        item.billingEmail.toLowerCase() === normalized.billingEmail,
    );
    if (duplicate) {
      return { ok: false, error: 'A client with matching company or email already exists.' };
    }
  }

  const client: ClientProfile = {
    id: `cl-${Date.now()}`,
    company: normalized.company,
    name: normalized.name,
    email: normalized.email,
    phone: normalized.phone,
    billingEmail: normalized.billingEmail,
    billingContactName: normalized.billingContactName,
    addressCity: normalized.addressCity,
    addressState: normalized.addressState,
    addressPostal: normalized.addressPostal,
    addressCountry: normalized.addressCountry,
    preferredCommunication: normalized.preferredCommunication,
    timezone: normalized.timezone,
    clientStatus: normalized.clientStatus,
    city: `${normalized.addressCity}, ${normalized.addressState}`,
    notes: normalized.notes,
    projectIds: [],
    updatedAt: new Date().toISOString(),
  };
  void persistClientProfile(client).catch((err) => console.error('[hq] createClientProfile', err));
  return { ok: true, client };
}

export function updateClientProfile(
  clientId: string,
  input: {
    company: string;
    name: string;
    email: string;
    phone?: string;
    billingEmail: string;
    billingContactName: string;
    addressCity: string;
    addressState: string;
    addressPostal: string;
    addressCountry: string;
    preferredCommunication: 'email' | 'sms' | 'phone';
    timezone: string;
    clientStatus: 'active' | 'prospect' | 'paused';
    notes?: string;
  },
): { ok: true; client: ClientProfile } | { ok: false; error: string } {
  const client = getHqClientDirectory().find((item) => item.id === clientId);
  if (!client) return { ok: false, error: 'Client not found.' };
  const normalized = normalizeClientInput(input);
  const validationError = validateClientInput(normalized);
  if (validationError) return { ok: false, error: validationError };

  const duplicate = getHqClientDirectory().find(
    (item) =>
      item.id !== clientId &&
      (item.company.toLowerCase() === normalized.company.toLowerCase() ||
        item.email.toLowerCase() === normalized.email ||
        item.billingEmail.toLowerCase() === normalized.billingEmail),
  );
  if (duplicate) return { ok: false, error: 'A client with matching company or email already exists.' };

  const next: ClientProfile = {
    ...client,
    company: normalized.company,
    name: normalized.name,
    email: normalized.email,
    phone: normalized.phone,
    billingEmail: normalized.billingEmail,
    billingContactName: normalized.billingContactName,
    addressCity: normalized.addressCity,
    addressState: normalized.addressState,
    addressPostal: normalized.addressPostal,
    addressCountry: normalized.addressCountry,
    preferredCommunication: normalized.preferredCommunication,
    timezone: normalized.timezone,
    clientStatus: normalized.clientStatus,
    city: `${normalized.addressCity}, ${normalized.addressState}`,
    notes: normalized.notes,
    updatedAt: new Date().toISOString(),
  };
  void persistClientProfile(next).catch((err) => console.error('[hq] updateClientProfile', err));
  return { ok: true, client: next };
}

export async function deleteClientProfile(clientId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const client = getHqClientDirectory().find((item) => item.id === clientId);
  if (!client) return { ok: false, error: 'Client not found.' };
  if (client.projectIds.length > 0) {
    return {
      ok: false,
      error: 'This client is linked to projects. Reassign or archive those projects before deleting the profile.',
    };
  }
  try {
    await hqDeleteClient(getHqTenantForWrites(), clientId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not delete client.' };
  }
}
