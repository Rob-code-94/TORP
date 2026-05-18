import { describe, expect, it } from 'vitest';
import { friendlySquareApiError } from './browser-fetch';

describe('friendlySquareApiError', () => {
  it('maps auth error codes to actionable copy', () => {
    expect(friendlySquareApiError(401, { error: 'missing_bearer' })).toMatch(/Sign in required/);
    expect(friendlySquareApiError(401, { error: 'invalid_token' })).toMatch(/Sign out of all TORP tabs/);
    expect(friendlySquareApiError(401, { error: 'invalid_token', reason: 'id-token-revoked' })).toMatch(
      /revoked/,
    );
    expect(friendlySquareApiError(503, { error: 'server_auth_misconfigured', reason: 'admin-credential-insufficient' })).toMatch(
      /Cloud Run service account/,
    );
    expect(friendlySquareApiError(403, { error: 'forbidden_not_admin', role: 'STAFF' })).toMatch(
      /admin account/,
    );
    expect(friendlySquareApiError(403, { error: 'forbidden_not_admin', role: 'STAFF' })).toMatch(
      /STAFF/,
    );
  });
});
