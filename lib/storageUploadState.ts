import type { AssetLifecycleStatus } from '../types';

const ALLOWED_TRANSITIONS: Record<AssetLifecycleStatus, AssetLifecycleStatus[]> = {
  queued: ['uploading', 'failed', 'archived'],
  uploading: ['processing', 'failed', 'archived'],
  processing: ['ready', 'failed', 'archived'],
  ready: ['archived'],
  failed: ['queued', 'archived'],
  archived: [],
};

export function canTransitionAssetStatus(from: AssetLifecycleStatus, to: AssetLifecycleStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function assertAssetStatusTransition(from: AssetLifecycleStatus, to: AssetLifecycleStatus): void {
  if (!canTransitionAssetStatus(from, to)) {
    throw new Error(`Invalid asset status transition from ${from} to ${to}.`);
  }
}
