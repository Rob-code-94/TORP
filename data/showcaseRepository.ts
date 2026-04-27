import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { getFirebaseFirestoreInstance, isFirebaseConfigured } from '../lib/firebase';

const LOCAL_KEY = 'torp.showcase.v1';

export type ShowcaseAssetKind = 'image' | 'video';

export interface ShowcaseAsset {
  id: string;
  tenantId: string;
  title: string;
  subtitle?: string;
  mediaUrl: string;
  mediaPath?: string;
  mediaKind: ShowcaseAssetKind;
  order: number;
  visible: boolean;
  createdAt?: string;
  updatedAt?: string;
}

function readLocal(): ShowcaseAsset[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ShowcaseAsset[];
  } catch {
    return [];
  }
}

function writeLocal(items: ShowcaseAsset[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(items));
  } catch {
    // ignore quota errors
  }
}

function toIso(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value && 'toDate' in value && typeof value.toDate === 'function') {
    return (value.toDate() as Date).toISOString();
  }
  return undefined;
}

export async function listShowcaseAssets(tenantId: string): Promise<ShowcaseAsset[]> {
  if (!isFirebaseConfigured()) {
    return readLocal().sort((a, b) => a.order - b.order);
  }
  const db = getFirebaseFirestoreInstance();
  const ref = collection(db, 'tenants', tenantId, 'showcase');
  const snap = await getDocs(query(ref, orderBy('order', 'asc')));
  const rows = snap.docs.map((d) => {
    const data = d.data() as Omit<ShowcaseAsset, 'id'> & { createdAt?: unknown; updatedAt?: unknown };
    return {
      id: d.id,
      ...data,
      createdAt: toIso(data.createdAt),
      updatedAt: toIso(data.updatedAt),
    } satisfies ShowcaseAsset;
  });
  writeLocal(rows);
  return rows;
}

export async function saveShowcaseAsset(
  tenantId: string,
  asset: Omit<ShowcaseAsset, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'> & { id?: string },
): Promise<ShowcaseAsset> {
  const payload = {
    tenantId,
    title: asset.title.trim(),
    subtitle: asset.subtitle?.trim() || '',
    mediaUrl: asset.mediaUrl,
    mediaPath: asset.mediaPath || '',
    mediaKind: asset.mediaKind,
    order: asset.order,
    visible: asset.visible,
  };
  if (!isFirebaseConfigured()) {
    const local = readLocal();
    const id = asset.id || `showcase-${Date.now()}`;
    const next: ShowcaseAsset = {
      id,
      ...payload,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const idx = local.findIndex((x) => x.id === id);
    if (idx >= 0) local[idx] = next;
    else local.push(next);
    writeLocal(local.sort((a, b) => a.order - b.order));
    return next;
  }
  const db = getFirebaseFirestoreInstance();
  const ref = collection(db, 'tenants', tenantId, 'showcase');
  if (!asset.id) {
    const created = await addDoc(ref, {
      ...payload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return {
      id: created.id,
      ...payload,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
  await setDoc(doc(db, 'tenants', tenantId, 'showcase', asset.id), {
    ...payload,
    updatedAt: serverTimestamp(),
  }, { merge: true });
  return {
    id: asset.id,
    ...payload,
    updatedAt: new Date().toISOString(),
  };
}

export async function deleteShowcaseAsset(tenantId: string, id: string): Promise<void> {
  if (!isFirebaseConfigured()) {
    const local = readLocal().filter((x) => x.id !== id);
    writeLocal(local);
    return;
  }
  const db = getFirebaseFirestoreInstance();
  await deleteDoc(doc(db, 'tenants', tenantId, 'showcase', id));
}
