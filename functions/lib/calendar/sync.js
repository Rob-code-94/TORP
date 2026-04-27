import { logger } from 'firebase-functions/v2';
import { sha256Hex } from './crypto.js';
import { deleteSyncMapping, getConnection, getSyncMapping, patchConnection, setSyncMapping, } from './firestore.js';
import { deleteEventForUser, upsertEventForUser, } from './google.js';
/**
 * Idempotent push of a single TORP entity to a user's Google calendar.
 * Stores `calendarSyncMappings/{torpEntityId}` for replay-safe upserts and
 * teardown on disconnect.
 */
export async function pushEventForUid(env, uid, torpEntityId, torpEntityType, payload) {
    const conn = await getConnection(uid);
    if (!conn || conn.status !== 'connected' || !conn.pushEnabled) {
        logger.debug('calendar.sync.push.skipped', { uid, torpEntityId, reason: 'not-connected-or-disabled' });
        return;
    }
    const mapping = await getSyncMapping(`${torpEntityType}:${torpEntityId}`);
    const hash = hashPayload(payload);
    if (mapping?.lastPushedHash === hash) {
        logger.debug('calendar.sync.push.unchanged', { uid, torpEntityId });
        return;
    }
    const externalEventId = mapping?.externalEventId;
    const result = await upsertEventForUser(env, uid, conn.calendarId, payload, externalEventId);
    if (result.ok === false) {
        await patchConnection(uid, {
            lastError: result.error,
            status: 'error',
        });
        logger.warn('calendar.sync.push.failed', { uid, torpEntityId, error: result.error });
        return;
    }
    const next = {
        torpEntityId,
        torpEntityType,
        uid,
        provider: 'google',
        externalEventId: result.externalEventId,
        calendarId: result.calendarId,
        lastPushedHash: hash,
        createdAt: mapping?.createdAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
    await setSyncMapping(`${torpEntityType}:${torpEntityId}`, next);
    await patchConnection(uid, {
        lastSyncAt: new Date().toISOString(),
        lastError: null,
        status: 'connected',
    });
}
export async function deleteEventForUid(env, uid, torpEntityType, torpEntityId) {
    const key = `${torpEntityType}:${torpEntityId}`;
    const mapping = await getSyncMapping(key);
    if (!mapping)
        return;
    const conn = await getConnection(uid);
    if (conn && conn.status === 'connected') {
        const res = await deleteEventForUser(env, uid, mapping.calendarId, mapping.externalEventId);
        if (res.ok === false && !res.error.startsWith('google_delete_404')) {
            logger.warn('calendar.sync.delete.failed', { uid, key, error: res.error });
            // Keep mapping so a retry can clean up; do not throw.
            return;
        }
    }
    await deleteSyncMapping(key);
}
function hashPayload(payload) {
    return sha256Hex(JSON.stringify(payload));
}
