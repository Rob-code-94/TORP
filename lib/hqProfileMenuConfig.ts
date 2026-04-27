import { UserRole } from '../types';
import { canHqAdminAccessPath } from './hqAccess';

/** Whether “Open org settings” should appear in the admin-shell profile menu. */
export function showAdminOrgSettingsLink(role: UserRole | undefined): boolean {
  if (role !== UserRole.ADMIN) return false;
  return canHqAdminAccessPath('/hq/admin/settings', role);
}

/**
 * Whether “Open settings” should appear in the staff/PM profile menu. ADMIN
 * uses `showAdminOrgSettingsLink` to keep the existing admin label; CLIENT
 * never sees a settings menu item.
 */
export function showStaffSettingsLink(role: UserRole | undefined): boolean {
  return role === UserRole.STAFF || role === UserRole.PROJECT_MANAGER;
}

/** Settings landing path per role. ADMIN keeps `/hq/admin/settings`. */
export function settingsLandingPathForRole(role: UserRole | undefined): string | null {
  switch (role) {
    case UserRole.ADMIN:
      return '/hq/admin/settings/profile';
    case UserRole.PROJECT_MANAGER:
    case UserRole.STAFF:
      return '/hq/staff/settings/profile';
    default:
      return null;
  }
}
