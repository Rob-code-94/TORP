import { describe, expect, it } from 'vitest';
import {
  QUICK_ADD_EMAIL_SUFFIX,
  clientHasSyncableEmailForSquare,
  isSyncableEmailForSquare,
} from './syncable-email';

describe('syncable-email', () => {
  it('rejects quick-add synthetic emails', () => {
    expect(isSyncableEmailForSquare(`quick-abc${QUICK_ADD_EMAIL_SUFFIX}`)).toBe(false);
    expect(isSyncableEmailForSquare('rhunter@kiarts.live')).toBe(true);
  });

  it('requires at least one real email on client', () => {
    expect(
      clientHasSyncableEmailForSquare({
        email: `x${QUICK_ADD_EMAIL_SUFFIX}`,
        billingEmail: `x${QUICK_ADD_EMAIL_SUFFIX}`,
      }),
    ).toBe(false);
    expect(
      clientHasSyncableEmailForSquare({
        email: `x${QUICK_ADD_EMAIL_SUFFIX}`,
        billingEmail: 'billing@example.com',
      }),
    ).toBe(true);
  });
});
