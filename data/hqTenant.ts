import type { AuthUser } from '../lib/auth';

/** Fallback when custom claims or demo session omit tenantId (local HQ session). */
export const DEFAULT_HQ_TENANT_ID = 'torp-default';

export function resolveHqTenantId(user: AuthUser | null | undefined): string | null {
  if (!user) return null;
  const raw = user.tenantId?.trim();
  return raw && raw.length > 0 ? raw : DEFAULT_HQ_TENANT_ID;
}

/**
 * Tenant ID for Firestore HQ queries/writes must match `request.auth.token.tenantId` in rules.
 * When Firebase is configured, only the JWT claim counts — do not guess `torp-default`.
 * Local demo sessions (Firebase not configured) keep {@link resolveHqTenantId} fallback behavior.
 */
export function resolveHqTenantScopeForFirestore(
  user: AuthUser | null | undefined,
  firebaseConfigured: boolean,
): string | null {
  if (!user) return null;
  if (firebaseConfigured) {
    const raw = user.tenantId?.trim();
    return raw && raw.length > 0 ? raw : null;
  }
  return resolveHqTenantId(user);
}
