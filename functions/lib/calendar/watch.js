import { logger } from 'firebase-functions/v2';
import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { randomUUID } from 'crypto';
import { CALENDAR_SECRETS, CALENDAR_TOKEN_ENC_KEY, GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET } from './secrets.js';
import { getConnection, patchConnection, COL, } from './firestore.js';
import { getValidAccessToken } from './google.js';
import { getFirestore } from 'firebase-admin/firestore';
/**
 * Phase 3 stretch — `events.watch` channel registration plus a webhook that
 * reconciles deletes: when a TORP-pushed event is removed from Google, we
 * delete the corresponding sync mapping so the next entity update re-creates
 * the event instead of orphaning a "ghost" mapping.
 *
 * NOTE: We do NOT delete the source TORP entity. Reflecting edits beyond
 * delete is intentionally out of scope — TORP remains source of truth.
 */
const GCAL_API_BASE = 'https://www.googleapis.com/calendar/v3';
function envFromRuntime() {
    const projectId = process.env.GCLOUD_PROJECT ?? '';
    const region = process.env.FUNCTION_REGION ?? 'us-central1';
    return {
        clientId: GOOGLE_OAUTH_CLIENT_ID.value(),
        clientSecret: GOOGLE_OAUTH_CLIENT_SECRET.value(),
        redirectUri: `https://${region}-${projectId}.cloudfunctions.net/googleCalendarOAuthCallback`,
        encKey: CALENDAR_TOKEN_ENC_KEY.value(),
    };
}
function watchEndpoint() {
    const projectId = process.env.GCLOUD_PROJECT ?? '';
    const region = process.env.FUNCTION_REGION ?? 'us-central1';
    return `https://${region}-${projectId}.cloudfunctions.net/googleCalendarWebhook`;
}
async function startWatchForUid(env, uid) {
    const conn = await getConnection(uid);
    if (!conn || conn.status !== 'connected')
        return;
    const token = await getValidAccessToken(env, uid);
    const channelId = randomUUID();
    const expiration = Date.now() + 6 * 24 * 60 * 60 * 1000; // 6 days; Google caps at 7
    const res = await fetch(`${GCAL_API_BASE}/calendars/${encodeURIComponent(conn.calendarId)}/events/watch`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            id: channelId,
            type: 'web_hook',
            address: watchEndpoint(),
            token: uid,
            expiration: String(expiration),
            params: { ttl: '518400' },
        }),
    });
    if (!res.ok) {
        const detail = await res.text();
        logger.warn('calendar.watch.start.failed', { uid, status: res.status, detail });
        return;
    }
    const data = (await res.json());
    await patchConnection(uid, {
        watchChannelId: data.id ?? channelId,
        watchExpiresAtMs: Number.parseInt(data.expiration ?? `${expiration}`, 10),
    });
}
async function reconcileGoogleDeletesForUid(env, uid) {
    const conn = await getConnection(uid);
    if (!conn || conn.status !== 'connected')
        return;
    const token = await getValidAccessToken(env, uid);
    const params = new URLSearchParams({ showDeleted: 'true', singleEvents: 'true' });
    if (conn.nextSyncToken)
        params.set('syncToken', conn.nextSyncToken);
    else {
        // First-time sync window: last 30 days, next 90 days. This avoids paging
        // the entire calendar history just to find recently-deleted TORP events.
        const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const until = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
        params.set('timeMin', since);
        params.set('timeMax', until);
    }
    const url = `${GCAL_API_BASE}/calendars/${encodeURIComponent(conn.calendarId)}/events?${params.toString()}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
        const detail = await res.text();
        logger.warn('calendar.reconcile.list.failed', { uid, status: res.status, detail });
        return;
    }
    const data = (await res.json());
    const removed = [];
    for (const it of data.items ?? []) {
        if (it.status === 'cancelled' && it.extendedProperties?.private?.torpEntityKey) {
            removed.push(it.extendedProperties.private.torpEntityKey);
        }
    }
    if (removed.length > 0) {
        const db = getFirestore();
        const batch = db.batch();
        for (const key of removed) {
            const ref = db.collection(COL.mappings).doc(key);
            batch.delete(ref);
        }
        await batch.commit();
        logger.info('calendar.reconcile.deletes', { uid, removed });
    }
    if (data.nextSyncToken) {
        await patchConnection(uid, { nextSyncToken: data.nextSyncToken });
    }
}
export const startCalendarWatchForMe = onCall({ secrets: CALENDAR_SECRETS }, async (req) => {
    const uid = req.auth?.uid;
    if (!uid)
        throw new HttpsError('unauthenticated', 'Sign in required.');
    await startWatchForUid(envFromRuntime(), uid);
    return { ok: true };
});
/**
 * Webhook receiver. Google sends a thin notification (no event payload), so we
 * resolve the user via the channel's `X-Goog-Channel-Token` (we set it to uid)
 * and reconcile against `events.list?syncToken=…`.
 */
export const googleCalendarWebhook = onRequest({ secrets: CALENDAR_SECRETS, cors: false }, async (req, res) => {
    try {
        const channelToken = req.get('X-Goog-Channel-Token') ?? '';
        const resourceState = req.get('X-Goog-Resource-State') ?? 'sync';
        if (!channelToken) {
            res.status(204).send('');
            return;
        }
        // The first delivery for any new channel is `sync`; we ignore it.
        if (resourceState === 'sync') {
            res.status(204).send('');
            return;
        }
        await reconcileGoogleDeletesForUid(envFromRuntime(), channelToken);
        res.status(204).send('');
    }
    catch (e) {
        logger.error('calendar.webhook.failed', e);
        res.status(500).send('error');
    }
});
/**
 * Daily refresh: rotate watch channels nearing expiration. Channels max out at
 * 7 days; we proactively renew anything within 1 day of its window.
 */
export const refreshCalendarWatchChannels = onSchedule({ schedule: 'every 24 hours', secrets: CALENDAR_SECRETS }, async () => {
    const env = envFromRuntime();
    const db = getFirestore();
    const cutoff = Date.now() + 24 * 60 * 60 * 1000;
    const snap = await db
        .collection(COL.connections)
        .where('status', '==', 'connected')
        .get();
    for (const doc of snap.docs) {
        const data = doc.data();
        if (!data.uid)
            continue;
        if (data.watchExpiresAtMs && data.watchExpiresAtMs > cutoff)
            continue;
        try {
            await startWatchForUid(env, data.uid);
        }
        catch (e) {
            logger.warn('calendar.watch.refresh.failed', { uid: data.uid, error: e.message });
        }
    }
});
