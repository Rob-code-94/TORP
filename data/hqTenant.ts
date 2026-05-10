import type { AuthUser } from '../lib/auth';

/** Fallback when custom claims or demo session omit tenantId (local HQ session). */
export const DEFAULT_HQ_TENANT_ID = 'torp-default';

export function resolveHqTenantId(user: AuthUser | null | undefined): string | null {
  if (!user) return null;
  const raw = user.tenantId?.trim();
  return raw && raw.length > 0 ? raw : DEFAULT_HQ_TENANT_ID;
}
