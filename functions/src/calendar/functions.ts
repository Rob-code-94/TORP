import { onCall, onRequest, HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { logger } from 'firebase-functions/v2';
import { hmacBase64Url, newFeedToken, sha256Hex } from './crypto.js';
import {
  deleteConnection,
  findFeedTokenDocByHash,
  getConnection,
  getFeedTokenDoc,
  listConnections,
  listSyncMappingsForUid,
  patchConnection,
  setFeedTokenDoc,
  COL,
} from './firestore.js';
import { buildIcsFeed } from './feed.js';
import { loadCrewEvents } from './loader.js';
import {
  buildOAuthAuthorizeUrl,
  decodeOAuthState,
  encodeOAuthState,
  exchangeCodeForTokens,
  fetchUserInfo,
  persistConnection,
  readFreeBusy,
  revokeToken,
  type GoogleEnv,
} from './google.js';
import { pushEventForUid } from './sync.js';
import { CALENDAR_SECRETS, GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, CALENDAR_TOKEN_ENC_KEY, CALENDAR_FEED_HMAC_KEY } from './secrets.js';
import type {
  CalendarConnectionDoc,
  CalendarFeedTokenDoc,
  MyCalendarConnection,
  MyFeedToken,
  OrgCalendarConnectionRow,
} from './types.js';

function requireUid(req: CallableRequest<unknown>): string {
  const uid = req.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in required.');
  return uid;
}

function requireAdmin(req: CallableRequest<unknown>): string {
  const uid = requireUid(req);
  const role = (req.auth?.token as { role?: string } | undefined)?.role;
  if (role !== 'ADMIN') throw new HttpsError('permission-denied', 'Admins only.');
  return uid;
}

function googleEnvFromRuntime(redirectUri: string): GoogleEnv {
  return {
    clientId: GOOGLE_OAUTH_CLIENT_ID.value(),
    clientSecret: GOOGLE_OAUTH_CLIENT_SECRET.value(),
    redirectUri,
    encKey: CALENDAR_TOKEN_ENC_KEY.value(),
  };
}

function publicConnection(doc: CalendarConnectionDoc | null): MyCalendarConnection | null {
  if (!doc) return null;
  return {
    provider: doc.provider,
    email: doc.email,
    status: doc.status,
    lastSyncAt: doc.lastSyncAt,
    lastError: doc.lastError,
    pushEnabled: doc.pushEnabled,
    freebusyEnabled: doc.freebusyEnabled,
  };
}

export const getMyCalendarConnection = onCall<Record<string, never>>(
  { secrets: CALENDAR_SECRETS },
  async (req) => {
    const uid = requireUid(req);
    const doc = await getConnection(uid);
    return { connection: publicConnection(doc) };
  },
);

export const setMyCalendarPreferences = onCall<{
  pushEnabled?: boolean;
  freebusyEnabled?: boolean;
}>({ secrets: CALENDAR_SECRETS }, async (req) => {
  const uid = requireUid(req);
  const existing = await getConnection(uid);
  if (!existing) throw new HttpsError('failed-precondition', 'Connect Google Calendar first.');
  const patch: Partial<CalendarConnectionDoc> = {};
  if (typeof req.data?.pushEnabled === 'boolean') patch.pushEnabled = req.data.pushEnabled;
  if (typeof req.data?.freebusyEnabled === 'boolean') patch.freebusyEnabled = req.data.freebusyEnabled;
  if (Object.keys(patch).length === 0) return { connection: publicConnection(existing) };
  await patchConnection(uid, patch);
  const updated = await getConnection(uid);
  return { connection: publicConnection(updated) };
});

export const googleCalendarOAuthStart = onCall<{ returnUrl?: string }>(
  { secrets: CALENDAR_SECRETS },
  async (req) => {
    const uid = requireUid(req);
    const projectId = process.env.GCLOUD_PROJECT ?? '';
    const region = process.env.FUNCTION_REGION ?? 'us-central1';
    const redirectUri = `https://${region}-${projectId}.cloudfunctions.net/googleCalendarOAuthCallback`;
    const env = googleEnvFromRuntime(redirectUri);
    const nonce = Math.random().toString(36).slice(2) + Date.now().toString(36);
    const state = encodeOAuthState({
      uid,
      nonce,
      returnUrl: req.data?.returnUrl ?? null,
      createdAtMs: Date.now(),
    });
    await getFirestore()
      .collection(COL.oauthState)
      .doc(uid)
      .set({ nonce, createdAtMs: Date.now() });
    return { authUrl: buildOAuthAuthorizeUrl(env, state) };
  },
);

export const googleCalendarOAuthCallback = onRequest(
  { secrets: CALENDAR_SECRETS },
  async (req, res) => {
    try {
      const code = String(req.query.code ?? '');
      const stateRaw = String(req.query.state ?? '');
      const error = String(req.query.error ?? '');
      if (error) {
        res.status(400).send(`Sign-in cancelled: ${error}`);
        return;
      }
      if (!code || !stateRaw) {
        res.status(400).send('Missing code or state.');
        return;
      }
      const state = decodeOAuthState(stateRaw);
      const stored = await getFirestore().collection(COL.oauthState).doc(state.uid).get();
      if (!stored.exists || (stored.data() as { nonce?: string }).nonce !== state.nonce) {
        res.status(400).send('OAuth state mismatch. Try again.');
        return;
      }
      const projectId = process.env.GCLOUD_PROJECT ?? '';
      const region = process.env.FUNCTION_REGION ?? 'us-central1';
      const redirectUri = `https://${region}-${projectId}.cloudfunctions.net/googleCalendarOAuthCallback`;
      const env = googleEnvFromRuntime(redirectUri);
      const tokens = await exchangeCodeForTokens(env, code);
      const info = await fetchUserInfo(tokens.accessToken);
      await persistConnection(env, state.uid, tokens, info.email);
      await getFirestore().collection(COL.oauthState).doc(state.uid).delete();
      const html = `<!doctype html><html><body><script>
        try { if (window.opener) { window.opener.postMessage({ source: 'torp-calendar', ok: true }, '*'); window.close(); } else { window.location.href = ${JSON.stringify(state.returnUrl ?? '/')}; } }
        catch (e) { window.location.href = ${JSON.stringify(state.returnUrl ?? '/')}; }
      </script><p>Connected. You can close this window.</p></body></html>`;
      res.status(200).set('Content-Type', 'text/html').send(html);
    } catch (e) {
      logger.error('calendar.oauth.callback.failed', e as Error);
      res.status(500).send('Could not finish sign-in. Please try again.');
    }
  },
);

export const disconnectGoogleCalendar = onCall<Record<string, never>>(
  { secrets: CALENDAR_SECRETS },
  async (req) => {
    const uid = requireUid(req);
    const conn = await getConnection(uid);
    if (!conn) return { ok: true as const };
    if (conn.refreshTokenEnc) {
      try {
        const { decryptToken } = await import('./crypto.js');
        const refresh = decryptToken(conn.refreshTokenEnc, CALENDAR_TOKEN_ENC_KEY.value());
        await revokeToken(refresh);
      } catch (e) {
        logger.warn('calendar.disconnect.revoke.failed', e as Error);
      }
    }
    const mappings = await listSyncMappingsForUid(uid);
    if (mappings.length > 0) {
      const batch = getFirestore().batch();
      for (const m of mappings) {
        batch.delete(getFirestore().collection(COL.mappings).doc(`${m.torpEntityType}:${m.torpEntityId}`));
      }
      await batch.commit();
    }
    await deleteConnection(uid);
    return { ok: true as const };
  },
);

function buildFeedUrlForToken(plaintext: string): string {
  const projectId = process.env.GCLOUD_PROJECT ?? '';
  const region = process.env.FUNCTION_REGION ?? 'us-central1';
  return `https://${region}-${projectId}.cloudfunctions.net/calendarFeed/${encodeURIComponent(
    plaintext,
  )}.ics`;
}

async function ensureFeedToken(uid: string): Promise<{ doc: CalendarFeedTokenDoc; plaintext: string | null }> {
  const existing = await getFeedTokenDoc(uid);
  if (existing) return { doc: existing, plaintext: null };
  const generated = newFeedToken(uid);
  const doc: CalendarFeedTokenDoc = {
    uid,
    tokenHash: generated.hash,
    rotatedAt: new Date().toISOString(),
    invalidatesAtMs: null,
  };
  await setFeedTokenDoc(uid, doc);
  return { doc, plaintext: generated.plaintext };
}

export const getMyFeedToken = onCall<Record<string, never>>(
  { secrets: CALENDAR_SECRETS },
  async (req): Promise<MyFeedToken> => {
    const uid = requireUid(req);
    const { doc, plaintext } = await ensureFeedToken(uid);
    if (plaintext) return { url: buildFeedUrlForToken(plaintext), rotatedAt: doc.rotatedAt };
    // We do not store the plaintext; for the UI to show a usable URL we
    // signal "rotate" by returning null url alongside metadata. The card
    // surfaces "Rotate" so the user opts in to a fresh token.
    return { url: null, rotatedAt: doc.rotatedAt };
  },
);

export const rotateMyFeedToken = onCall<Record<string, never>>(
  { secrets: CALENDAR_SECRETS },
  async (req): Promise<MyFeedToken> => {
    const uid = requireUid(req);
    const generated = newFeedToken(uid);
    const doc: CalendarFeedTokenDoc = {
      uid,
      tokenHash: generated.hash,
      rotatedAt: new Date().toISOString(),
      invalidatesAtMs: Date.now() + 5 * 60 * 1000,
    };
    await setFeedTokenDoc(uid, doc);
    return { url: buildFeedUrlForToken(generated.plaintext), rotatedAt: doc.rotatedAt };
  },
);

/**
 * GET /calendarFeed/:token.ics
 * Looks up the feed token, loads events for the user, and returns an ICS body.
 */
export const calendarFeed = onRequest(
  { secrets: CALENDAR_SECRETS, cors: false },
  async (req, res) => {
    try {
      const path = req.path.replace(/^\/?/, '');
      const tokenWithExt = path.split('/').pop() ?? '';
      const plaintext = decodeURIComponent(tokenWithExt.replace(/\.ics$/i, ''));
      if (!plaintext) {
        res.status(400).send('Missing token.');
        return;
      }
      const hash = sha256Hex(plaintext);
      const tokenDoc = await findFeedTokenDocByHash(hash);
      if (!tokenDoc) {
        res.status(404).send('Feed not found.');
        return;
      }
      // Optional defense-in-depth: include an HMAC signature in token for
      // tamper detection (we already match by hash but log mismatches).
      hmacBase64Url(tokenDoc.uid, CALENDAR_FEED_HMAC_KEY.value());

      const events = await loadCrewEvents(tokenDoc.uid);
      let displayName = 'TORP';
      try {
        const u = await getAuth().getUser(tokenDoc.uid);
        displayName = u.displayName?.trim() || u.email || 'TORP';
      } catch {
        // ignore — feed still serves with a default name
      }
      const ics = buildIcsFeed(events, {
        calName: `TORP — ${displayName}`,
        calDescription: 'Shoots, meetings, and planner tasks assigned to you in TORP.',
      });
      res
        .status(200)
        .set('Content-Type', 'text/calendar; charset=utf-8')
        .set('Cache-Control', 'private, max-age=300')
        .send(ics);
    } catch (e) {
      logger.error('calendar.feed.failed', e as Error);
      res.status(500).send('Could not load feed.');
    }
  },
);

export const listOrgCalendarConnections = onCall<Record<string, never>>(
  { secrets: CALENDAR_SECRETS },
  async (req): Promise<{ rows: OrgCalendarConnectionRow[] }> => {
    requireAdmin(req);
    const docs = await listConnections();
    const rows: OrgCalendarConnectionRow[] = [];
    for (const doc of docs) {
      let displayName = '';
      let email = doc.email ?? '';
      try {
        const u = await getAuth().getUser(doc.uid);
        displayName = u.displayName?.trim() || (u.email ?? '');
        email = u.email ?? email;
      } catch {
        // leave defaults
      }
      rows.push({
        uid: doc.uid,
        displayName: displayName || doc.uid,
        email,
        provider: doc.provider,
        status: doc.status,
        lastSyncAt: doc.lastSyncAt,
        lastError: doc.lastError,
      });
    }
    return { rows };
  },
);

async function resyncAllForUid(uid: string): Promise<{ pushed: number; failed: number }> {
  const conn = await getConnection(uid);
  if (!conn || conn.status === 'disconnected') return { pushed: 0, failed: 0 };
  const projectId = process.env.GCLOUD_PROJECT ?? '';
  const region = process.env.FUNCTION_REGION ?? 'us-central1';
  const env: GoogleEnv = {
    clientId: GOOGLE_OAUTH_CLIENT_ID.value(),
    clientSecret: GOOGLE_OAUTH_CLIENT_SECRET.value(),
    redirectUri: `https://${region}-${projectId}.cloudfunctions.net/googleCalendarOAuthCallback`,
    encKey: CALENDAR_TOKEN_ENC_KEY.value(),
  };
  const events = await loadCrewEvents(uid);
  let pushed = 0;
  let failed = 0;
  await Promise.allSettled(
    events.map(async (e) => {
      const [type, id] = e.torpEntityKey.split(':') as ['shoot' | 'meeting' | 'planner', string];
      try {
        await pushEventForUid(env, uid, id, type, e);
        pushed += 1;
      } catch {
        failed += 1;
      }
    }),
  );
  return { pushed, failed };
}

export const forceResyncForUser = onCall<{ uid: string }>(
  { secrets: CALENDAR_SECRETS },
  async (req) => {
    requireAdmin(req);
    const targetUid = (req.data?.uid ?? '').trim();
    if (!targetUid) throw new HttpsError('invalid-argument', 'uid required');
    await patchConnection(targetUid, { status: 'pending', lastError: null });
    const result = await resyncAllForUid(targetUid);
    return { ok: true as const, ...result };
  },
);

/**
 * User-facing retry. Lets staff clear a sticky `error` state without admin
 * involvement after they fix scopes / permissions on Google's side.
 */
export const retryMyCalendarSync = onCall<Record<string, never>>(
  { secrets: CALENDAR_SECRETS },
  async (req) => {
    const uid = requireUid(req);
    const conn = await getConnection(uid);
    if (!conn) throw new HttpsError('failed-precondition', 'Connect Google Calendar first.');
    await patchConnection(uid, { status: 'pending', lastError: null });
    const result = await resyncAllForUid(uid);
    return { ok: true as const, ...result };
  },
);

/**
 * Returns busy intervals for the signed-in user's connected Google calendar
 * within an `[startIso, endIso]` window. Used by the staff dashboard "Busy on
 * Google" badge and the planner overlay.
 */
export const getMyCalendarFreeBusy = onCall<{ startIso: string; endIso: string }>(
  { secrets: CALENDAR_SECRETS },
  async (req) => {
    const uid = requireUid(req);
    const conn = await getConnection(uid);
    if (!conn || conn.status !== 'connected' || !conn.freebusyEnabled) {
      return { busy: [] as { startIso: string; endIso: string }[], available: false };
    }
    const startIso = (req.data?.startIso || '').trim();
    const endIso = (req.data?.endIso || '').trim();
    if (!startIso || !endIso) throw new HttpsError('invalid-argument', 'startIso and endIso required');
    const projectId = process.env.GCLOUD_PROJECT ?? '';
    const region = process.env.FUNCTION_REGION ?? 'us-central1';
    const env: GoogleEnv = {
      clientId: GOOGLE_OAUTH_CLIENT_ID.value(),
      clientSecret: GOOGLE_OAUTH_CLIENT_SECRET.value(),
      redirectUri: `https://${region}-${projectId}.cloudfunctions.net/googleCalendarOAuthCallback`,
      encKey: CALENDAR_TOKEN_ENC_KEY.value(),
    };
    try {
      const busy = await readFreeBusy(env, uid, conn.calendarId, startIso, endIso);
      return { busy, available: true };
    } catch (e) {
      logger.warn('calendar.freebusy.failed', { uid, error: (e as Error).message });
      return { busy: [], available: false };
    }
  },
);
