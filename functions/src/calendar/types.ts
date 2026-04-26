/**
 * Shared types for TORP calendar integration. Keep these in sync (subset) with
 * `lib/calendarIntegrations.ts` on the client, but DO NOT import directly across
 * packages — Firestore documents are versioned and must round-trip safely.
 */

export type CalendarConnectionStatus = 'connected' | 'disconnected' | 'error' | 'pending';
export type CalendarProvider = 'google';

/**
 * `calendarConnections/{uid}` — one document per user. Holds OAuth tokens (in
 * encrypted blob fields), preferences, and last-sync state. Never read or
 * exposed to other users.
 */
export interface CalendarConnectionDoc {
  uid: string;
  provider: CalendarProvider;
  email: string | null;
  status: CalendarConnectionStatus;
  /** Encrypted access token blob (KMS or `crypto.subtle`). */
  accessTokenEnc: string | null;
  /** Encrypted refresh token blob. */
  refreshTokenEnc: string | null;
  /** Epoch ms when access token expires. */
  accessTokenExpiresAtMs: number | null;
  /** ISO 8601 timestamp of the last successful incremental sync. */
  lastSyncAt: string | null;
  /** Last user-friendly error message; cleared on next successful sync. */
  lastError: string | null;
  /** Default calendar id (usually `primary`). */
  calendarId: string;
  /** User preference: push events to Google? */
  pushEnabled: boolean;
  /** User preference: read free/busy from Google? */
  freebusyEnabled: boolean;
  /** Watch channel id for events.watch (Phase 3). */
  watchChannelId: string | null;
  /** Watch resource expiration (epoch ms). */
  watchExpiresAtMs: number | null;
  /** Latest `nextSyncToken` from events.list / events.watch. */
  nextSyncToken: string | null;
  /** ISO 8601 timestamp of doc creation. */
  createdAt: string;
  /** ISO 8601 timestamp of last write. */
  updatedAt: string;
}

/**
 * `calendarSyncMappings/{torpEntityId}` — one document per pushed entity.
 * Used for idempotent upsert + delete and to recover from partial failures.
 */
export interface CalendarSyncMappingDoc {
  torpEntityId: string;
  torpEntityType: 'shoot' | 'meeting' | 'planner';
  uid: string;
  provider: CalendarProvider;
  externalEventId: string;
  calendarId: string;
  lastPushedHash: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * `calendarFeedTokens/{uid}` — one document per user holding their HMAC-signed
 * subscribe URL secret. Distinct from OAuth tokens; rotating this only
 * invalidates the public ICS feed.
 */
export interface CalendarFeedTokenDoc {
  uid: string;
  /** SHA-256 hash of the secret token (we never store the raw token). */
  tokenHash: string;
  /** ISO 8601 timestamp when this token was issued / rotated. */
  rotatedAt: string;
  /** Epoch ms after which old caches should treat this URL as invalid. */
  invalidatesAtMs: number | null;
}

export interface CalendarOAuthState {
  uid: string;
  /** Random nonce; checked in callback. */
  nonce: string;
  /** Optional URL the client wants to return to after callback. */
  returnUrl: string | null;
  createdAtMs: number;
}

/** Minimal payload shape used by sync helpers. Mirrors `CalendarEventPayload`. */
export interface SyncEventPayload {
  title: string;
  startIso: string;
  endIso: string;
  allDay: boolean;
  location?: string;
  description?: string;
  attendees?: string[];
  /** Stable id used for idempotency; usually `${torpEntityType}:${torpEntityId}`. */
  torpEntityKey: string;
}

export type SyncResult =
  | { ok: true; externalEventId: string; calendarId: string }
  | { ok: false; error: string; transient: boolean };

/** Public shape returned by `getMyCalendarConnection` / `setMyCalendarPreferences`. */
export interface MyCalendarConnection {
  provider: CalendarProvider;
  email: string | null;
  status: CalendarConnectionStatus;
  lastSyncAt: string | null;
  lastError: string | null;
  pushEnabled: boolean;
  freebusyEnabled: boolean;
}

/** Public shape returned by `getMyFeedToken` / `rotateMyFeedToken`. */
export interface MyFeedToken {
  /** Plaintext subscribe URL. Only returned when the token is rotated/issued. */
  url: string | null;
  rotatedAt: string | null;
}

/** Row used by the admin org connections panel. */
export interface OrgCalendarConnectionRow {
  uid: string;
  displayName: string;
  email: string;
  provider: CalendarProvider;
  status: CalendarConnectionStatus;
  lastSyncAt: string | null;
  lastError: string | null;
}
