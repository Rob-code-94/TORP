import { isFirebaseConfigured } from '../firebase';
import { squareApiJson } from './browser-fetch';

type EnsureCustomerResponse = {
  status?: string;
  squareCustomerId?: string;
  message?: string;
};

/** Link or create a Square directory customer for a TORP client (admin API). Non-fatal on failure. */
export async function autoEnsureSquareCustomer(clientId: string): Promise<void> {
  await ensureSquareCustomerForClient(clientId);
}

export async function ensureSquareCustomerForClient(
  clientId: string,
): Promise<{ ok: boolean; status?: string; error?: string }> {
  if (!isFirebaseConfigured() || !clientId.trim()) {
    return { ok: false, error: 'Firebase not configured' };
  }
  try {
    const result = await squareApiJson<EnsureCustomerResponse>('/api/square/ensure-customer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId: clientId.trim() }),
    });
    if (!result.ok) {
      return { ok: false, error: result.error };
    }
    return { ok: true, status: result.data?.status };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'ensure-customer failed' };
  }
}
