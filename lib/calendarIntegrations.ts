import { httpsCallable } from 'firebase/functions';
import {
  getFirebaseFunctionsInstance,
  isFirebaseConfigured,
} from './firebase';

/**
 * Client wrapper around the calendar integration callables in
 * `functions/src/calendar/`. Every function gracefully degrades when Firebase
 * is not configured so the UI keeps rendering in mock mode.
 */

export type CalendarConnectionStatus =
  | 'connected'
  | 'disconnected'
  | 'error'
  | 'pending';

export interface MyCalendarConnection {
  provider: 'google';
  email: string | null;
  status: CalendarConnectionStatus;
  lastSyncAt: string | null;
  lastError: string | null;
  pushEnabled: boolean;
  freebusyEnabled: boolean;
}

export interface OrgCalendarConnectionRow {
  uid: string;
  displayName: string;
  email: string;
  provider: 'google';
  status: CalendarConnectionStatus;
  lastSyncAt: string | null;
  lastError: string | null;
}

export interface MyFeedToken {
  /** Full https URL Apple/iCloud/Outlook can subscribe to. */
  url: string | null;
  rotatedAt: string | null;
}

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

const NOT_CONFIGURED_RESULT: Result<never> = {
  ok: false,
  error: 'Firebase is not configured for this environment.',
};

function callable<TIn, TOut>(name: string) {
  return httpsCallable(getFirebaseFunctionsInstance(), name) as (
    data: TIn,
  ) => Promise<{ data: TOut }>;
}

function describeError(e: unknown): string {
  const err = e as { code?: string; message?: string; details?: unknown };
  if (err?.code === 'functions/permission-denied' || err?.code === 'permission-denied') {
    return 'You do not have permission to do that.';
  }
  if (err?.code === 'functions/unauthenticated') {
    return 'Sign in again to continue.';
  }
  if (err?.code === 'functions/failed-precondition') {
    return 'Connect your account again to refresh access.';
  }
  // Firebase often surfaces a bare "internal" message when a callable throws
  // (missing secrets, function not deployed, or server error). Do not show that word alone.
  if (
    err?.code === 'functions/internal' ||
    err?.code === 'internal' ||
    (err?.message && /^internal$/i.test(String(err.message).trim()))
  ) {
    return 'Calendar could not reach the server. Ask your admin to deploy Cloud Functions, set the calendar OAuth and encryption secrets, and try again.';
  }
  if (err?.code === 'functions/unavailable' || err?.code === 'functions/deadline-exceeded') {
    return 'The calendar service is temporarily unavailable. Please try again in a moment.';
  }
  if (err?.code === 'functions/resource-exhausted') {
    return 'Too many requests. Please wait a minute and try again.';
  }
  if (err?.message && !/^internal$/i.test(String(err.message).trim())) {
    return err.message;
  }
  return 'Something went wrong. Please try again.';
}

export async function getMyCalendarConnection(): Promise<Result<MyCalendarConnection | null>> {
  if (!isFirebaseConfigured()) return NOT_CONFIGURED_RESULT;
  try {
    const fn = callable<Record<string, never>, { connection: MyCalendarConnection | null }>(
      'getMyCalendarConnection',
    );
    const { data } = await fn({});
    return { ok: true, data: data.connection };
  } catch (e) {
    return { ok: false, error: describeError(e) };
  }
}

export async function startGoogleCalendarOAuth(): Promise<Result<{ authUrl: string }>> {
  if (!isFirebaseConfigured()) return NOT_CONFIGURED_RESULT;
  try {
    const fn = callable<{ returnUrl: string }, { authUrl: string }>(
      'googleCalendarOAuthStart',
    );
    const returnUrl = typeof window !== 'undefined' ? window.location.href : '';
    const { data } = await fn({ returnUrl });
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: describeError(e) };
  }
}

