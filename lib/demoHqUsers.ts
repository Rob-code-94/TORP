import type { AuthUser } from './auth';
import { UserRole } from '../types';

/**
 * Local dev-only credential map. Replace with Firebase Auth before production.
 * Passwords are compared in plaintext for mock login only.
 */
const DEMO_HQ_USERS: Array<{
  email: string;
  password: string;
  role: UserRole.ADMIN | UserRole.PROJECT_MANAGER | UserRole.STAFF;
  displayName: string;
  crewId?: string;
}> = [
  { email: 'info@torp.life', password: 'Admin1234', role: UserRole.ADMIN, displayName: 'ROB R' },
  { email: 'william@torp.life', password: 'Admin1234', role: UserRole.ADMIN, displayName: 'William Fairbanks' },
  { email: 'jp@torp.life', password: 'Crew1234', role: UserRole.PROJECT_MANAGER, displayName: 'Jayden Price' },
  /** Optional staff preview linked to retained mock crew. */
  { email: 'staff@torp.life', password: 'Staff1234', role: UserRole.STAFF, displayName: 'Crew', crewId: 'cr-6' },
];

export function normalizeHqEmail(value: string) {
  return value.trim().toLowerCase();
}

export function authenticateHqUser(
  emailRaw: string,
  password: string
): { ok: true; user: AuthUser } | { ok: false; error: string } {
  const email = normalizeHqEmail(emailRaw);
  if (!email) return { ok: false, error: 'Email is required.' };
  if (!password) return { ok: false, error: 'Password is required.' };
  const row = DEMO_HQ_USERS.find((u) => u.email === email);
  if (!row || row.password !== password) {
    return { ok: false, error: 'Invalid email or password.' };
  }
  return {
    ok: true,
    user: {
      role: row.role,
      displayName: row.displayName,
      email: row.email,
      crewId: row.crewId,
    },
  };
}
