import { UserRole, type PlannerItem, type ProjectCapability } from '../types';
import { capabilitiesForRole } from '../data/hqConstants';

type ProjectRole = UserRole.ADMIN | UserRole.PROJECT_MANAGER;

export function getProjectCapabilities(role: UserRole | undefined): ProjectCapability[] {
  if (role === UserRole.ADMIN) return capabilitiesForRole('ADMIN');
  if (role === UserRole.PROJECT_MANAGER) return capabilitiesForRole('PROJECT_MANAGER');
  return [];
}

export function hasProjectCapability(role: UserRole | undefined, capability: ProjectCapability): boolean {
  return getProjectCapabilities(role).includes(capability);
}

export function isProjectRole(role: UserRole | undefined): role is ProjectRole {
  return role === UserRole.ADMIN || role === UserRole.PROJECT_MANAGER;
}

/**
 * Whether the given user may edit (reschedule, retitle, retype) a planner item.
 *
 * - Admins and project managers always can.
 * - Staff can edit only items where they are listed as the assignee or in `assigneeCrewIds`.
 * - Other roles cannot edit at all.
 */
export function canEditPlannerItem(
  role: UserRole | undefined,
  item: PlannerItem,
  options?: { crewId?: string }
): boolean {
  if (isProjectRole(role)) return true;
  if (role === UserRole.STAFF) {
    const crewId = options?.crewId;
    if (!crewId) return false;
    if (item.assigneeCrewId === crewId) return true;
    if (item.assigneeCrewIds?.includes(crewId)) return true;
  }
  return false;
}
