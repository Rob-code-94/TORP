import { UserRole } from '../types';
import type { AuthUser } from './auth';

export function hasRequiredTenant(user: AuthUser | null | undefined): user is AuthUser {
  return Boolean(user?.tenantId);
}

export function hqDestinationForUser(user: AuthUser): string {
  switch (user.role) {
    case UserRole.ADMIN:
    case UserRole.PROJECT_MANAGER:
      return '/hq/admin';
    case UserRole.STAFF:
      return '/hq/staff';
    case UserRole.CLIENT:
      return '/portal';
    default:
      return '/hq/login';
  }
}

export function portalDestinationForUser(user: AuthUser): string {
  if (user.role === UserRole.CLIENT) return '/portal';
  return hqDestinationForUser(user);
}
