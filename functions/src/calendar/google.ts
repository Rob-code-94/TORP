import { logger } from 'firebase-functions/v2';
import {
  decryptToken,
  encryptToken,
} from './crypto.js';
import {
  getConnection,
  patchConnection,
  setConnection,
} from './firestore.js';
import type {
  CalendarConnectionDoc,
  CalendarOAuthState,
  SyncEventPayload,
  SyncResult,
} from './types.js';

/**
 * Lightweight Google Calendar v3 client built on top of `fetch`.
 * Avoids pulling the full `googleapis` SDK so cold starts stay fast.
 */

const GOOGLE_AUTH_BASE = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GCAL_API_BASE = 'https://www.googleapis.com/calendar/v3';

export const REQUIRED_SCOPES = [
  'openid',
  'email',
  'https://www.googleapis.com/auth/calendar.events.owned',
  'https://www.googleapis.com/auth/calendar.freebusy',
];

export interface GoogleEnv {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  encKey: string;
}

export function buildOAuthAuthorizeUrl(env: GoogleEnv, state: string): string {
  const params = new URLSearchParams({
    client_id: env.clientId,
    redirect_uri: env.redirectUri,
    response_type: 'code',
    access_type: 'offline',
    include_granted_scopes: 'true',
    prompt: 'consent',
    scope: REQUIRED_SCOPES.join(' '),
    state,
  });
  return `${GOOGLE_AUTH_BASE}?${params.toString()}`;
}

export interface GoogleTokenSet {
  accessToken: string;
  refreshToken?: string;
  expiresInSec: number;
  idToken?: string;
}

interface RawTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  id_token?: string;
  scope?: string;
  token_type?: string;
}

interface RawError {
  error?: string;
  error_description?: string;
}

async function postFormToGoogle<T>(url: string, params: Record<string, string>): Promise<T> {
  const body = new URLSearchParams(params);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) {
    const detail = (await res.json().catch(() => ({}))) as RawError;
    throw new Error(`google_token_${res.status}:${detail.error_description ?? detail.error ?? 'unknown'}`);
  }
  return (await res.json()) as T;
}

export async function exchangeCodeForTokens(
  env: GoogleEnv,
  code: string,
): Promise<GoogleTokenSet> {
  const data = await postFormToGoogle<RawTokenResponse>(GOOGLE_TOKEN_URL, {
    code,
    client_id: env.clientId,
    client_secret: env.clientSecret,
    redirect_uri: env.redirectUri,
    grant_type: 'authorization_code',
  });
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresInSec: data.expires_in,
    idToken: data.id_token,
  };
}

export async function refreshAccessToken(
  env: GoogleEnv,
  refreshToken: string,
): Promise<GoogleTokenSet> {
  const data = await postFormToGoogle<RawTokenResponse>(GOOGLE_TOKEN_URL, {
    client_id: env.clientId,
    client_secret: env.clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken,
    expiresInSec: data.expires_in,
  };
}

export async function revokeToken(token: string): Promise<void> {
  try {
    const params = new URLSearchParams({ token });
    await fetch(`https://oauth2.googleapis.com/revoke?${params.toString()}`, {
      method: 'POST',
    });
  } catch (e) {
    logger.warn('google.revoke.failed', e as Error);
  }
}

export interface GoogleUserInfo {
  email: string | null;
}

export async function fetchUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const res = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return { email: null };
  const data = (await res.json()) as { email?: string };
  return { email: data.email ?? null };
}

/**
 * Returns a valid access token, refreshing if necessary. Side-effects: writes
 * the refreshed token back into Firestore so the next caller is fast.
 */
export async function getValidAccessToken(
  env: GoogleEnv,
  uid: string,
): Promise<string> {
  const conn = await getConnection(uid);
  if (!conn || !conn.accessTokenEnc || !conn.refreshTokenEnc) {
    throw new Error('not_connected');
  }
  const skewMs = 60 * 1000;
  if (
    conn.accessTokenExpiresAtMs &&
    conn.accessTokenExpiresAtMs > Date.now() + skewMs
  ) {
    return decryptToken(conn.accessTokenEnc, env.encKey);
  }
  const refreshToken = decryptToken(conn.refreshTokenEnc, env.encKey);
  const refreshed = await refreshAccessToken(env, refreshToken);
  await patchConnection(uid, {
    accessTokenEnc: encryptToken(refreshed.accessToken, env.encKey),
    accessTokenExpiresAtMs: Date.now() + refreshed.expiresInSec * 1000,
    refreshTokenEnc: encryptToken(refreshed.refreshToken ?? refreshToken, env.encKey),
  });
  return refreshed.accessToken;
}

