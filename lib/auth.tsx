import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { UserRole } from '../types';

/** Logged-in roles only (PUBLIC is represented by `user === null`). */
export type AuthRole = UserRole.ADMIN | UserRole.PROJECT_MANAGER | UserRole.STAFF | UserRole.CLIENT;

const HQ_SESSION_KEY = 'torp.hq.session';

export interface AuthUser {
  role: AuthRole;
  /** Demo display name; replaced by Firebase profile later */
  displayName?: string;
  email?: string;
  /** When role is STAFF, links to `CrewProfile.id` for planner / profile surfaces */
  crewId?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  /** Full session (role + optional identity fields). */
  loginAs: (session: AuthUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredHqUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(HQ_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthUser;
    if (!parsed || typeof parsed.role !== 'string') return null;
    if (
      parsed.role !== UserRole.ADMIN &&
      parsed.role !== UserRole.PROJECT_MANAGER &&
      parsed.role !== UserRole.STAFF
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(() => readStoredHqUser());

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (user && (user.role === UserRole.ADMIN || user.role === UserRole.PROJECT_MANAGER || user.role === UserRole.STAFF)) {
      sessionStorage.setItem(HQ_SESSION_KEY, JSON.stringify(user));
    } else {
      sessionStorage.removeItem(HQ_SESSION_KEY);
    }
  }, [user]);

  const loginAs = useCallback((session: AuthUser) => {
    setUser(session);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    if (typeof window !== 'undefined') sessionStorage.removeItem(HQ_SESSION_KEY);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loginAs,
      logout,
    }),
    [user, loginAs, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
