import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { TORP_DEFAULT_TENANT_ID } from './tenantClaim.js';
/**
 * Revokes all refresh tokens for the *calling* user. Forces every device that
 * is signed in as them to require re-authentication within ~1 hour (when the
 * current ID token expires) — and immediately for any client that calls
 * `auth.currentUser.getIdToken(true)`.
 *
 * Self-only by design. Admin tools for crew live under `crew/manage` actions.
 */
export const revokeAllUserSessions = onCall(async (req) => {
    if (!req.auth) {
        throw new HttpsError('unauthenticated', 'Sign in required.');
    }
    const uid = req.auth.uid;
    const claims = (req.auth.token || {});
    const tenantId = (claims.tenantId || '').trim() || TORP_DEFAULT_TENANT_ID;
    const auth = getAuth();
    await auth.revokeRefreshTokens(uid);
    const db = getFirestore();
    await db
        .collection('tenants')
        .doc(tenantId)
        .collection('auditLog')
        .doc()
        .set({
        type: 'auth.session.revokedAll',
        uid,
        email: req.auth.token.email || null,
        tenantId,
        at: FieldValue.serverTimestamp(),
    })
        .catch(() => {
        // best-effort
    });
    return { ok: true };
});
