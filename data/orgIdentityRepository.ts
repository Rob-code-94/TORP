import { doc, getDoc, serverTimestamp, setDoc, type Timestamp } from 'firebase/firestore';
import { getFirebaseFirestoreInstance, isFirebaseConfigured } from '../lib/firebase';

export interface OrgIdentity {
  tenantId: string;
  orgName: string;
  primaryContactName: string;
  supportEmail: string;
  accentColor: string;
  logoPath: string | null;
  logoUrl: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
}

const LOCAL_KEY = (tenantId: string) => `torp.orgIdentity.${tenantId}`;

function readLocal(tenantId: string): OrgIdentity | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY(tenantId));
    return raw ? (JSON.parse(raw) as OrgIdentity) : null;
  } catch {
    return null;
  }
}

function writeLocal(identity: OrgIdentity): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LOCAL_KEY(identity.tenantId), JSON.stringify(identity));
  } catch {
    // ignore
  }
}

function timestampToIso(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof (value as Timestamp).toDate === 'function') {
    try {
      return (value as Timestamp).toDate().toISOString();
    } catch {
      return null;
    }
  }
  return null;
}

export function defaultOrgIdentity(tenantId: string): OrgIdentity {
  return {
    tenantId,
    orgName: 'TORP',
    primaryContactName: '',
    supportEmail: '',
    accentColor: '#fafafa',
    logoPath: null,
    logoUrl: null,
    updatedAt: null,
    updatedBy: null,
  };
}

export async function loadOrgIdentity(tenantId: string): Promise<OrgIdentity> {
  if (!isFirebaseConfigured()) {
    return readLocal(tenantId) || defaultOrgIdentity(tenantId);
  }
  try {
    const db = getFirebaseFirestoreInstance();
    const ref = doc(db, 'tenants', tenantId, 'org', 'identity');
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      const seed = defaultOrgIdentity(tenantId);
      writeLocal(seed);
      return seed;
    }
    const data = snap.data() as Partial<OrgIdentity>;
    const merged: OrgIdentity = {
      ...defaultOrgIdentity(tenantId),
      ...data,
      tenantId,
      updatedAt: timestampToIso(data.updatedAt),
    };
    writeLocal(merged);
    return merged;
  } catch (err) {
    console.warn('[torp.orgIdentity] load failed; using local fallback', err);
    return readLocal(tenantId) || defaultOrgIdentity(tenantId);
  }
}

export async function saveOrgIdentity(
  identity: OrgIdentity,
  updatedBy: string,
): Promise<OrgIdentity> {
  const next: OrgIdentity = {
    ...identity,
    updatedAt: new Date().toISOString(),
    updatedBy,
  };
  if (!isFirebaseConfigured()) {
    writeLocal(next);
    return next;
  }
  const db = getFirebaseFirestoreInstance();
  const ref = doc(db, 'tenants', identity.tenantId, 'org', 'identity');
  await setDoc(
    ref,
    {
      tenantId: identity.tenantId,
      orgName: identity.orgName || '',
      primaryContactName: identity.primaryContactName || '',
      supportEmail: identity.supportEmail || '',
      accentColor: identity.accentColor || '#fafafa',
      logoPath: identity.logoPath,
      logoUrl: identity.logoUrl,
      updatedAt: serverTimestamp(),
      updatedBy,
    },
    { merge: true },
  );
  writeLocal(next);
  return next;
}
