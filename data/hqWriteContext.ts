import { DEFAULT_HQ_TENANT_ID } from './hqTenant';

let hqTenantForWrites: string | null = null;

/** Set by `HqFirestoreProvider` when Firebase org sync is active. */
export function setHqTenantForWrites(tenantId: string | null) {
  hqTenantForWrites = tenantId?.trim() || null;
}

/** Active HQ tenant from {@link setHqTenantForWrites}; null when no scoped session (e.g. Firebase user missing `tenantId` claim). */
export function getHqTenantForWrites(): string | null {
  return hqTenantForWrites;
}

/** Legacy fallback for callers that must supply a string; prefer checking null from {@link getHqTenantForWrites} for Firebase paths. */
export function getHqTenantForWritesOrDefault(): string {
  return hqTenantForWrites ?? DEFAULT_HQ_TENANT_ID;
}
