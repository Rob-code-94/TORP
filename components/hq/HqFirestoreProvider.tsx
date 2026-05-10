import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../lib/auth';
import { isFirebaseConfigured } from '../../lib/firebase';
import { resolveHqTenantId } from '../../data/hqTenant';
import { clearHqSyncDirectory } from '../../data/hqSyncDirectory';
import { getHqDb, subscribeHqOrgData } from '../../data/hqFirestoreService';
import { setHqTenantForWrites } from '../../data/hqWriteContext';

const HqOrgTickContext = createContext(0);

/** Incremented when Firestore HQ snapshots refresh in-memory org caches (triggers UI memo refresh). */
export function useHqOrgTick(): number {
  return useContext(HqOrgTickContext);
}

/**
 * Subscribes to tenant-scoped HQ collections when Firebase Auth is active.
 * No silent mock fallback — lists stay empty until emulator/production data exists.
 */
export const HqFirestoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isFirebase } = useAuth();
  const [tick, setTick] = useState(0);
  const tenantId = resolveHqTenantId(user);

  useEffect(() => {
    if (!isFirebaseConfigured() || !isFirebase || !user || !tenantId) {
      clearHqSyncDirectory();
      setHqTenantForWrites(null);
      setTick((x) => x + 1);
      return;
    }
    const db = getHqDb();
    if (!db) {
      clearHqSyncDirectory();
      setHqTenantForWrites(null);
      setTick((x) => x + 1);
      return;
    }
    setHqTenantForWrites(tenantId);
    const unsub = subscribeHqOrgData(db, tenantId, () => setTick((x) => x + 1));
    return () => {
      unsub();
      clearHqSyncDirectory();
      setHqTenantForWrites(null);
      setTick((x) => x + 1);
    };
  }, [isFirebase, user, tenantId]);

  const value = useMemo(() => tick, [tick]);
  return <HqOrgTickContext.Provider value={value}>{children}</HqOrgTickContext.Provider>;
};
