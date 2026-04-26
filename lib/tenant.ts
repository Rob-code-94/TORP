/**
 * Multi-tenant model for `torp-hub`: one Firebase project, isolation by `tenantId`
 * in custom claims, Firestore paths, and API guards (see `server/index.mjs`).
 */
export const TENANT_CLAIM = 'tenantId' as const;
export const ROLE_CLAIM = 'role' as const;

export type UserRole = 'ADMIN' | 'STAFF' | 'CLIENT' | (string & {});

export type TenantId = string;

export interface ServerAuthContext {
  uid: string;
  email: string | null;
  role: UserRole | null;
  tenantId: TenantId | null;
}

/** Firestore path prefix pattern: `tenants/{tenantId}/...` */
export const tenantsCollection = 'tenants' as const;

export function isTenantId(value: string | null | undefined): value is TenantId {
  return typeof value === 'string' && value.length > 0;
}
