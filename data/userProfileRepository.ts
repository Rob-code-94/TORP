import { doc, getDoc, serverTimestamp, setDoc, type Timestamp } from 'firebase/firestore';
import { getFirebaseFirestoreInstance, isFirebaseConfigured } from '../lib/firebase';

export interface UserProfile {
  uid: string;
  tenantId: string;
  displayName: string;
  email: string;
  phone: string;
  timezone: string;
  languagePref: string;
  themePref: 'light' | 'dark' | 'auto';
  avatarAssetId: string | null;
  avatarPath: string | null;
  avatarUrl: string | null;
  recoveryEmail: string | null;
  updatedAt: string | null;
  lastSignInAt: string | null;
}

export type NotificationChannel = 'inApp' | 'email' | 'calendar';

export type NotificationEventId =
  | 'shootReminder24h'
  | 'shootReminder2h'
  | 'plannerDue'
  | 'plannerOverdue'
  | 'clientReviewRequest'
  | 'deliveryLinkIssued'
  | 'deliveryLinkViewed'
  | 'deliveryLinkExpired'
  | 'syncError'
  | 'invoicePaid'
  | 'invoiceOverdue';

export interface QuietHours {
  enabled: boolean;
  startMinutes: number;
  endMinutes: number;
  timezone: string;
}

export type NotificationMatrix = Record<NotificationEventId, Record<NotificationChannel, boolean>>;

export interface NotificationPrefs {
  uid: string;
  tenantId: string;
  matrix: NotificationMatrix;
  quietHours: QuietHours;
  updatedAt: string | null;
}

const ALL_EVENTS: NotificationEventId[] = [
  'shootReminder24h',
  'shootReminder2h',
  'plannerDue',
  'plannerOverdue',
  'clientReviewRequest',
  'deliveryLinkIssued',
  'deliveryLinkViewed',
  'deliveryLinkExpired',
  'syncError',
  'invoicePaid',
  'invoiceOverdue',
];

const ADMIN_ONLY_EVENTS = new Set<NotificationEventId>(['invoicePaid', 'invoiceOverdue']);

export function defaultNotificationMatrix(): NotificationMatrix {
  const matrix: Partial<NotificationMatrix> = {};
  for (const eventId of ALL_EVENTS) {
    matrix[eventId] = { inApp: true, email: false, calendar: false };
  }
  return matrix as NotificationMatrix;
}

export function listNotificationEvents(role: string | undefined): {
  id: NotificationEventId;
  label: string;
  blurb: string;
}[] {
  const all: { id: NotificationEventId; label: string; blurb: string }[] = [
    {
      id: 'shootReminder24h',
      label: 'Shoot reminder (24h before)',
      blurb: 'Sent the day before any shoot you are on the call sheet for.',
    },
    {
      id: 'shootReminder2h',
      label: 'Shoot reminder (2h before)',
      blurb: 'Final ping ahead of crew call time.',
    },
    {
      id: 'plannerDue',
      label: 'Planner task due',
      blurb: 'When a planner item assigned to you reaches its due date.',
    },
    {
      id: 'plannerOverdue',
      label: 'Planner task overdue',
      blurb: 'Daily nudge while a planner task remains incomplete past its due date.',
    },
    {
      id: 'clientReviewRequest',
      label: 'Client review request',
      blurb: 'Triggered when a project moves into client review.',
    },
    {
      id: 'deliveryLinkIssued',
      label: 'Delivery link issued',
      blurb: 'Confirmation when an admin or PM creates a signed link from your asset.',
    },
    {
      id: 'deliveryLinkViewed',
      label: 'Delivery link viewed',
      blurb: 'When the recipient opens a delivery link you issued.',
    },
    {
      id: 'deliveryLinkExpired',
      label: 'Delivery link expired',
      blurb: 'Heads up before a delivery link expires so you can reissue.',
    },
    {
      id: 'syncError',
      label: 'Sync error',
      blurb: 'Calendar or storage upload failed and needs your attention.',
    },
    {
      id: 'invoicePaid',
      label: 'Invoice paid',
      blurb: 'Admin / PM only — when a client invoice is marked paid.',
    },
    {
      id: 'invoiceOverdue',
      label: 'Invoice overdue',
      blurb: 'Admin / PM only — when a client invoice passes its due date.',
    },
  ];
  if (role === 'ADMIN' || role === 'PROJECT_MANAGER') return all;
  return all.filter((e) => !ADMIN_ONLY_EVENTS.has(e.id));
}

function defaultQuietHours(): QuietHours {
  return {
    enabled: false,
    startMinutes: 22 * 60,
    endMinutes: 7 * 60,
    timezone: typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC',
  };
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

function profilePath(tenantId: string, uid: string): string[] {
  return ['tenants', tenantId, 'users', uid];
}

function notificationPrefsPath(tenantId: string, uid: string): string[] {
  return ['tenants', tenantId, 'users', uid, 'prefs', 'notifications'];
}

const PROFILE_LOCAL_KEY_PREFIX = 'torp.user.profile.';
const PREFS_LOCAL_KEY_PREFIX = 'torp.user.notificationPrefs.';

function readLocal<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeLocal<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota
  }
}

export function defaultUserProfile(args: {
  uid: string;
  tenantId: string;
  email?: string;
  displayName?: string;
}): UserProfile {
  return {
    uid: args.uid,
    tenantId: args.tenantId,
    displayName: args.displayName || (args.email ? args.email.split('@')[0] : ''),
    email: args.email || '',
    phone: '',
    timezone: typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC',
    languagePref: typeof navigator !== 'undefined' ? navigator.language : 'en-US',
    themePref: 'auto',
    avatarAssetId: null,
    avatarPath: null,
    avatarUrl: null,
    recoveryEmail: null,
    updatedAt: null,
    lastSignInAt: null,
  };
}

