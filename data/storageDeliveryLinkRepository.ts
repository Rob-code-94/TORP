import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { getFirebaseFirestoreInstance, isFirebaseConfigured } from '../lib/firebase';

export interface StorageDeliveryLinkRecord {
  id: string;
  tenantId: string;
  path: string;
  assetId: string | null;
  versionId: string | null;
  createdAt: string;
  createdByUid: string | null;
  createdByEmail: string | null;
  expiresAt: string;
  revokedAt: string | null;
  revokedByUid?: string | null;
  revokedByEmail?: string | null;
}

/**
 * Reads delivery links for a particular asset. Filtering on `tenantId` first
 * lets Firestore rules pass with a single-tenant claim — without it, the
 * security rule (which checks the doc's tenantId field) cannot evaluate the
 * query as a whole.
 *
 * Returns [] when Firebase is not configured (mock dev environment).
 */
export async function listDeliveryLinksForAsset(args: {
  tenantId: string;
  assetId: string;
}): Promise<StorageDeliveryLinkRecord[]> {
  if (!isFirebaseConfigured()) return [];
  const db = getFirebaseFirestoreInstance();
  const ref = collection(db, 'storageDeliveryLinks');
  const q = query(
    ref,
    where('tenantId', '==', args.tenantId),
    where('assetId', '==', args.assetId),
    orderBy('createdAt', 'desc'),
    limit(20),
  );
  const snap = await getDocs(q);
  return snap.docs.map((doc) => {
    const data = doc.data() as Omit<StorageDeliveryLinkRecord, 'id'>;
    return { id: doc.id, ...data };
  });
}

/**
 * Reads recent delivery links scoped to a tenant. Used by the admin storage
 * audit screen to list everything that's been issued recently regardless of
 * which deliverable produced it.
 */
export async function listRecentDeliveryLinksForTenant(args: {
  tenantId: string;
  limit?: number;
}): Promise<StorageDeliveryLinkRecord[]> {
  if (!isFirebaseConfigured()) return [];
  const db = getFirebaseFirestoreInstance();
  const ref = collection(db, 'storageDeliveryLinks');
  const q = query(
    ref,
    where('tenantId', '==', args.tenantId),
    orderBy('createdAt', 'desc'),
    limit(Math.max(1, Math.min(200, args.limit ?? 50))),
  );
  const snap = await getDocs(q);
  return snap.docs.map((doc) => {
    const data = doc.data() as Omit<StorageDeliveryLinkRecord, 'id'>;
    return { id: doc.id, ...data };
  });
}

export function describeDeliveryLinkState(
  link: StorageDeliveryLinkRecord,
  now: Date = new Date(),
): 'active' | 'revoked' | 'expired' {
  if (link.revokedAt) return 'revoked';
  const expires = new Date(link.expiresAt);
  if (Number.isFinite(expires.getTime()) && expires.getTime() <= now.getTime()) {
    return 'expired';
  }
  return 'active';
}
