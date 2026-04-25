import { UserRole } from '../types';
import { canHqAdminAccessPath } from './hqAccess';

/** Whether “Open org settings” should appear in the admin-shell profile menu. */
export function showAdminOrgSettingsLink(role: UserRole | undefined): boolean {
  if (role !== UserRole.ADMIN) return false;
  return canHqAdminAccessPath('/hq/admin/settings', role);
}
