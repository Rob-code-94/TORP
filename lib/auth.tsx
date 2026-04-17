import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { UserRole } from '../types';

/** Logged-in roles only (PUBLIC is represented by `user === null`). */
export type AuthRole = UserRole.ADMIN | UserRole.STAFF | UserRole.CLIENT;

export interface AuthUser {
  role: AuthRole;
  /** Demo display name; replaced by Firebase profile later */
  displayName?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loginAs: (role: AuthRole, displayName?: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);

  const loginAs = useCallback((role: AuthRole, displayName?: string) => {
    setUser({ role, displayName });
  }, []);

  const logout = useCallback(() => {
    setUser(null);
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