export async function disconnectGoogleCalendar(): Promise<Result<{ ok: true }>> {
  if (!isFirebaseConfigured()) return NOT_CONFIGURED_RESULT;
  try {
    const fn = callable<Record<string, never>, { ok: true }>('disconnectGoogleCalendar');
    const { data } = await fn({});
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: describeError(e) };
  }
}

export async function setMyCalendarPreferences(patch: {
  pushEnabled?: boolean;
  freebusyEnabled?: boolean;
}): Promise<Result<MyCalendarConnection>> {
  if (!isFirebaseConfigured()) return NOT_CONFIGURED_RESULT;
  try {
    const fn = callable<typeof patch, { connection: MyCalendarConnection }>(
      'setMyCalendarPreferences',
    );
    const { data } = await fn(patch);
    return { ok: true, data: data.connection };
  } catch (e) {
    return { ok: false, error: describeError(e) };
  }
}

export async function getMyFeedToken(): Promise<Result<MyFeedToken>> {
  if (!isFirebaseConfigured()) return NOT_CONFIGURED_RESULT;
  try {
    const fn = callable<Record<string, never>, MyFeedToken>('getMyFeedToken');
    const { data } = await fn({});
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: describeError(e) };
  }
}

export async function rotateMyFeedToken(): Promise<Result<MyFeedToken>> {
  if (!isFirebaseConfigured()) return NOT_CONFIGURED_RESULT;
  try {
    const fn = callable<Record<string, never>, MyFeedToken>('rotateMyFeedToken');
    const { data } = await fn({});
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: describeError(e) };
  }
}

export async function listOrgCalendarConnections(): Promise<Result<OrgCalendarConnectionRow[]>> {
  if (!isFirebaseConfigured()) return NOT_CONFIGURED_RESULT;
  try {
    const fn = callable<Record<string, never>, { rows: OrgCalendarConnectionRow[] }>(
      'listOrgCalendarConnections',
    );
    const { data } = await fn({});
    return { ok: true, data: data.rows };
  } catch (e) {
    return { ok: false, error: describeError(e) };
  }
}

export async function forceResyncForUser(
  uid: string,
): Promise<Result<{ ok: true; pushed: number; failed: number }>> {
  if (!isFirebaseConfigured()) return NOT_CONFIGURED_RESULT;
  try {
    const fn = callable<{ uid: string }, { ok: true; pushed: number; failed: number }>(
      'forceResyncForUser',
    );
    const { data } = await fn({ uid });
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: describeError(e) };
  }
}

export async function retryMyCalendarSync(): Promise<
  Result<{ ok: true; pushed: number; failed: number }>
> {
  if (!isFirebaseConfigured()) return NOT_CONFIGURED_RESULT;
  try {
    const fn = callable<Record<string, never>, { ok: true; pushed: number; failed: number }>(
      'retryMyCalendarSync',
    );
    const { data } = await fn({});
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: describeError(e) };
  }
}

export interface FreeBusyInterval {
  startIso: string;
  endIso: string;
}

export async function getMyCalendarFreeBusy(
  startIso: string,
  endIso: string,
): Promise<Result<{ busy: FreeBusyInterval[]; available: boolean }>> {
  if (!isFirebaseConfigured()) return NOT_CONFIGURED_RESULT;
  try {
    const fn = callable<
      { startIso: string; endIso: string },
      { busy: FreeBusyInterval[]; available: boolean }
    >('getMyCalendarFreeBusy');
    const { data } = await fn({ startIso, endIso });
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: describeError(e) };
  }
}

export function isCalendarBackendAvailable(): boolean {
  return isFirebaseConfigured();
}

/** Friendly text for "Last synced N minutes ago"-style sub-headings. */
export function formatLastUpdated(iso: string | null): string {
  if (!iso) return 'Never';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  const now = Date.now();
  const diffMs = now - date.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diffMs < minute) return 'Just now';
  if (diffMs < hour) return `${Math.round(diffMs / minute)} min ago`;
  if (diffMs < day) return `${Math.round(diffMs / hour)} h ago`;
  return date.toLocaleDateString();
}
