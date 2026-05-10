import { DEFAULT_HQ_TENANT_ID } from './hqTenant';

let hqTenantForWrites: string | null = null;

/** Set by `HqFirestoreProvider` when Firebase org sync is active. */
export function setHqTenantForWrites(tenantId: string | null) {
  hqTenantForWrites = tenantId?.trim() || null;
}

export function getHqTenantForWrites(): string {
  return hqTenantForWrites || DEFAULT_HQ_TENANT_ID;
}
