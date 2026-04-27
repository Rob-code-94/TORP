import { describe, expect, it } from 'vitest';
import { UserRole } from '../types';
import {
  showAdminOrgSettingsLink,
  showStaffSettingsLink,
  settingsLandingPathForRole,
} from './hqProfileMenuConfig';

describe('showAdminOrgSettingsLink', () => {
  it('is true only for admin', () => {
    expect(showAdminOrgSettingsLink(UserRole.ADMIN)).toBe(true);
    expect(showAdminOrgSettingsLink(UserRole.PROJECT_MANAGER)).toBe(false);
    expect(showAdminOrgSettingsLink(UserRole.STAFF)).toBe(false);
  });
});

describe('showStaffSettingsLink', () => {
  it('is true for staff and project managers', () => {
    expect(showStaffSettingsLink(UserRole.STAFF)).toBe(true);
    expect(showStaffSettingsLink(UserRole.PROJECT_MANAGER)).toBe(true);
  });

  it('is false for admin (admin uses dedicated org settings link)', () => {
    expect(showStaffSettingsLink(UserRole.ADMIN)).toBe(false);
  });

  it('is false for client and undefined roles', () => {
    expect(showStaffSettingsLink(UserRole.CLIENT)).toBe(false);
    expect(showStaffSettingsLink(undefined)).toBe(false);
  });
});

describe('settingsLandingPathForRole', () => {
  it('routes admins to their profile sub-page', () => {
    expect(settingsLandingPathForRole(UserRole.ADMIN)).toBe('/hq/admin/settings/profile');
  });

  it('routes staff and project managers to their profile sub-page', () => {
    expect(settingsLandingPathForRole(UserRole.STAFF)).toBe('/hq/staff/settings/profile');
    expect(settingsLandingPathForRole(UserRole.PROJECT_MANAGER)).toBe(
      '/hq/staff/settings/profile',
    );
  });

  it('returns null for client or unknown roles', () => {
    expect(settingsLandingPathForRole(UserRole.CLIENT)).toBeNull();
    expect(settingsLandingPathForRole(undefined)).toBeNull();
  });
});
