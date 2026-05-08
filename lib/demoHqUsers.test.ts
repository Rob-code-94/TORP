import { describe, expect, it } from 'vitest';
import { UserRole } from '../types';
import { authenticateHqUser, normalizeHqEmail } from './demoHqUsers';

describe('normalizeHqEmail', () => {
  it('trims and lowercases', () => {
    expect(normalizeHqEmail('  William@TORP.Life ')).toBe('william@torp.life');
  });
});

describe('authenticateHqUser', () => {
  it('accepts stakeholder admin accounts', () => {
    const r1 = authenticateHqUser('info@torp.life', 'Admin1234');
    expect(r1.ok).toBe(true);
    if (r1.ok) {
      expect(r1.user.role).toBe(UserRole.ADMIN);
      expect(r1.user.displayName).toBe('ROB R');
    }
    const r2 = authenticateHqUser('William@torp.life', 'Admin1234');
    expect(r2.ok).toBe(true);
    if (r2.ok) {
      expect(r2.user.role).toBe(UserRole.ADMIN);
    }
  });

  it('accepts project manager demo', () => {
    const r = authenticateHqUser('jp@torp.life', 'Crew1234');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.user.role).toBe(UserRole.PROJECT_MANAGER);
      expect(r.user.crewId).toBeUndefined();
    }
  });

  it('rejects wrong password with generic error', () => {
    const r = authenticateHqUser('info@torp.life', 'wrong');
    expect(r.ok).toBe(false);
    if (r.ok === false) expect(r.error).toMatch(/invalid/i);
  });

  it('staff login includes crewId', () => {
    const r = authenticateHqUser('staff@torp.life', 'Staff1234');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.user.crewId).toBe('cr-6');
  });
});
