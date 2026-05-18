import { getFirebaseAuthInstance, isFirebaseConfigured } from '../firebase';

export async function squareApiFetch(path: string, init?: RequestInit): Promise<Response> {
  if (!isFirebaseConfigured()) {
    return new Response(JSON.stringify({ error: 'Firebase not configured' }), { status: 503 });
  }
  const auth = getFirebaseAuthInstance();
  const user = auth.currentUser;
  const token = user ? await user.getIdToken() : null;
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
    const err =
      data && typeof data === 'object' && 'error' in data && typeof (data as { error?: unknown }).error === 'string'
        ? (data as { error: string }).error
        : `Request failed (HTTP ${status})`;
    return { ok: false, error: err, status };
  }
  return { ok: true, data, status };
}
