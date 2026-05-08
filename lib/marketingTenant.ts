/**
 * Firestore path prefix for public marketing content (showcase reel + landing portfolio).
 * Override via `VITE_MARKETING_TENANT_ID` when a Firebase project hosts multiple orgs.
 */
export const MARKETING_TENANT_FALLBACK = 'torp-default';

export function getMarketingTenantId(): string {
  const fromEnv = import.meta.env.VITE_MARKETING_TENANT_ID;
  if (typeof fromEnv === 'string' && fromEnv.trim().length > 0) return fromEnv.trim();
  return MARKETING_TENANT_FALLBACK;
}

/** HQ Org Settings: prefer signed-in tenant; otherwise same subtree as anonymous landing. */
export function getMarketingTenantIdForUser(userTenantId: string | undefined): string {
  return userTenantId && userTenantId.length > 0 ? userTenantId : getMarketingTenantId();
}
