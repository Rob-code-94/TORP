import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import type {
  CalendarConnectionDoc,
  CalendarFeedTokenDoc,
  CalendarSyncMappingDoc,
} from './types.js';

let cached: Firestore | null = null;
function db(): Firestore {
  if (!cached) cached = getFirestore();
  return cached;
}

export const COL = {
  connections: 'calendarConnections',
  mappings: 'calendarSyncMappings',
  feedTokens: 'calendarFeedTokens',
  oauthState: 'calendarOAuthState',
} as const;

export async function getConnection(uid: string): Promise<CalendarConnectionDoc | null> {
  const snap = await db().collection(COL.connections).doc(uid).get();
  if (!snap.exists) return null;
  return snap.data() as CalendarConnectionDoc;
}

export async function setConnection(uid: string, data: CalendarConnectionDoc): Promise<void> {
  await db().collection(COL.connections).doc(uid).set(data, { merge: false });
}

export async function patchConnection(
  uid: string,
  patch: Partial<CalendarConnectionDoc>,
): Promise<void> {
  await db()
    .collection(COL.connections)
    .doc(uid)
    .set(
      { ...patch, updatedAt: new Date().toISOString() },
      { merge: true },
    );
}

export async function deleteConnection(uid: string): Promise<void> {
  await db().collection(COL.connections).doc(uid).delete();
}

export async function listConnections(): Promise<CalendarConnectionDoc[]> {
  const snap = await db().collection(COL.connections).get();
  return snap.docs.map((d) => d.data() as CalendarConnectionDoc);
}

export async function getFeedTokenDoc(uid: string): Promise<CalendarFeedTokenDoc | null> {
  const snap = await db().collection(COL.feedTokens).doc(uid).get();
  if (!snap.exists) return null;
  return snap.data() as CalendarFeedTokenDoc;
}

export async function setFeedTokenDoc(uid: string, data: CalendarFeedTokenDoc): Promise<void> {
  await db().collection(COL.feedTokens).doc(uid).set(data, { merge: false });
}

export async function findFeedTokenDocByHash(
  hash: string,
): Promise<CalendarFeedTokenDoc | null> {
  const snap = await db()
    .collection(COL.feedTokens)
    .where('tokenHash', '==', hash)
    .limit(1)
    .get();
  if (snap.empty) return null;
  return snap.docs[0].data() as CalendarFeedTokenDoc;
}

export async function getSyncMapping(
  torpEntityId: string,
): Promise<CalendarSyncMappingDoc | null> {
  const snap = await db().collection(COL.mappings).doc(torpEntityId).get();
  if (!snap.exists) return null;
  return snap.data() as CalendarSyncMappingDoc;
}

export async function setSyncMapping(
  torpEntityId: string,
  data: CalendarSyncMappingDoc,
): Promise<void> {
  await db().collection(COL.mappings).doc(torpEntityId).set(data, { merge: false });
}

export async function deleteSyncMapping(torpEntityId: string): Promise<void> {
  await db().collection(COL.mappings).doc(torpEntityId).delete();
}

export async function listSyncMappingsForUid(
  uid: string,
): Promise<CalendarSyncMappingDoc[]> {
  const snap = await db().collection(COL.mappings).where('uid', '==', uid).get();
  return snap.docs.map((d) => d.data() as CalendarSyncMappingDoc);
}
