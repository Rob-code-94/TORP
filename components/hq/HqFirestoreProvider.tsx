import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { formatHqOrgAggregatedListenerError } from '../../lib/formatHqOrgFirestoreError';
import { useAuth } from '../../lib/auth';
import { isFirebaseConfigured } from '../../lib/firebase';
import { resolveHqTenantScopeForFirestore } from '../../data/hqTenant';
import { clearHqSyncDirectory } from '../../data/hqSyncDirectory';
import { getHqDb, subscribeHqOrgData } from '../../data/hqFirestoreService';
import { setHqTenantForWrites } from '../../data/hqWriteContext';

const HqOrgTickContext = createContext(0);
const HqFirestoreListenerErrorContext = createContext<string | null>(null);

/** Incremented when Firestore HQ snapshots refresh in-memory org caches (triggers UI memo refresh). */
export function useHqOrgTick(): number {
  return useContext(HqOrgTickContext);
}

/** Aggregated formatted listener errors while HQ org subscriptions are active (cleared when scope resets). */
export function useHqFirestoreListenerError(): string | null {
  return useContext(HqFirestoreListenerErrorContext);
}

/**
 * Subscribes to tenant-scoped HQ collections when Firebase Auth is active.
 * No silent mock fallback — lists stay empty until emulator/production data exists.
 */
export const HqFirestoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isFirebase } = useAuth();
  const [tick, setTick] = useState(0);
  const [listenerAggregate, setListenerAggregate] = useState<{
    labels: string[];
    sampleErr: unknown;
  } | null>(null);
  const tenantId = resolveHqTenantScopeForFirestore(user, isFirebase);

  const listenerError = useMemo(() => {
    if (!listenerAggregate) return null;
    return formatHqOrgAggregatedListenerError(listenerAggregate.labels, listenerAggregate.sampleErr);
  }, [listenerAggregate]);

  useEffect(() => {
    setListenerAggregate(null);
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
    const unsub = subscribeHqOrgData(
      db,
      tenantId,
      () => setTick((x) => x + 1),
      (err, collectionLabel) => {
        setListenerAggregate((prev) => {
          const nextLabels = new Set(prev?.labels ?? []);
          nextLabels.add(collectionLabel);
          return {
            labels: [...nextLabels].sort(),
            sampleErr: prev?.sampleErr ?? err,
          };
        });
      },
    );
    return () => {
      unsub();
      setListenerAggregate(null);
      clearHqSyncDirectory();
      setHqTenantForWrites(null);
      setTick((x) => x + 1);
    };
  }, [isFirebase, user, tenantId]);

  const tickValue = useMemo(() => tick, [tick]);
  return (
    <HqFirestoreListenerErrorContext.Provider value={listenerError}>
      <HqOrgTickContext.Provider value={tickValue}>{children}</HqOrgTickContext.Provider>
    </HqFirestoreListenerErrorContext.Provider>
  );
};
