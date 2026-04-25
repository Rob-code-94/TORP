import { describe, expect, it } from 'vitest';
import { UserRole } from '../types';
import { showAdminOrgSettingsLink } from './hqProfileMenuConfig';

describe('showAdminOrgSettingsLink', () => {
  it('is true only for admin', () => {
    expect(showAdminOrgSettingsLink(UserRole.ADMIN)).toBe(true);
    expect(showAdminOrgSettingsLink(UserRole.PROJECT_MANAGER)).toBe(false);
    expect(showAdminOrgSettingsLink(UserRole.STAFF)).toBe(false);
  });
});
