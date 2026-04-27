import { getFirestore } from 'firebase-admin/firestore';
let cached = null;
function db() {
    if (!cached)
        cached = getFirestore();
    return cached;
}
export const COL = {
    connections: 'calendarConnections',
    mappings: 'calendarSyncMappings',
    feedTokens: 'calendarFeedTokens',
    oauthState: 'calendarOAuthState',
};
export async function getConnection(uid) {
    const snap = await db().collection(COL.connections).doc(uid).get();
    if (!snap.exists)
        return null;
    return snap.data();
}
export async function setConnection(uid, data) {
    await db().collection(COL.connections).doc(uid).set(data, { merge: false });
}
export async function patchConnection(uid, patch) {
    await db()
        .collection(COL.connections)
        .doc(uid)
        .set({ ...patch, updatedAt: new Date().toISOString() }, { merge: true });
}
export async function deleteConnection(uid) {
    await db().collection(COL.connections).doc(uid).delete();
}
export async function listConnections() {
    const snap = await db().collection(COL.connections).get();
    return snap.docs.map((d) => d.data());
}
export async function getFeedTokenDoc(uid) {
    const snap = await db().collection(COL.feedTokens).doc(uid).get();
    if (!snap.exists)
        return null;
    return snap.data();
}
export async function setFeedTokenDoc(uid, data) {
    await db().collection(COL.feedTokens).doc(uid).set(data, { merge: false });
}
export async function findFeedTokenDocByHash(hash) {
    const snap = await db()
        .collection(COL.feedTokens)
        .where('tokenHash', '==', hash)
        .limit(1)
        .get();
    if (snap.empty)
        return null;
    return snap.docs[0].data();
}
export async function getSyncMapping(torpEntityId) {
    const snap = await db().collection(COL.mappings).doc(torpEntityId).get();
    if (!snap.exists)
        return null;
    return snap.data();
}
export async function setSyncMapping(torpEntityId, data) {
    await db().collection(COL.mappings).doc(torpEntityId).set(data, { merge: false });
}
export async function deleteSyncMapping(torpEntityId) {
    await db().collection(COL.mappings).doc(torpEntityId).delete();
}
export async function listSyncMappingsForUid(uid) {
    const snap = await db().collection(COL.mappings).where('uid', '==', uid).get();
    return snap.docs.map((d) => d.data());
}
