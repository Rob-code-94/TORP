import type { StorageOpsEvent } from '../types';
import { hqUpsertStorageOpsEvent } from './hqFirestoreService';
import { getStorageOpsSync } from './hqSyncDirectory';
import { getHqTenantForWrites } from './hqWriteContext';

export function recordStorageOpsEvent(event: Omit<StorageOpsEvent, 'id' | 'timestamp'>): StorageOpsEvent {
  const created: StorageOpsEvent = {
    id: `ops-${Date.now()}`,
    timestamp: new Date().toISOString(),
    ...event,
  };
  void hqUpsertStorageOpsEvent(getHqTenantForWrites(), created).catch((err) =>
    console.error('[hq] recordStorageOpsEvent', err),
  );
  return created;
}

export function retryStorageOperation(eventId: string, actorName: string): { ok: boolean; error?: string } {
  const source = getStorageOpsSync().find((event) => event.id === eventId);
  if (!source) return { ok: false, error: 'Storage event not found.' };
  recordStorageOpsEvent({
    eventType: 'retry',
    assetId: source.assetId,
    actorName,
    tenantId: source.tenantId,
    details: `Retry triggered for ${source.eventType}`,
  });
  return { ok: true };
}

export function revokeStorageOpsLink(eventId: string, actorName: string): { ok: boolean; error?: string } {
  const source = getStorageOpsSync().find((event) => event.id === eventId);
  if (!source) return { ok: false, error: 'Storage event not found.' };
  recordStorageOpsEvent({
    eventType: 'link_revoked',
    assetId: source.assetId,
    actorName,
    tenantId: source.tenantId,
    details: `Revoked from ops console for source ${eventId}`,
  });
  return { ok: true };
}
