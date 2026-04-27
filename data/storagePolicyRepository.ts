import type { StoragePolicy } from '../types';
import { createDefaultStoragePolicy, getStoragePolicy, setStoragePolicy } from '../lib/storagePolicy';

const LOCAL_KEY = 'torp.storage.policy.v1';

function readLocalPolicy(): StoragePolicy | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoragePolicy;
  } catch {
    return null;
  }
}

function writeLocalPolicy(policy: StoragePolicy) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LOCAL_KEY, JSON.stringify(policy));
}

export async function loadStoragePolicy(tenantId?: string): Promise<StoragePolicy> {
  try {
    const remote = await getStoragePolicy(tenantId);
    writeLocalPolicy(remote);
    return remote;
  } catch {
    const local = readLocalPolicy();
    return local || createDefaultStoragePolicy('local-fallback', tenantId);
  }
}

export async function saveStoragePolicy(policy: StoragePolicy): Promise<StoragePolicy> {
  try {
    const saved = await setStoragePolicy(policy);
    writeLocalPolicy(saved);
    return saved;
  } catch {
    writeLocalPolicy(policy);
    return policy;
  }
}
