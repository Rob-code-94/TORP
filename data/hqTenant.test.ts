import { describe, expect, it } from 'vitest';
import type { AuthUser } from '../lib/auth';
import { UserRole } from '../types';
import {
  DEFAULT_HQ_TENANT_ID,
  resolveHqTenantId,
  resolveHqTenantScopeForFirestore,
} from './hqTenant';

function auth(partial: Partial<AuthUser>): AuthUser {
  return {
    role: UserRole.ADMIN,
    ...partial,
  } as AuthUser;
}

describe('resolveHqTenantScopeForFirestore', () => {
  it('returns null when user is missing', () => {
    expect(resolveHqTenantScopeForFirestore(null, true)).toBeNull();
    expect(resolveHqTenantScopeForFirestore(undefined, false)).toBeNull();
  });

  it('requires JWT tenant when Firebase is configured', () => {
    expect(resolveHqTenantScopeForFirestore(auth({ tenantId: undefined }), true)).toBeNull();
    expect(resolveHqTenantScopeForFirestore(auth({ tenantId: '' }), true)).toBeNull();
    expect(resolveHqTenantScopeForFirestore(auth({ tenantId: '  ' }), true)).toBeNull();
    expect(resolveHqTenantScopeForFirestore(auth({ tenantId: 'torp-default' }), true)).toBe('torp-default');
  });

  it('falls back like resolveHqTenantId when Firebase is not configured', () => {
    expect(resolveHqTenantScopeForFirestore(auth({ tenantId: undefined }), false)).toBe(DEFAULT_HQ_TENANT_ID);
    expect(resolveHqTenantScopeForFirestore(auth({ tenantId: 'custom' }), false)).toBe('custom');
  });

  it('matches resolveHqTenantId for non-Firebase mode', () => {
    const u = auth({ tenantId: undefined });
    expect(resolveHqTenantScopeForFirestore(u, false)).toBe(resolveHqTenantId(u));
  });
});
