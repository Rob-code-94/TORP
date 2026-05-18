import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mapVerifyIdTokenError } from './map-verify-id-token-error.mjs';

describe('mapVerifyIdTokenError', () => {
  it('maps revoked tokens', () => {
    const r = mapVerifyIdTokenError({ code: 'auth/id-token-revoked' });
    assert.equal(r.error, 'invalid_token');
    assert.equal(r.reason, 'id-token-revoked');
    assert.equal(r.status, 401);
  });

  it('maps insufficient admin credential to 503', () => {
    const r = mapVerifyIdTokenError({
      message: 'Credential implementation has insufficient permission',
    });
    assert.equal(r.error, 'server_auth_misconfigured');
    assert.equal(r.reason, 'admin-credential-insufficient');
    assert.equal(r.status, 503);
  });
});
