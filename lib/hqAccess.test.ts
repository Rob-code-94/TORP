import { describe, expect, it } from 'vitest';
import { UserRole } from '../types';
import { canHqAdminAccessPath, hqAdminNavIdsForRole, resolveHqAdminNavId } from './hqAccess';

describe('hqAdminNavIdsForRole', () => {
  it('gives PM a subset', () => {
    const ids = hqAdminNavIdsForRole(UserRole.PROJECT_MANAGER);
    expect(ids).toContain('command');
    expect(ids).toContain('projects');
    expect(ids).not.toContain('financials');
    expect(ids).not.toContain('clients');
    expect(ids).not.toContain('settings');
  });

  it('gives admin full nav', () => {
    const ids = hqAdminNavIdsForRole(UserRole.ADMIN);
    expect(ids).toContain('financials');
    expect(ids).toContain('clients');
  });
});

describe('canHqAdminAccessPath', () => {
  it('blocks PM from financials', () => {
    expect(canHqAdminAccessPath('/hq/admin/financials', UserRole.PROJECT_MANAGER)).toBe(false);
  });

  it('allows PM to planner', () => {
    expect(canHqAdminAccessPath('/hq/admin/planner', UserRole.PROJECT_MANAGER)).toBe(true);
  });
});

describe('resolveHqAdminNavId', () => {
  it('maps command root', () => {
    expect(resolveHqAdminNavId('/hq/admin')).toBe('command');
  });
});
