import { describe, expect, it } from 'vitest';
import type { AuthUser } from './auth';
import { UserRole } from '../types';
import { canEditMarketingLanding } from './landingMarketingEdit';

function mockUser(role: UserRole | null): AuthUser | null {
  if (!role) return null;
  return {
    email: 'x@y.com',
    displayName: 'X',
    tenantId: 'tenant-1',
    role,
  };
}

describe('canEditMarketingLanding', () => {
  it('is false while auth is loading', () => {
    expect(canEditMarketingLanding(mockUser(UserRole.ADMIN), true)).toBe(false);
  });

  it('is true only for ADMIN after load', () => {
    expect(canEditMarketingLanding(mockUser(UserRole.ADMIN), false)).toBe(true);
    expect(canEditMarketingLanding(mockUser(UserRole.PROJECT_MANAGER), false)).toBe(false);
    expect(canEditMarketingLanding(mockUser(UserRole.STAFF), false)).toBe(false);
    expect(canEditMarketingLanding(mockUser(UserRole.CLIENT), false)).toBe(false);
    expect(canEditMarketingLanding(null, false)).toBe(false);
  });
});
