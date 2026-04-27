import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { onCall, onRequest, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import sharp from 'sharp';
import { setGlobalOptions } from 'firebase-functions/v2';

setGlobalOptions({ maxInstances: 5, region: 'us-central1' });

if (!getApps().length) {
  initializeApp();
}

function assertIsAdmin<T>(req: CallableRequest<T>): void {
  const role = (req.auth?.token as { role?: string } | undefined)?.role;
  if (role !== 'ADMIN') {
    throw new HttpsError('permission-denied', 'Admins only.');
  }
}

interface AuthTokenShape {
  role?: string;
  tenantId?: string;
  email?: string;
}

interface StoragePolicyRecord {
  tenantId: string;
  roleScopeMap: {
    ADMIN: { canIssueDeliveryLinks: boolean };
    PROJECT_MANAGER: { canIssueDeliveryLinks: boolean };
    STAFF: { canIssueDeliveryLinks: boolean };
    CLIENT: { canIssueDeliveryLinks: boolean };
  };
  maxSizeByMimeGroup: {
    videoMb: number;
    imageMb: number;
    documentMb: number;
    audioMb: number;
  };
  retentionDaysByClass: {
    default: number;
    finance: number;
    legal_hold: number;
  };
  legalHoldDefault: boolean;
  updatedAt: string;
  updatedBy: string;
}

function defaultStoragePolicy(tenantId: string, updatedBy: string): StoragePolicyRecord {
  return {
    tenantId,
    roleScopeMap: {
      ADMIN: { canIssueDeliveryLinks: true },
      PROJECT_MANAGER: { canIssueDeliveryLinks: true },
      STAFF: { canIssueDeliveryLinks: false },
      CLIENT: { canIssueDeliveryLinks: false },
    },
    maxSizeByMimeGroup: {
      videoMb: 10240,
      imageMb: 250,
      documentMb: 100,
      audioMb: 1000,
    },
    retentionDaysByClass: {
      default: 365,
      finance: 2555,
      legal_hold: 36500,
    },
    legalHoldDefault: false,
    updatedAt: new Date().toISOString(),
    updatedBy,
  };
}

async function getOrCreateStoragePolicy(tenantId: string, updatedBy: string): Promise<StoragePolicyRecord> {
  const db = getFirestore();
  const docRef = db.collection('storagePolicies').doc(tenantId);
  const snap = await docRef.get();
  if (snap.exists) {
    return snap.data() as StoragePolicyRecord;
  }
  const fallback = defaultStoragePolicy(tenantId, updatedBy);
  await docRef.set(fallback);
  return fallback;
}

function roleCanIssueLink(policy: StoragePolicyRecord, role: string | undefined): boolean {
  switch (role) {
    case 'ADMIN':
      return policy.roleScopeMap.ADMIN.canIssueDeliveryLinks;
    case 'PROJECT_MANAGER':
      return policy.roleScopeMap.PROJECT_MANAGER.canIssueDeliveryLinks;
    case 'CLIENT':
      return policy.roleScopeMap.CLIENT.canIssueDeliveryLinks;
    case 'STAFF':
    default:
      return policy.roleScopeMap.STAFF.canIssueDeliveryLinks;
  }
}

function assertSignedIn<T>(req: CallableRequest<T>): AuthTokenShape {
  if (!req.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required.');
  }
  return (req.auth.token || {}) as AuthTokenShape;
}

function requireTenant(token: AuthTokenShape): string {
  const tenantId = (token.tenantId || '').trim();
  if (!tenantId) {
    throw new HttpsError('permission-denied', 'Missing tenant scope.');
  }
  return tenantId;
}

function assertCanIssueDeliveryLinks(token: AuthTokenShape): void {
  const role = token.role;
  if (role !== 'ADMIN' && role !== 'PROJECT_MANAGER') {
    throw new HttpsError('permission-denied', 'Only admin or project manager can issue delivery links.');
  }
}

/**
 * Validates that a Firebase user exists for this email, then the client
 * can call `sendPasswordResetEmail` for the same address.
 */
export const adminSendCrewPasswordReset = onCall<{ email: string }>(async (req) => {
  assertIsAdmin(req);
  const email = (req.data?.email || '').trim().toLowerCase();
  if (!email) throw new HttpsError('invalid-argument', 'email is required');
  const auth = getAuth();
  try {
    const user = await auth.getUserByEmail(email);
    return { email: user.email || email };
  } catch (e) {
    const err = e as { code?: string };
    if (err?.code === 'auth/user-not-found') {
      throw new HttpsError('not-found', 'No Auth user for that email.');
    }
    throw new HttpsError('internal', 'Auth lookup failed.');
  }
});

export const adminSetCrewTempPassword = onCall<{ email: string; password: string }>(async (req) => {
  assertIsAdmin(req);
  const email = (req.data?.email || '').trim().toLowerCase();
  const password = (req.data?.password || '').trim();
  if (!email || !password) throw new HttpsError('invalid-argument', 'email and password are required');
  if (password.length < 8) {
    throw new HttpsError('invalid-argument', 'Password must be at least 8 characters.');
  }
  const auth = getAuth();
  try {
    const user = await auth.getUserByEmail(email);
    await auth.updateUser(user.uid, {
      password,
    });
    return { ok: true as const };
  } catch (e) {
    const err = e as { code?: string };
    if (err?.code === 'auth/user-not-found') {
      throw new HttpsError('not-found', 'No Auth user for that email.');
    }
    throw new HttpsError('internal', 'Could not update password.');
  }
});

export const createStorageDeliveryLink = onCall<{
  path: string;
  expiresInMinutes?: number;
  assetId?: string;
  versionId?: string;
}>(async (req) => {
  const token = assertSignedIn(req);
  assertCanIssueDeliveryLinks(token);
  const tenantId = requireTenant(token);
  const policy = await getOrCreateStoragePolicy(tenantId, token.email || req.auth?.uid || 'system');
  if (!roleCanIssueLink(policy, token.role)) {
    throw new HttpsError('permission-denied', 'Storage policy does not allow delivery link issuance for this role.');
  }
  const path = (req.data?.path || '').trim();
  if (!path) {
    throw new HttpsError('invalid-argument', 'path is required');
  }
  const tenantPrefix = `tenants/${tenantId}/`;
  if (!path.startsWith(tenantPrefix)) {
    throw new HttpsError('permission-denied', 'Path is outside tenant scope.');
  }

  const expiresInMinutes = Math.max(1, Math.min(24 * 60, req.data?.expiresInMinutes || 30));
  const expiresAt = Date.now() + expiresInMinutes * 60 * 1000;
  const bucket = getStorage().bucket();
  const [url] = await bucket.file(path).getSignedUrl({
    action: 'read',
    expires: expiresAt,
    version: 'v4',
  });

  const db = getFirestore();
  const linkDoc = db.collection('storageDeliveryLinks').doc();
  await linkDoc.set({
    tenantId,
    path,
    assetId: req.data?.assetId || null,
    versionId: req.data?.versionId || null,
    createdAt: new Date().toISOString(),
    createdByUid: req.auth?.uid || null,
    createdByEmail: token.email || null,
    expiresAt: new Date(expiresAt).toISOString(),
    revokedAt: null,
  });

  return {
    id: linkDoc.id,
    url,
    expiresAt: new Date(expiresAt).toISOString(),
  };
});

export const getStoragePolicy = onCall<{ tenantId?: string }>(async (req) => {
  const token = assertSignedIn(req);
  const tenantId = (req.data?.tenantId || token.tenantId || '').trim();
  if (!tenantId) {
    throw new HttpsError('invalid-argument', 'tenantId is required.');
  }
  if (token.tenantId && token.tenantId !== tenantId) {
    throw new HttpsError('permission-denied', 'Policy request is outside tenant scope.');
  }
  return getOrCreateStoragePolicy(tenantId, token.email || req.auth?.uid || 'system');
});

export const setStoragePolicy = onCall<{ policy: StoragePolicyRecord }>(async (req) => {
  const token = assertSignedIn(req);
  assertIsAdmin(req);
  const tenantId = requireTenant(token);
  const policy = req.data?.policy;
  if (!policy) throw new HttpsError('invalid-argument', 'policy is required');
  if ((policy.tenantId || '').trim() !== tenantId) {
    throw new HttpsError('permission-denied', 'Policy tenant does not match auth tenant.');
  }
  const validated: StoragePolicyRecord = {
    ...policy,
    updatedAt: new Date().toISOString(),
    updatedBy: token.email || req.auth?.uid || 'admin',
  };
  const db = getFirestore();
  await db.collection('storagePolicies').doc(tenantId).set(validated);
  return validated;
});

export const revokeStorageDeliveryLink = onCall<{ linkId: string }>(async (req) => {
  const token = assertSignedIn(req);
  assertCanIssueDeliveryLinks(token);
  const tenantId = requireTenant(token);
  const linkId = (req.data?.linkId || '').trim();
  if (!linkId) {
    throw new HttpsError('invalid-argument', 'linkId is required');
  }

  const db = getFirestore();
  const docRef = db.collection('storageDeliveryLinks').doc(linkId);
  const snap = await docRef.get();
  if (!snap.exists) {
    throw new HttpsError('not-found', 'Delivery link not found.');
  }
  const data = snap.data() as { tenantId?: string; revokedAt?: string | null } | undefined;
  if (!data || data.tenantId !== tenantId) {
    throw new HttpsError('permission-denied', 'Delivery link is outside tenant scope.');
  }
  if (data.revokedAt) {
    return { ok: true as const, alreadyRevoked: true as const };
  }
  await docRef.update({
    revokedAt: new Date().toISOString(),
    revokedByUid: req.auth?.uid || null,
    revokedByEmail: token.email || null,
  });
  return { ok: true as const, alreadyRevoked: false as const };
});

export const createWatermarkedDeliveryLink = onCall<{
  path: string;
  watermarkText?: string;
  expiresInMinutes?: number;
  assetId?: string;
  versionId?: string;
}>(async (req) => {
  const token = assertSignedIn(req);
  assertCanIssueDeliveryLinks(token);
  const tenantId = requireTenant(token);
  const path = (req.data?.path || '').trim();
  if (!path) throw new HttpsError('invalid-argument', 'path is required');
  const expiresInMinutes = Math.max(1, Math.min(24 * 60, req.data?.expiresInMinutes || 30));
  const expiresAt = Date.now() + expiresInMinutes * 60 * 1000;
  const db = getFirestore();
  const linkDoc = db.collection('storageDeliveryLinks').doc();
  await linkDoc.set({
    tenantId,
    path,
    assetId: req.data?.assetId || null,
    versionId: req.data?.versionId || null,
    createdAt: new Date().toISOString(),
    createdByUid: req.auth?.uid || null,
    createdByEmail: token.email || null,
    expiresAt: new Date(expiresAt).toISOString(),
    revokedAt: null,
    watermarkText: (req.data?.watermarkText || 'TORP PREVIEW').slice(0, 64),
    mode: 'watermarked-preview',
  });
  return {
    id: linkDoc.id,
    url: `https://us-central1-${process.env.GCLOUD_PROJECT}.cloudfunctions.net/watermarkedDeliveryPreview?linkId=${encodeURIComponent(linkDoc.id)}`,
    expiresAt: new Date(expiresAt).toISOString(),
  };
});

export const watermarkedDeliveryPreview = onRequest(
  { region: 'us-central1', memory: '1GiB', timeoutSeconds: 120 },
  async (req, res) => {
    const linkId = String(req.query.linkId || '').trim();
    if (!linkId) {
      res.status(400).send('Missing linkId');
      return;
    }
    const db = getFirestore();
    const snap = await db.collection('storageDeliveryLinks').doc(linkId).get();
    if (!snap.exists) {
      res.status(404).send('Link not found');
      return;
    }
    const data = snap.data() as {
      path?: string;
      expiresAt?: string;
      revokedAt?: string | null;
      watermarkText?: string;
    };
    if (data.revokedAt) {
      res.status(410).send('Link revoked');
      return;
    }
    const expiresMs = new Date(data.expiresAt || '').getTime();
    if (!Number.isFinite(expiresMs) || Date.now() > expiresMs) {
      res.status(410).send('Link expired');
      return;
    }
    const path = (data.path || '').trim();
    if (!path) {
      res.status(400).send('Invalid path');
      return;
    }
    const bucket = getStorage().bucket();
    const file = bucket.file(path);
    const [meta] = await file.getMetadata();
    const contentType = (meta.contentType || '').toLowerCase();
    if (!contentType.startsWith('image/')) {
      const [url] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + 5 * 60 * 1000,
        version: 'v4',
      });
      res.redirect(302, url);
      return;
    }
    const [buf] = await file.download();
    const text = (data.watermarkText || 'TORP PREVIEW').slice(0, 64);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900"><style>.t{fill:rgba(255,255,255,.24);font:700 64px Arial,sans-serif;}</style><g transform="rotate(-24 800 450)"><text x="420" y="460" class="t">${text}</text></g></svg>`;
    const out = await sharp(buf).composite([{ input: Buffer.from(svg), gravity: 'center' }]).jpeg({ quality: 82 }).toBuffer();
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'private, max-age=60');
    res.status(200).send(out);
  },
);

