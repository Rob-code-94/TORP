import type { User } from 'firebase/auth';
import type { IdTokenResult } from 'firebase/auth';
import type { AuthUser, AuthRole } from './auth';
import { UserRole } from '../types';

function claimString(claims: Record<string, unknown>, key: string): string | undefined {
  const v = claims[key];
  return typeof v === 'string' && v ? v : undefined;
}

/** Maps custom claims + Firebase profile to our `AuthUser` shape. */
export function authUserFromFirebase(user: User, token: IdTokenResult): AuthUser {
  const claims = token.claims as Record<string, unknown>;
  const roleRaw = claimString(claims, 'role') || UserRole.STAFF;
  const role = isAuthRole(roleRaw) ? roleRaw : UserRole.STAFF;
  const crewId = claimString(claims, 'crewId');
  return {
    role,
    displayName: user.displayName || user.email?.split('@')[0] || undefined,
    email: user.email || undefined,
    crewId: role === UserRole.STAFF ? crewId : undefined,
  };
}

function isAuthRole(value: string): value is AuthRole {
  return (
    value === UserRole.ADMIN ||
    value === UserRole.PROJECT_MANAGER ||
    value === UserRole.STAFF ||
    value === UserRole.CLIENT
  );
}
