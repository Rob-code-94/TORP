import { UserRole, type ProjectCapability } from '../types';
import { capabilitiesForRole } from '../data/adminMock';

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
