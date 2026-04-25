import { describe, expect, it } from 'vitest';
import { UserRole } from '../types';
import { MOCK_CREW } from '../data/adminMock';
import type { AuthUser } from './auth';
import {
  canHqAdminAccessPath,
  canHqAdminAccessPathForUser,
  getCrewByAuthUser,
  hasHqFeatureAccess,
  hqAdminNavIdsForRole,
  hqAdminNavIdsForUser,
  resolveHqAdminNavId,
} from './hqAccess';

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

describe('crew access overrides', () => {
  const pmUser: AuthUser = {
    role: UserRole.PROJECT_MANAGER,
    displayName: 'Jayden Price',
    email: 'jp@torp.life',
    crewId: 'cr-6',
  };

  it('finds crew by crewId first', () => {
    const crew = getCrewByAuthUser(pmUser);
    expect(crew?.id).toBe('cr-6');
  });

  it('uses role baseline when override missing', () => {
    expect(hasHqFeatureAccess(pmUser, 'quick.addProject')).toBe(true);
    expect(hasHqFeatureAccess(pmUser, 'page.clients')).toBe(false);
  });

  it('allows explicit grant override over role default', () => {
    const crew = MOCK_CREW.find((c) => c.id === 'cr-6');
    const previous = crew?.featureAccess;
    if (crew) crew.featureAccess = { ...(crew.featureAccess || {}), 'page.clients': true };
    expect(hasHqFeatureAccess(pmUser, 'page.clients')).toBe(true);
    if (crew) crew.featureAccess = previous;
  });

  it('allows explicit deny override over role default', () => {
    const crew = MOCK_CREW.find((c) => c.id === 'cr-6');
    const previous = crew?.featureAccess;
    if (crew) crew.featureAccess = { ...(crew.featureAccess || {}), 'quick.addProject': false };
    expect(hasHqFeatureAccess(pmUser, 'quick.addProject')).toBe(false);
    if (crew) crew.featureAccess = previous;
  });

  it('filters nav and routes with user-level feature checks', () => {
    const crew = MOCK_CREW.find((c) => c.id === 'cr-6');
    const previous = crew?.featureAccess;
    if (crew) crew.featureAccess = { ...(crew.featureAccess || {}), 'page.clients': true };
    expect(hqAdminNavIdsForUser(pmUser)).toContain('clients');
    expect(canHqAdminAccessPathForUser('/hq/admin/clients', pmUser)).toBe(true);
    if (crew) crew.featureAccess = previous;
  });
});
