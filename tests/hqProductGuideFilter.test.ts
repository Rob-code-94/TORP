import { describe, expect, it } from 'vitest';
import { UserRole } from '../types';
import type { AuthUser } from '../lib/auth';
import { getGuideSectionsForContext } from '../lib/hqProductGuideFilter';

const admin: AuthUser = { role: UserRole.ADMIN, displayName: 'A', email: 'admin@torp.life' };
const projectManager: AuthUser = {
  role: UserRole.PROJECT_MANAGER,
  displayName: 'P',
  email: 'pm@torp.life',
  crewId: 'cr-6',
};
const staff: AuthUser = {
  role: UserRole.STAFF,
  displayName: 'S',
  email: 'staff@torp.life',
  crewId: 'cr-6',
};

describe('getGuideSectionsForContext', () => {
  it('admin surface includes financials, clients, and settings sections', () => {
    const sections = getGuideSectionsForContext({ surface: 'admin', user: admin });
    const ids = sections.map((s) => s.id);
    expect(ids).toEqual(expect.arrayContaining(['financials', 'clients', 'settings', 'project-detail']));
  });

  it('PM surface omits org Financials, Clients, and Settings guide sections (matches nav)', () => {
    const sections = getGuideSectionsForContext({ surface: 'admin', user: projectManager });
    const ids = sections.map((s) => s.id);
    expect(ids).not.toContain('financials');
    expect(ids).not.toContain('clients');
    expect(ids).not.toContain('settings');
    expect(ids).toContain('project-detail');
  });

  it('staff surface returns crew home sections', () => {
    const sections = getGuideSectionsForContext({ surface: 'staff', user: staff });
    const ids = sections.map((s) => s.id);
    expect(ids).toContain('staff-home');
  });

  it('client surface returns client sections', () => {
    const clientUser: AuthUser = {
      role: UserRole.CLIENT,
      displayName: 'C',
      email: 'client@x.com',
    };
    const sections = getGuideSectionsForContext({ surface: 'client', user: clientUser });
    const ids = sections.map((s) => s.id);
    expect(ids).toContain('client-home');
  });

  it('STAFF in admin project view includes project detail and crew help', () => {
    const sections = getGuideSectionsForContext({
      surface: 'admin',
      user: staff,
      staffInAdminProject: true,
    });
    const ids = sections.map((s) => s.id);
    expect(ids).toContain('project-detail');
    expect(ids).toContain('staff-home');
  });
});
