import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { onCall, HttpsError, type CallableRequest } from 'firebase-functions/v2/https';

/** Default tenant when claim is missing, used by all auth callables. */
export const TORP_DEFAULT_TENANT_ID = 'torp-default';

/**
 * Default tenantId for the single-tenant deployment. When TORP onboards
 * additional orgs, an admin will assign a different tenantId via a future
 * admin-only claim editor. Until then, every signed-in user is bucketed under
 * the same tenant so [storage.rules](../../../storage.rules) and
 * [firestore.rules](../../../firestore.rules) evaluate true.
 */
const DEFAULT_TENANT_ID = TORP_DEFAULT_TENANT_ID;

interface AuthTokenClaims {
  tenantId?: string;
  role?: string;
  crewId?: string;
}

interface EnsureResult {
  tenantId: string;
  role: string | null;
  /** True if we wrote new claims and the client should call `getIdToken(true)`. */
  refreshed: boolean;
}

/**
 * Ensures the calling user has a `tenantId` (and `role`) custom claim.
 *
 * - If both claims already exist, returns them unchanged (`refreshed=false`).
 * - Otherwise sets `tenantId='torp-default'` (and preserves any existing role
 *   or sets `role='STAFF'` as a safe default), then asks the client to refresh
 *   its ID token.
 *
 * Idempotent: callable any number of times. Stamps a Firestore audit doc on
 * each *new* assignment.
 */
export const ensureTenantClaim = onCall<Record<string, never>>(async (req: CallableRequest) => {
  if (!req.auth) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }
  const uid = req.auth.uid;
  const claims = (req.auth.token || {}) as AuthTokenClaims;
  const existingTenant = (claims.tenantId || '').trim();
  const existingRole = (claims.role || '').trim();

  if (existingTenant && existingRole) {
    return {
      tenantId: existingTenant,
      role: existingRole,
      refreshed: false,
    } satisfies EnsureResult;
  }

  const auth = getAuth();
  const userRecord = await auth.getUser(uid);
  const merged = {
    ...(userRecord.customClaims || {}),
    tenantId: existingTenant || DEFAULT_TENANT_ID,
    role: existingRole || 'STAFF',
  };
  await auth.setCustomUserClaims(uid, merged);

  const db = getFirestore();
  await db
    .collection('tenants')
    .doc(merged.tenantId as string)
    .collection('auditLog')
    .doc()
    .set({
      type: 'auth.tenantClaim.assigned',
      uid,
      email: userRecord.email || null,
      tenantId: merged.tenantId,
      role: merged.role,
      previousTenantId: existingTenant || null,
      previousRole: existingRole || null,
      at: FieldValue.serverTimestamp(),
    })
    .catch(() => {
      // Audit log writes are best-effort — never block sign-in flow.
    });

  return {
    tenantId: merged.tenantId as string,
    role: merged.role as string,
    refreshed: true,
  } satisfies EnsureResult;
});
