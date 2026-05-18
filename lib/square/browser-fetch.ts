import type { User } from 'firebase/auth';
import { getFirebaseAuthInstance, isFirebaseConfigured } from '../firebase';

const WAIT_FOR_USER_MS = 3000;
const POLL_MS = 50;

export type SquareApiErrorBody = {
  error?: string;
  reason?: string;
  role?: string | null;
};

/** User-facing message for Square API auth / config errors. */
export function friendlySquareApiError(status: number, body: SquareApiErrorBody): string {
  const code = typeof body.error === 'string' ? body.error : '';
  const reason = typeof body.reason === 'string' ? body.reason : '';

  if (code === 'missing_bearer') {
    return 'Sign in required to connect Square.';
  }
  if (code === 'server_auth_misconfigured' || reason === 'admin-credential-insufficient') {
    return 'TORP cannot verify sign-in on the server. Ops must grant Firebase Auth admin to the Cloud Run service account.';
  }
  if (reason === 'id-token-revoked') {
    return 'Session was revoked — sign out of all TORP tabs, sign in again, then refresh.';
  }
  if (reason === 'id-token-expired') {
    return 'Session expired — refresh the page or sign in again.';
  }
  if (reason === 'token-audience-mismatch') {
    return 'Sign-in project mismatch. Ops should confirm VITE_FIREBASE_PROJECT_ID matches torp-hub.';
  }
  if (code === 'invalid_token' || code === 'Unauthorized') {
    return 'Sign out of all TORP tabs, sign in again, then refresh. If this continues after re-seeding claims, contact ops.';
  }
  if (code === 'forbidden_not_admin') {
    const roleNote =
      typeof body.role === 'string' && body.role
        ? ` (signed in as ${body.role})`
        : '';
    return `Square billing requires an admin account${roleNote}.`;
  }
  if (code) return code;
  return `Request failed (HTTP ${status})`;
}

/** Wait briefly for Firebase auth to attach currentUser after sign-in. */
export async function waitForFirebaseUser(): Promise<User | null> {
  const auth = getFirebaseAuthInstance();
  if (auth.currentUser) return auth.currentUser;
  const started = Date.now();
  while (Date.now() - started < WAIT_FOR_USER_MS) {
    await new Promise((r) => setTimeout(r, POLL_MS));
    if (auth.currentUser) return auth.currentUser;
  }
  return auth.currentUser;
}

async function fetchWithBearer(
  path: string,
  init: RequestInit | undefined,
  user: User,
  forceRefresh: boolean,
): Promise<Response> {
  const token = await user.getIdToken(forceRefresh);
  const headers = new Headers(init?.headers);
  headers.set('Authorization', `Bearer ${token}`);
  return fetch(path, { ...init, headers });
}

async function parseErrorBody(res: Response): Promise<SquareApiErrorBody> {
  try {
    const text = await res.clone().text();
    return text ? (JSON.parse(text) as SquareApiErrorBody) : {};
  } catch {
    return {};
  }
}

export async function squareApiFetch(path: string, init?: RequestInit): Promise<Response> {
  if (!isFirebaseConfigured()) {
    return new Response(JSON.stringify({ error: 'Firebase not configured' }), { status: 503 });
  }
  const user = await waitForFirebaseUser();
  if (!user) {
    return new Response(JSON.stringify({ error: 'missing_bearer' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let res = await fetchWithBearer(path, init, user, false);
  if (res.status === 401) {
    const body = await parseErrorBody(res);
    if (body.error === 'invalid_token') {
      res = await fetchWithBearer(path, init, user, true);
    }
  }
  return res;
}

function apiErrorFromHtml(status: number): string {
  if (import.meta.env.DEV) {
    return (
      `Square API returned HTML (HTTP ${status}). ` +
      'With npm run dev, /api is proxied to Cloud Run — restart the dev server after pulling. ' +
      'Or run npm run build && npm start for a local API shell.'
    );
  }
  return `Square API returned HTML instead of JSON (HTTP ${status}). Check Cloud Run deploy and /api/square routes.`;
}

/** Parse JSON from a Square API response; avoids opaque "<!DOCTYPE" parse errors. */
export async function squareApiJson<T>(
  path: string,
  init?: RequestInit,
): Promise<{ ok: true; data: T; status: number } | { ok: false; error: string; status: number }> {
  const res = await squareApiFetch(path, init);
  const status = res.status;
  const text = await res.text();
  const trimmed = text.trimStart();
  if (trimmed.startsWith('<')) {
    return { ok: false, error: apiErrorFromHtml(status), status };
  }
  let data: T;
  try {
    data = (trimmed ? JSON.parse(text) : {}) as T;
  } catch {
    return { ok: false, error: `Invalid JSON from Square API (HTTP ${status})`, status };
  }
  if (!res.ok) {
    const body =
      data && typeof data === 'object'
        ? (data as SquareApiErrorBody)
        : ({} as SquareApiErrorBody);
    return { ok: false, error: friendlySquareApiError(status, body), status };
  }
  return { ok: true, data, status };
}
