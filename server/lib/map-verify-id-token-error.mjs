/**
 * Map Firebase Admin verifyIdToken errors to API-safe codes for clients.
 * @param {unknown} e
 * @returns {{ error: string; reason?: string; status: number }}
 */
export function mapVerifyIdTokenError(e) {
  const err = e && typeof e === 'object' ? /** @type {{ code?: string; message?: string }} */ (e) : {};
  const code = typeof err.code === 'string' ? err.code : '';
  const message = e instanceof Error ? e.message : typeof err.message === 'string' ? err.message : '';

  if (code === 'auth/id-token-revoked') {
    return { error: 'invalid_token', reason: 'id-token-revoked', status: 401 };
  }
  if (code === 'auth/id-token-expired') {
    return { error: 'invalid_token', reason: 'id-token-expired', status: 401 };
  }
  if (message.includes('incorrect "aud"') || code === 'auth/argument-error') {
    return { error: 'invalid_token', reason: 'token-audience-mismatch', status: 401 };
  }
  if (message.includes('insufficient permission')) {
    return { error: 'server_auth_misconfigured', reason: 'admin-credential-insufficient', status: 503 };
  }

  const reason = code.startsWith('auth/') ? code.slice(5) : 'verify-failed';
  return { error: 'invalid_token', reason, status: 401 };
}
