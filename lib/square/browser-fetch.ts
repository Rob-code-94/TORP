import { getFirebaseAuthInstance, isFirebaseConfigured } from '../firebase';

type SquareApiErrorBody = {
  error?: string;
  role?: string | null;
};

/** User-facing message for Square API auth / config errors. */
export function friendlySquareApiError(status: number, body: SquareApiErrorBody): string {
  const code = typeof body.error === 'string' ? body.error : '';
  if (code === 'missing_bearer') {
    return 'Sign in required to connect Square.';
  }
  if (code === 'invalid_token' || code === 'Unauthorized') {
    return 'Session expired — sign out and sign in again, then refresh.';
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

export async function squareApiFetch(path: string, init?: RequestInit): Promise<Response> {
  if (!isFirebaseConfigured()) {
    return new Response(JSON.stringify({ error: 'Firebase not configured' }), { status: 503 });
  }
  const auth = getFirebaseAuthInstance();
  const user = auth.currentUser;
  const token = user ? await user.getIdToken(true) : null;
  const headers = new Headers(init?.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(path, { ...init, headers });
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
