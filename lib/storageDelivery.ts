import { httpsCallable } from 'firebase/functions';
import { getFirebaseFunctionsInstance } from './firebase';

export interface CreateStorageDeliveryLinkInput {
  path: string;
  assetId?: string;
  versionId?: string;
  expiresInMinutes?: number;
}

export interface CreateStorageDeliveryLinkResult {
  id: string;
  url: string;
  expiresAt: string;
}

export async function createStorageDeliveryLink(
  input: CreateStorageDeliveryLinkInput
): Promise<CreateStorageDeliveryLinkResult> {
  const fn = httpsCallable<CreateStorageDeliveryLinkInput, CreateStorageDeliveryLinkResult>(
    getFirebaseFunctionsInstance(),
    'createStorageDeliveryLink'
  );
  const result = await fn(input);
  return result.data;
}

export async function revokeStorageDeliveryLink(linkId: string): Promise<{ ok: true; alreadyRevoked: boolean }> {
  const fn = httpsCallable<{ linkId: string }, { ok: true; alreadyRevoked: boolean }>(
    getFirebaseFunctionsInstance(),
    'revokeStorageDeliveryLink'
  );
  const result = await fn({ linkId });
  return result.data;
}
