import type { AuthUser } from './auth';
import { UserRole } from '../types';

/** ADMIN-only: inline marketing portfolio tools on the public landing. */
export function canEditMarketingLanding(user: AuthUser | null | undefined, authLoading: boolean): boolean {
  if (authLoading) return false;
  return user?.role === UserRole.ADMIN;
}
