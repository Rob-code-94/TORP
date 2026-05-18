import { getAuth } from 'firebase-admin/auth';

const ROLE_CLAIM = 'role';
const TENANT_CLAIM = 'tenantId';
const ADMIN_ROLE = 'ADMIN';

/**
 * Verify Bearer Firebase ID token and require ADMIN role.
 * @returns {Promise<{ decoded: import('firebase-admin/auth').DecodedIdToken } | null>}
 */
export async function requireAdminUser(req) {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) return null;
  const token = h.slice(7);
  try {
    const decoded = await getAuth().verifyIdToken(token, true);
    const role = Object.prototype.hasOwnProperty.call(decoded, ROLE_CLAIM)
      ? String(decoded[ROLE_CLAIM])
      : null;
    if (role !== ADMIN_ROLE) return null;
    return { decoded };
  } catch {
    return null;
  }
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