export {
  getMyCalendarConnection,
  setMyCalendarPreferences,
  googleCalendarOAuthStart,
  googleCalendarOAuthCallback,
  disconnectGoogleCalendar,
  getMyFeedToken,
  rotateMyFeedToken,
  calendarFeed,
  listOrgCalendarConnections,
  forceResyncForUser,
  retryMyCalendarSync,
  getMyCalendarFreeBusy,
} from './calendar/functions.js';

export {
  onShootWritten,
  onShootUpdated,
  onShootDeleted,
  onMeetingWritten,
  onMeetingUpdated,
  onMeetingDeleted,
  onPlannerItemWritten,
  onPlannerItemUpdated,
  onPlannerItemDeleted,
} from './calendar/triggers.js';

export {
  startCalendarWatchForMe,
  googleCalendarWebhook,
  refreshCalendarWatchChannels,
} from './calendar/watch.js';

export { ensureTenantClaim } from './auth/tenantClaim.js';
export { revokeAllUserSessions } from './auth/revokeSessions.js';

export { onImageAssetFinalized } from './storage/imageThumbnails.js';
export { onPdfAssetFinalized } from './storage/pdfPreview.js';
export { reconcileStorageOrphans } from './storage/orphanReconciliation.js';
export { enforceStorageRetention } from './storage/retentionAutoArchive.js';
export { enqueueVideoTranscode } from './storage/videoTranscode.js';

export {
  onStorageDeliveryLinkCreated,
  onStorageDeliveryLinkUpdated,
  onTenantObjectFinalized,
} from './audit/auditLog.js';
export { fanoutNotificationDeliveries } from './notifications/deliveryEngine.js';