/** Persist a freshly issued token set as a new connection (or upsert). */
export async function persistConnection(
  env: GoogleEnv,
  uid: string,
  tokens: GoogleTokenSet,
  email: string | null,
): Promise<CalendarConnectionDoc> {
  const existing = await getConnection(uid);
  const nowIso = new Date().toISOString();
  const doc: CalendarConnectionDoc = {
    uid,
    provider: 'google',
    email: email ?? existing?.email ?? null,
    status: 'connected',
    accessTokenEnc: encryptToken(tokens.accessToken, env.encKey),
    refreshTokenEnc: tokens.refreshToken
      ? encryptToken(tokens.refreshToken, env.encKey)
      : (existing?.refreshTokenEnc ?? null),
    accessTokenExpiresAtMs: Date.now() + tokens.expiresInSec * 1000,
    lastSyncAt: existing?.lastSyncAt ?? null,
    lastError: null,
    calendarId: existing?.calendarId ?? 'primary',
    pushEnabled: existing?.pushEnabled ?? true,
    freebusyEnabled: existing?.freebusyEnabled ?? true,
    watchChannelId: existing?.watchChannelId ?? null,
    watchExpiresAtMs: existing?.watchExpiresAtMs ?? null,
    nextSyncToken: existing?.nextSyncToken ?? null,
    createdAt: existing?.createdAt ?? nowIso,
    updatedAt: nowIso,
  };
  await setConnection(uid, doc);
  return doc;
}

/** Encode an OAuth state value (signed by Firestore + nonce). */
export function encodeOAuthState(state: CalendarOAuthState): string {
  return Buffer.from(JSON.stringify(state)).toString('base64url');
}

export function decodeOAuthState(encoded: string): CalendarOAuthState {
  const json = Buffer.from(encoded, 'base64url').toString('utf8');
  return JSON.parse(json) as CalendarOAuthState;
}

interface GcalEventResource {
  id?: string;
  summary?: string;
  description?: string;
  location?: string;
  start: { dateTime?: string; date?: string; timeZone?: string };
  end: { dateTime?: string; date?: string; timeZone?: string };
  attendees?: { email: string }[];
  status?: 'confirmed' | 'tentative' | 'cancelled';
  source?: { title: string; url: string };
  extendedProperties?: { private?: Record<string, string> };
}

function payloadToResource(payload: SyncEventPayload): GcalEventResource {
  const ext = { torpEntityKey: payload.torpEntityKey };
  if (payload.allDay) {
    return {
      summary: payload.title,
      description: payload.description,
      location: payload.location,
      start: { date: payload.startIso.slice(0, 10) },
      end: { date: payload.endIso.slice(0, 10) },
      attendees: payload.attendees?.map((email) => ({ email })),
      status: 'confirmed',
      extendedProperties: { private: ext },
    };
  }
  return {
    summary: payload.title,
    description: payload.description,
    location: payload.location,
    start: { dateTime: payload.startIso },
    end: { dateTime: payload.endIso },
    attendees: payload.attendees?.map((email) => ({ email })),
    status: 'confirmed',
    extendedProperties: { private: ext },
  };
}

/** Insert or update an event for a given user. Used by the push sync helper. */
export async function upsertEventForUser(
  env: GoogleEnv,
  uid: string,
  calendarId: string,
  payload: SyncEventPayload,
  externalEventId?: string,
): Promise<SyncResult> {
  let token: string;
  try {
    token = await getValidAccessToken(env, uid);
  } catch (e) {
    return { ok: false, error: (e as Error).message, transient: false };
  }
  const resource = payloadToResource(payload);
  const url = externalEventId
    ? `${GCAL_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(externalEventId)}`
    : `${GCAL_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events`;
  const method = externalEventId ? 'PATCH' : 'POST';
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(resource),
  });
  if (!res.ok) {
    const transient = res.status >= 500 || res.status === 429;
    const detail = await res.text();
    return { ok: false, error: `google_events_${res.status}:${detail}`, transient };
  }
  const created = (await res.json()) as GcalEventResource;
  if (!created.id) return { ok: false, error: 'google_no_event_id', transient: true };
  return { ok: true, externalEventId: created.id, calendarId };
}

export async function deleteEventForUser(
  env: GoogleEnv,
  uid: string,
  calendarId: string,
  externalEventId: string,
): Promise<SyncResult> {
  let token: string;
  try {
    token = await getValidAccessToken(env, uid);
  } catch (e) {
    return { ok: false, error: (e as Error).message, transient: false };
  }
  const res = await fetch(
    `${GCAL_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(externalEventId)}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  if (res.status === 410 || res.status === 404 || res.ok) {
    return { ok: true, externalEventId, calendarId };
  }
  const transient = res.status >= 500 || res.status === 429;
  const detail = await res.text();
  return { ok: false, error: `google_delete_${res.status}:${detail}`, transient };
}

export interface FreeBusyInterval {
  startIso: string;
  endIso: string;
}

export async function readFreeBusy(
  env: GoogleEnv,
  uid: string,
  calendarId: string,
  windowStartIso: string,
  windowEndIso: string,
): Promise<FreeBusyInterval[]> {
  const token = await getValidAccessToken(env, uid);
  const res = await fetch(`${GCAL_API_BASE}/freeBusy`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      timeMin: windowStartIso,
      timeMax: windowEndIso,
      items: [{ id: calendarId }],
    }),
  });
  if (!res.ok) {
    throw new Error(`google_freebusy_${res.status}`);
  }
  const data = (await res.json()) as {
    calendars?: Record<string, { busy?: { start: string; end: string }[] }>;
  };
  const list = data.calendars?.[calendarId]?.busy ?? [];
  return list.map((b) => ({ startIso: b.start, endIso: b.end }));
}
