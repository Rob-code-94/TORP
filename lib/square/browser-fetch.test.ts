import { describe, expect, it } from 'vitest';
import { friendlySquareApiError } from './browser-fetch';

describe('friendlySquareApiError', () => {
  it('maps auth error codes to actionable copy', () => {
    expect(friendlySquareApiError(401, { error: 'missing_bearer' })).toMatch(/Sign in required/);
    expect(friendlySquareApiError(401, { error: 'invalid_token' })).toMatch(/Session expired/);
    expect(friendlySquareApiError(401, { error: 'Unauthorized' })).toMatch(/Session expired/);
    expect(friendlySquareApiError(403, { error: 'forbidden_not_admin', role: 'STAFF' })).toMatch(
      /admin account/,
    );
    expect(friendlySquareApiError(403, { error: 'forbidden_not_admin', role: 'STAFF' })).toMatch(
      /STAFF/,
    );
  });
});
