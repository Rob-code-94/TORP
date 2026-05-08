import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  browserLocalPersistence,
  getIdTokenResult,
  onAuthStateChanged,
  setPersistence,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { UserRole } from '../types';
import { authUserFromFirebase } from './firebaseAuthUser';
import { getFirebaseAuthInstance, getFirebaseFunctionsInstance, isFirebaseConfigured } from './firebase';
import { httpsCallable } from 'firebase/functions';

/** Logged-in roles only (PUBLIC is represented by `user === null`). */
export type AuthRole = UserRole.ADMIN | UserRole.PROJECT_MANAGER | UserRole.STAFF | UserRole.CLIENT;

const HQ_SESSION_KEY = 'torp.hq.session';
const PORTAL_SESSION_KEY = 'torp.portal.session';

export interface AuthUser {
  role: AuthRole;
  displayName?: string;
  email?: string;
  crewId?: string;
  /**
   * Tenant scope from the `tenantId` custom claim. Required for
   * Firestore/Storage rules to evaluate true. May be undefined for legacy demo
   * sessions or while the first `ensureTenantClaim` call is in flight.
   */
  tenantId?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  /** True while the initial Firebase `onAuthStateChanged` (or first session read) completes. */
  loading: boolean;
  /** `true` when this build is using the Firebase client (env configured). */
  isFirebase: boolean;
  /** Demo / session-only: sets in-memory + sessionStorage. Ignored for Firebase when a Firebase `User` is already active (use sign out first). */
  loginAs: (session: AuthUser) => void;
  updateSessionProfile: (patch: Partial<Pick<AuthUser, 'displayName' | 'email'>>) => void;
  logout: () => void;
  /** Re-sync `user` from the current ID token (e.g. after `setCustomUserClaims` on the server). */
  refreshIdToken: () => Promise<void>;
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

function readStoredPortalUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(PORTAL_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthUser;
    if (!parsed || typeof parsed.role !== 'string' || parsed.role !== UserRole.CLIENT) return null;
    return parsed;
  } catch {
    return null;
  }
}

function readLegacySessionUser(): AuthUser | null {
  return readStoredHqUser() ?? readStoredPortalUser();
}

function persistUser(user: AuthUser | null, firebaseUserActive: boolean) {
  if (typeof window === 'undefined') return;
  if (firebaseUserActive) {
    sessionStorage.removeItem(HQ_SESSION_KEY);
    sessionStorage.removeItem(PORTAL_SESSION_KEY);
    return;
  }
  if (!user) {
    sessionStorage.removeItem(HQ_SESSION_KEY);
    sessionStorage.removeItem(PORTAL_SESSION_KEY);
    return;
  }
  if (user.role === UserRole.CLIENT) {
    sessionStorage.setItem(PORTAL_SESSION_KEY, JSON.stringify(user));
    sessionStorage.removeItem(HQ_SESSION_KEY);
  } else {
    sessionStorage.setItem(HQ_SESSION_KEY, JSON.stringify(user));
    sessionStorage.removeItem(PORTAL_SESSION_KEY);
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const useFirebase = isFirebaseConfigured();
  const allowLocalSession = import.meta.env.DEV && !useFirebase;
  const [user, setUser] = useState<AuthUser | null>(() => (allowLocalSession ? readLegacySessionUser() : null));
  const [loading, setLoading] = useState(() => useFirebase);

  useEffect(() => {
    if (!useFirebase) {
      setUser(allowLocalSession ? readLegacySessionUser() : null);
      setLoading(false);
      return;
    }
    const auth = getFirebaseAuthInstance();
    void setPersistence(auth, browserLocalPersistence).catch((err) => {
      console.warn('[torp.auth] failed to set local persistence', err);
    });
    const unsub = onAuthStateChanged(auth, async (next) => {
      if (next) {
        let token = await getIdTokenResult(next);
        const tokenClaims = token.claims as Record<string, unknown>;
        const hasTenant = typeof tokenClaims.tenantId === 'string' && tokenClaims.tenantId.length > 0;
        if (!hasTenant) {
          try {
            const functions = getFirebaseFunctionsInstance();
            const ensure = httpsCallable<Record<string, never>, { refreshed?: boolean }>(
              functions,
              'ensureTenantClaim',
            );
            const res = await ensure({});
            if (res.data?.refreshed) {
              await next.getIdToken(true);
              token = await getIdTokenResult(next);
            }
          } catch (err) {
            // Non-fatal: rules will still deny tenant data, but the rest of the
            // app (sign-in UI, calendar) keeps working. Surface in console for ops.
            console.warn('[torp.auth] ensureTenantClaim failed', err);
          }
        }
        setUser(authUserFromFirebase(next, token));
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem(HQ_SESSION_KEY);
          sessionStorage.removeItem(PORTAL_SESSION_KEY);
        }
      } else {
        setUser(allowLocalSession ? readLegacySessionUser() : null);
      }
      setLoading(false);
    });
    return unsub;
  }, [allowLocalSession, useFirebase]);

  useEffect(() => {
    if (useFirebase || !allowLocalSession) {
      try {
        if (getFirebaseAuthInstance().currentUser) return;
      } catch {
        return;
      }
    }
    persistUser(user, false);
  }, [allowLocalSession, user, useFirebase]);

  const loginAs = useCallback(
    (session: AuthUser) => {
      if (!allowLocalSession) return;
      if (useFirebase && getFirebaseAuthInstance().currentUser) {
        return;
      }
      setUser(session);
    },
    [allowLocalSession, useFirebase]
  );

  const refreshIdToken = useCallback(async () => {
    if (!useFirebase) return;
    const auth = getFirebaseAuthInstance();
    const u = auth.currentUser;
    if (!u) return;
    await u.getIdToken(true);
    const token = await getIdTokenResult(u);
    setUser(authUserFromFirebase(u, token));
  }, [useFirebase]);

  const updateSessionProfile = useCallback(
    (patch: Partial<Pick<AuthUser, 'displayName' | 'email'>>) => {
      setUser((prev) => (prev ? { ...prev, ...patch } : null));
      if (useFirebase) {
        const u = getFirebaseAuthInstance().currentUser;
        if (u) {
          if (patch.displayName != null) {
            void updateProfile(u, { displayName: patch.displayName || undefined });
          }
          // Email change uses `updateEmail` from profile menu; token email updates via re-auth.
        }
      }
    },
    [useFirebase]
  );

  const logout = useCallback(() => {
    if (useFirebase) {
      const auth = getFirebaseAuthInstance();
      if (auth.currentUser) {
        void signOut(auth);
        return;
      }
    }
    setUser(null);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(HQ_SESSION_KEY);
      sessionStorage.removeItem(PORTAL_SESSION_KEY);
    }
  }, [useFirebase]);

  const value = useMemo(
    () => ({
      user,
      loading,
      isFirebase: useFirebase,
      loginAs,
      updateSessionProfile,
      logout,
      refreshIdToken,
    }),
    [user, loading, useFirebase, loginAs, updateSessionProfile, logout, refreshIdToken]
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