export async function loadUserProfile(args: {
  uid: string;
  tenantId: string;
  email?: string;
  displayName?: string;
}): Promise<UserProfile> {
  const localKey = `${PROFILE_LOCAL_KEY_PREFIX}${args.tenantId}.${args.uid}`;
  if (!isFirebaseConfigured()) {
    return readLocal<UserProfile>(localKey) || defaultUserProfile(args);
  }
  try {
    const db = getFirebaseFirestoreInstance();
    const ref = doc(db, ...(profilePath(args.tenantId, args.uid) as [string, ...string[]]));
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      const seed = defaultUserProfile(args);
      writeLocal(localKey, seed);
      return seed;
    }
    const data = snap.data();
    const merged: UserProfile = {
      ...defaultUserProfile(args),
      ...(data as Partial<UserProfile>),
      uid: args.uid,
      tenantId: args.tenantId,
      updatedAt: timestampToIso(data.updatedAt),
      lastSignInAt: timestampToIso(data.lastSignInAt),
    };
    writeLocal(localKey, merged);
    return merged;
  } catch (err) {
    console.warn('[torp.userProfile] load failed; using local fallback', err);
    return readLocal<UserProfile>(localKey) || defaultUserProfile(args);
  }
}

export async function saveUserProfile(profile: UserProfile): Promise<UserProfile> {
  const localKey = `${PROFILE_LOCAL_KEY_PREFIX}${profile.tenantId}.${profile.uid}`;
  const next: UserProfile = { ...profile, updatedAt: new Date().toISOString() };
  if (!isFirebaseConfigured()) {
    writeLocal(localKey, next);
    return next;
  }
  const db = getFirebaseFirestoreInstance();
  const ref = doc(db, ...(profilePath(profile.tenantId, profile.uid) as [string, ...string[]]));
  await setDoc(
    ref,
    {
      uid: profile.uid,
      tenantId: profile.tenantId,
      displayName: profile.displayName || '',
      email: profile.email || '',
      phone: profile.phone || '',
      timezone: profile.timezone || '',
      languagePref: profile.languagePref || '',
      themePref: profile.themePref || 'auto',
      avatarAssetId: profile.avatarAssetId,
      avatarPath: profile.avatarPath,
      avatarUrl: profile.avatarUrl,
      recoveryEmail: profile.recoveryEmail || null,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  writeLocal(localKey, next);
  return next;
}

export async function patchUserProfile(
  args: { tenantId: string; uid: string },
  patch: Partial<Omit<UserProfile, 'uid' | 'tenantId'>>,
): Promise<void> {
  if (!isFirebaseConfigured()) return;
  const db = getFirebaseFirestoreInstance();
  const ref = doc(db, ...(profilePath(args.tenantId, args.uid) as [string, ...string[]]));
  const merge: Record<string, unknown> = { ...patch, updatedAt: serverTimestamp() };
  await setDoc(ref, merge, { merge: true });
}

export function defaultNotificationPrefs(args: { uid: string; tenantId: string }): NotificationPrefs {
  return {
    uid: args.uid,
    tenantId: args.tenantId,
    matrix: defaultNotificationMatrix(),
    quietHours: defaultQuietHours(),
    updatedAt: null,
  };
}

export async function loadNotificationPrefs(args: {
  uid: string;
  tenantId: string;
}): Promise<NotificationPrefs> {
  const localKey = `${PREFS_LOCAL_KEY_PREFIX}${args.tenantId}.${args.uid}`;
  if (!isFirebaseConfigured()) {
    return readLocal<NotificationPrefs>(localKey) || defaultNotificationPrefs(args);
  }
  try {
    const db = getFirebaseFirestoreInstance();
    const ref = doc(db, ...(notificationPrefsPath(args.tenantId, args.uid) as [string, ...string[]]));
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      const seed = defaultNotificationPrefs(args);
      writeLocal(localKey, seed);
      return seed;
    }
    const data = snap.data() as Partial<NotificationPrefs>;
    const merged: NotificationPrefs = {
      ...defaultNotificationPrefs(args),
      ...data,
      uid: args.uid,
      tenantId: args.tenantId,
      matrix: { ...defaultNotificationMatrix(), ...(data.matrix || {}) },
      quietHours: { ...defaultQuietHours(), ...(data.quietHours || {}) },
      updatedAt: timestampToIso(data.updatedAt),
    };
    writeLocal(localKey, merged);
    return merged;
  } catch (err) {
    console.warn('[torp.notificationPrefs] load failed; using local fallback', err);
    return readLocal<NotificationPrefs>(localKey) || defaultNotificationPrefs(args);
  }
}

export async function saveNotificationPrefs(prefs: NotificationPrefs): Promise<NotificationPrefs> {
  const localKey = `${PREFS_LOCAL_KEY_PREFIX}${prefs.tenantId}.${prefs.uid}`;
  const next: NotificationPrefs = { ...prefs, updatedAt: new Date().toISOString() };
  if (!isFirebaseConfigured()) {
    writeLocal(localKey, next);
    return next;
  }
  const db = getFirebaseFirestoreInstance();
  const ref = doc(db, ...(notificationPrefsPath(prefs.tenantId, prefs.uid) as [string, ...string[]]));
  await setDoc(
    ref,
    {
      uid: prefs.uid,
      tenantId: prefs.tenantId,
      matrix: prefs.matrix,
      quietHours: prefs.quietHours,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  writeLocal(localKey, next);
  return next;
}
