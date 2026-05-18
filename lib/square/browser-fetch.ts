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
