import type {
  BlockerItem,
  ChangeOrder,
  DependencyItem,
  ProjectDeliverable,
  RiskItem,
} from '../types';
import {
  hqDeleteDeliverable,
  hqUpsertBlocker,
  hqUpsertChangeOrder,
  hqUpsertDeliverable,
  hqUpsertDependency,
  hqUpsertRisk,
} from './hqFirestoreService';
import { recordHqActivity } from './hqProjectOps';
import {
  getHqBlockerDirectory,
  getHqChangeOrderDirectory,
  getHqDeliverableDirectory,
  getHqDependencyDirectory,
  getHqRiskDirectory,
} from './hqSyncDirectory';
import { getHqTenantForWrites } from './hqWriteContext';

export function createDeliverable(input: Omit<ProjectDeliverable, 'id'>, actorName: string): ProjectDeliverable {
  if (!input.label.trim()) throw new Error('Deliverable label is required.');
  const item: ProjectDeliverable = {
    ...input,
    id: `d-${Date.now()}`,
    step: input.step ?? 'post_production',
    acceptanceCriteria: input.acceptanceCriteria ?? '',
    notes: input.notes ?? '',
    referenceLink: input.referenceLink?.trim() || undefined,
  };
  void hqUpsertDeliverable(getHqTenantForWrites(), item).catch((err) => console.error('[hq] createDeliverable', err));
  recordHqActivity({
    projectId: item.projectId,
    entityType: 'project',
    entityLabel: item.label,
    actorName,
    action: 'created deliverable',
  });
  return item;
}

export function updateDeliverable(id: string, patch: Partial<ProjectDeliverable>, actorName: string): { ok: boolean } {
  const base = getHqDeliverableDirectory().find((d) => d.id === id);
  if (!base) return { ok: false };
  const merged: ProjectDeliverable = {
    ...base,
    ...patch,
    step: patch.step ?? base.step ?? 'post_production',
    acceptanceCriteria: patch.acceptanceCriteria ?? base.acceptanceCriteria ?? '',
    notes: patch.notes ?? base.notes ?? '',
    referenceLink:
      patch.referenceLink !== undefined ? patch.referenceLink.trim() || undefined : base.referenceLink,
  };
  void hqUpsertDeliverable(getHqTenantForWrites(), merged).catch((err) => console.error('[hq] updateDeliverable', err));
  recordHqActivity({
    projectId: merged.projectId,
    entityType: 'project',
    entityLabel: merged.label,
    actorName,
    action: 'updated deliverable',
  });
  return { ok: true };
}

export function deleteDeliverable(id: string, actorName: string): { ok: boolean } {
  const item = getHqDeliverableDirectory().find((d) => d.id === id);
  if (!item) return { ok: false };
  void hqDeleteDeliverable(getHqTenantForWrites(), id).catch((err) => console.error('[hq] deleteDeliverable', err));
  recordHqActivity({
    projectId: item.projectId,
    entityType: 'project',
    entityLabel: item.label,
    actorName,
    action: 'deleted deliverable',
  });
  return { ok: true };
}

export function createRisk(item: Omit<RiskItem, 'id'>, actorName: string) {
  const row: RiskItem = { ...item, id: `r-${Date.now()}` };
  void hqUpsertRisk(getHqTenantForWrites(), row).catch((err) => console.error('[hq] createRisk', err));
  recordHqActivity({
    projectId: item.projectId,
    entityType: 'project',
    entityLabel: item.label,
    actorName,
    action: 'added control item',
  });
}

export function createBlocker(item: Omit<BlockerItem, 'id'>, actorName: string) {
  const row: BlockerItem = { ...item, id: `b-${Date.now()}` };
  void hqUpsertBlocker(getHqTenantForWrites(), row).catch((err) => console.error('[hq] createBlocker', err));
  recordHqActivity({
    projectId: item.projectId,
    entityType: 'project',
    entityLabel: item.label,
    actorName,
    action: 'added control item',
  });
}

export function createDependency(item: Omit<DependencyItem, 'id'>, actorName: string) {
  const row: DependencyItem = { ...item, id: `dep-${Date.now()}` };
  void hqUpsertDependency(getHqTenantForWrites(), row).catch((err) => console.error('[hq] createDependency', err));
  recordHqActivity({
    projectId: item.projectId,
    entityType: 'project',
    entityLabel: item.label,
    actorName,
    action: 'added control item',
  });
}

export function updateRisk(id: string, patch: Partial<RiskItem>, actorName: string): { ok: boolean } {
  const item = getHqRiskDirectory().find((r) => r.id === id);
  if (!item) return { ok: false };
  const merged: RiskItem = { ...item, ...patch };
  void hqUpsertRisk(getHqTenantForWrites(), merged).catch((err) => console.error('[hq] updateRisk', err));
  recordHqActivity({
    projectId: merged.projectId,
    entityType: 'project',
    entityLabel: merged.label,
    actorName,
    action: 'updated risk',
  });
  return { ok: true };
}

export function updateBlocker(id: string, patch: Partial<BlockerItem>, actorName: string): { ok: boolean } {
  const item = getHqBlockerDirectory().find((r) => r.id === id);
  if (!item) return { ok: false };
  const merged: BlockerItem = { ...item, ...patch };
  void hqUpsertBlocker(getHqTenantForWrites(), merged).catch((err) => console.error('[hq] updateBlocker', err));
  recordHqActivity({
    projectId: merged.projectId,
    entityType: 'project',
    entityLabel: merged.label,
    actorName,
    action: 'updated blocker',
  });
  return { ok: true };
}

export function updateDependency(id: string, patch: Partial<DependencyItem>, actorName: string): { ok: boolean } {
  const item = getHqDependencyDirectory().find((r) => r.id === id);
  if (!item) return { ok: false };
  const merged: DependencyItem = { ...item, ...patch };
  void hqUpsertDependency(getHqTenantForWrites(), merged).catch((err) => console.error('[hq] updateDependency', err));
  recordHqActivity({
    projectId: merged.projectId,
    entityType: 'project',
    entityLabel: merged.label,
    actorName,
    action: 'updated dependency',
  });
  return { ok: true };
}

export function requestChangeOrder(projectId: string, title: string, amount: number, actorName: string): ChangeOrder {
  if (!title.trim()) {
    throw new Error('Change order title is required.');
  }
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error('Change order amount must be a valid non-negative number.');
  }
  const item: ChangeOrder = {
    id: `co${Date.now()}`,
    projectId,
    title,
    amount,
    status: 'requested',
    requestedBy: actorName,
    requestedAt: new Date().toISOString(),
  };
  void hqUpsertChangeOrder(getHqTenantForWrites(), item).catch((err) => console.error('[hq] requestChangeOrder', err));
  recordHqActivity({
    projectId,
    entityType: 'proposal',
    entityLabel: item.id,
    actorName,
    action: `requested change order: ${title}`,
  });
  return item;
}
