import { getAuth } from 'firebase-admin/auth';

const ROLE_CLAIM = 'role';
const TENANT_CLAIM = 'tenantId';
const ADMIN_ROLE = 'ADMIN';
const logPrefix = '[torp.require-admin]';

/**
 * Verify Bearer Firebase ID token and require ADMIN role.
 * @returns {Promise<
 *   | { ok: true; decoded: import('firebase-admin/auth').DecodedIdToken }
 *   | { ok: false; status: number; error: string; role?: string | null }
 * >}
 */
export async function requireAdminUser(req) {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) {
    return { ok: false, status: 401, error: 'missing_bearer' };
  }
  const token = h.slice(7);
  try {
    const decoded = await getAuth().verifyIdToken(token, true);
    const role = Object.prototype.hasOwnProperty.call(decoded, ROLE_CLAIM)
      ? String(decoded[ROLE_CLAIM])
      : null;
    if (role !== ADMIN_ROLE) {
      return { ok: false, status: 403, error: 'forbidden_not_admin', role };
    }
    return { ok: true, decoded };
  } catch (e) {
    console.warn(logPrefix, 'verifyIdToken failed', e instanceof Error ? e.message : e);
    return { ok: false, status: 401, error: 'invalid_token' };
  }
}

/**
 * @param {import('express').Response} res
 * @param {Awaited<ReturnType<typeof requireAdminUser>>} auth
 * @returns {auth is { ok: true; decoded: import('firebase-admin/auth').DecodedIdToken }}
 */
export function respondAdminAuthFailure(res, auth) {
  if (auth.ok) return false;
  const body = { error: auth.error };
  if ('role' in auth && auth.role !== undefined) {
    body.role = auth.role;
  }
  res.status(auth.status).json(body);
  return true;
}

export function getTenantIdFromDecoded(decoded) {
  if (!Object.prototype.hasOwnProperty.call(decoded, TENANT_CLAIM)) return null;
  const t = decoded[TENANT_CLAIM];
  return typeof t === 'string' && t.length ? t : null;
}

/**
 * @param {Record<string, unknown>} data
 * @param {string | null} tenantId
 */
export function assertClientTenant(data, tenantId) {
  if (!tenantId) return true;
  const docTenant = typeof data.tenantId === 'string' ? data.tenantId : null;
  return docTenant === tenantId;
}
