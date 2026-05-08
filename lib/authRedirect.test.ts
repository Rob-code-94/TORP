import { describe, expect, it } from 'vitest';
import { UserRole } from '../types';
import type { AuthUser } from './auth';
import { hasRequiredTenant, hqDestinationForUser, portalDestinationForUser } from './authRedirect';

describe('hasRequiredTenant', () => {
  it('requires tenantId to be present', () => {
    expect(hasRequiredTenant(null)).toBe(false);
    expect(hasRequiredTenant({ role: UserRole.STAFF } as AuthUser)).toBe(false);
    expect(hasRequiredTenant({ role: UserRole.STAFF, tenantId: 'torp-default' } as AuthUser)).toBe(true);
  });
});

describe('hqDestinationForUser', () => {
  it('routes staff to staff dashboard', () => {
    expect(hqDestinationForUser({ role: UserRole.STAFF, tenantId: 't1' })).toBe('/hq/staff');
  });

  it('routes admin and pm to admin dashboard', () => {
    expect(hqDestinationForUser({ role: UserRole.ADMIN, tenantId: 't1' })).toBe('/hq/admin');
    expect(hqDestinationForUser({ role: UserRole.PROJECT_MANAGER, tenantId: 't1' })).toBe('/hq/admin');
  });

  it('routes client to portal', () => {
    expect(hqDestinationForUser({ role: UserRole.CLIENT, tenantId: 't1' })).toBe('/portal');
  });
});

describe('portalDestinationForUser', () => {
  it('keeps client in portal', () => {
    expect(portalDestinationForUser({ role: UserRole.CLIENT, tenantId: 't1' })).toBe('/portal');
  });

  it('sends non-client users to their hq destinations', () => {
    expect(portalDestinationForUser({ role: UserRole.STAFF, tenantId: 't1' })).toBe('/hq/staff');
    expect(portalDestinationForUser({ role: UserRole.ADMIN, tenantId: 't1' })).toBe('/hq/admin');
  });
});
