import type {
  AdminMeeting,
  AdminShoot,
  PlannerItem,
  PlannerTaskStatus,
  ProjectAsset,
  ProjectAssetSourceType,
} from '../types';
import { getProjectAssetStorageAdapter } from '../lib/projectAssetStorage';
import {
  hqDeleteMeeting,
  hqDeletePlannerItem,
  hqDeleteProjectAsset,
  hqDeleteShoot,
  hqUpsertMeeting,
  hqUpsertPlannerItem,
  hqUpsertProjectAsset,
  hqUpsertShoot,
} from './hqFirestoreService';
import { recordHqActivity } from './hqProjectOps';
import { getHqCrewDirectory } from './hqSyncDirectory';
import {
  getAssetsByProjectSync,
  getAssetsSync,
  getMeetingsSync,
  getPlannerItemsSync,
  getShootsSync,
} from './hqSyncDirectory';
import { getHqTenantForWrites } from './hqWriteContext';
import { validateCrewAvailabilityForDate, validateProjectAssignees, validateProjectParticipants } from './hqSchedulingGuards';

export function plannerStatusFromItem(item: PlannerItem): PlannerTaskStatus {
  if (item.status) return item.status;
  if (item.done || item.column === 'complete') return 'done';
  if (item.column === 'client_review') return 'client_review';
  if (item.column === 'active' || item.column === 'post') return 'in_progress';
  return 'todo';
}

export function plannerStatusToLegacy(status: PlannerTaskStatus): { column: PlannerItem['column']; done: boolean } {
  switch (status) {
    case 'done':
      return { column: 'complete', done: true };
    case 'client_review':
      return { column: 'client_review', done: false };
    case 'in_progress':
      return { column: 'active', done: false };
    case 'todo':
    default:
      return { column: 'queue', done: false };
  }
}

export function createPlannerTask(input: Omit<PlannerItem, 'id'>, actorName: string): PlannerItem {
  if (!input.title.trim()) throw new Error('Task title is required.');
  const assigneeIds = input.assigneeCrewIds?.length ? input.assigneeCrewIds : [input.assigneeCrewId];
  const assignees = validateProjectAssignees(input.projectId, assigneeIds);
  if (assignees.ok === false) throw new Error(assignees.error);
  const dueDate = input.dueDate || new Date().toISOString().slice(0, 10);
  const availability = validateCrewAvailabilityForDate(input.projectId, assigneeIds, dueDate);
  if (availability.ok === false) throw new Error(availability.error);
  const normalizedNames = assigneeIds
    .map((crewId) => getHqCrewDirectory().find((crew) => crew.id === crewId)?.displayName)
    .filter((name): name is string => Boolean(name));
  const item: PlannerItem = { ...input, id: `t${Date.now()}` };
  item.assigneeCrewIds = assigneeIds;
  item.assigneeNames = normalizedNames;
  item.assigneeCrewId = assigneeIds[0] || input.assigneeCrewId;
  item.assigneeName = normalizedNames[0] || input.assigneeName;
  item.dueDate = dueDate;
  void hqUpsertPlannerItem(getHqTenantForWrites(), item).catch((err) => console.error('[hq] createPlannerTask', err));
  recordHqActivity({
    projectId: item.projectId,
    entityType: 'planner',
    entityLabel: item.title,
    actorName,
    action: 'created task',
  });
  return item;
}

export function updatePlannerTask(taskId: string, patch: Partial<PlannerItem>, actorName: string): { ok: boolean } {
  const item = getPlannerItemsSync().find((t) => t.id === taskId);
  if (!item) return { ok: false };
  const requestedAssignees = patch.assigneeCrewIds?.length ? patch.assigneeCrewIds : patch.assigneeCrewId ? [patch.assigneeCrewId] : undefined;
  if (requestedAssignees) {
    const assignee = validateProjectAssignees(item.projectId, requestedAssignees);
    if (assignee.ok === false) throw new Error(assignee.error);
    const dueDate = patch.dueDate || item.dueDate;
    const availability = validateCrewAvailabilityForDate(item.projectId, requestedAssignees, dueDate);
    if (availability.ok === false) throw new Error(availability.error);
  }
  const nextPatch = { ...patch };
  if (requestedAssignees) {
    const names = requestedAssignees
      .map((crewId) => getHqCrewDirectory().find((crew) => crew.id === crewId)?.displayName)
      .filter((name): name is string => Boolean(name));
    nextPatch.assigneeCrewIds = requestedAssignees;
    nextPatch.assigneeNames = names;
    nextPatch.assigneeCrewId = requestedAssignees[0] || item.assigneeCrewId;
    nextPatch.assigneeName = names[0] || item.assigneeName;
  }
  if (nextPatch.status) {
    const mapped = plannerStatusToLegacy(nextPatch.status);
    nextPatch.column = mapped.column;
    nextPatch.done = mapped.done;
  }
  const scheduleKeys: (keyof PlannerItem)[] = ['dueDate', 'startTime', 'endTime', 'allDay'];
  const beforeSchedule = {
    dueDate: item.dueDate,
    startTime: item.startTime,
    endTime: item.endTime,
    allDay: item.allDay,
  };
  const merged: PlannerItem = { ...item, ...nextPatch };
  void hqUpsertPlannerItem(getHqTenantForWrites(), merged).catch((err) => console.error('[hq] updatePlannerTask', err));
  const scheduleChanged = scheduleKeys.some((k) => k in nextPatch && nextPatch[k] !== beforeSchedule[k as keyof typeof beforeSchedule]);
  const onlyScheduleChanged =
    scheduleChanged && Object.keys(nextPatch).every((k) => (scheduleKeys as string[]).includes(k));
  if (onlyScheduleChanged) {
    const action =
      merged.allDay || !merged.startTime
        ? `planner.itemRescheduled · all day · ${merged.dueDate}`
        : `planner.itemRescheduled · ${merged.startTime}${merged.endTime ? '–' + merged.endTime : ''} · ${merged.dueDate}`;
    recordHqActivity({
      projectId: merged.projectId,
      entityType: 'planner',
      entityLabel: merged.title,
      actorName,
      action,
    });
  } else {
    recordHqActivity({
      projectId: merged.projectId,
      entityType: 'planner',
      entityLabel: merged.title,
      actorName,
      action: scheduleChanged ? 'updated task and rescheduled' : 'updated task',
    });
  }
  return { ok: true };
}

export function attachAssetToPlannerItem(taskId: string, assetId: string, actorName: string): { ok: boolean; error?: string } {
  const item = getPlannerItemsSync().find((t) => t.id === taskId);
  if (!item) return { ok: false, error: 'Planner item not found.' };
  const asset = getAssetsByProjectSync(item.projectId).find((a) => a.id === assetId);
  if (!asset || asset.projectId !== item.projectId) {
    return { ok: false, error: 'Asset must exist on the same project.' };
  }
  const existing = new Set(item.attachmentAssetIds || []);
  existing.add(assetId);
  const merged: PlannerItem = { ...item, attachmentAssetIds: [...existing] };
  void hqUpsertPlannerItem(getHqTenantForWrites(), merged).catch((err) => console.error('[hq] attachAssetToPlannerItem', err));
  recordHqActivity({
    projectId: item.projectId,
    entityType: 'planner',
    entityLabel: item.title,
    actorName,
    action: `attached asset ${asset.label}`,
  });
  return { ok: true };
}

export function removeAssetFromPlannerItem(taskId: string, assetId: string, actorName: string): { ok: boolean; error?: string } {
  const item = getPlannerItemsSync().find((t) => t.id === taskId);
  if (!item) return { ok: false, error: 'Planner item not found.' };
  const merged: PlannerItem = {
    ...item,
    attachmentAssetIds: (item.attachmentAssetIds || []).filter((id) => id !== assetId),
  };
  void hqUpsertPlannerItem(getHqTenantForWrites(), merged).catch((err) => console.error('[hq] removeAssetFromPlannerItem', err));
  recordHqActivity({
    projectId: item.projectId,
    entityType: 'planner',
    entityLabel: item.title,
    actorName,
    action: `detached asset ${assetId}`,
  });
  return { ok: true };
}

export function deletePlannerTask(taskId: string, actorName: string): { ok: boolean } {
  const item = getPlannerItemsSync().find((t) => t.id === taskId);
  if (!item) return { ok: false };
  void hqDeletePlannerItem(getHqTenantForWrites(), taskId).catch((err) => console.error('[hq] deletePlannerTask', err));
  recordHqActivity({
    projectId: item.projectId,
    entityType: 'planner',
    entityLabel: item.title,
    actorName,
    action: 'deleted task',
  });
  return { ok: true };
}

export function createShoot(input: Omit<AdminShoot, 'id'>, actorName: string): AdminShoot {
  if (!input.title.trim()) throw new Error('Shoot title is required.');
  if (!input.date) throw new Error('Shoot date is required.');
  const participants = validateProjectParticipants(input.projectId, input.crew);
  if (participants.ok === false) throw new Error(participants.error);
  const availability = validateCrewAvailabilityForDate(input.projectId, participants.crewIds || [], input.date);
  if (availability.ok === false) throw new Error(availability.error);
  const item: AdminShoot = {
    ...input,
    id: `S-${Date.now()}`,
    crew: participants.names || input.crew,
    crewIds: participants.crewIds,
  };
  void hqUpsertShoot(getHqTenantForWrites(), item).catch((err) => console.error('[hq] createShoot', err));
  recordHqActivity({
    projectId: item.projectId,
    entityType: 'shoot',
    entityLabel: item.title,
    actorName,
    action: 'created shoot day',
  });
  return item;
}

export function createMeeting(input: Omit<AdminMeeting, 'id'>, actorName: string): AdminMeeting {
  if (!input.title.trim()) throw new Error('Meeting title is required.');
  if (!input.date) throw new Error('Meeting date is required.');
  const participants = validateProjectParticipants(input.projectId, input.participants);
  if (participants.ok === false) throw new Error(participants.error);
  const availability = validateCrewAvailabilityForDate(input.projectId, participants.crewIds || [], input.date);
  if (availability.ok === false) throw new Error(availability.error);
  const item: AdminMeeting = {
    ...input,
    id: `M-${Date.now()}`,
    participants: participants.names || input.participants,
    participantCrewIds: participants.crewIds,
  };
  void hqUpsertMeeting(getHqTenantForWrites(), item).catch((err) => console.error('[hq] createMeeting', err));
  recordHqActivity({
    projectId: item.projectId,
    entityType: 'meeting',
    entityLabel: item.title,
    actorName,
    action: 'created meeting',
  });
  return item;
}

export function updateShoot(shootId: string, patch: Partial<AdminShoot>, actorName: string): { ok: boolean } {
  const found = getShootsSync().find((s) => s.id === shootId);
  if (!found) return { ok: false };
  let next: AdminShoot = { ...found };
  if (patch.crew) {
    const participants = validateProjectParticipants(found.projectId, patch.crew);
    if (participants.ok === false) throw new Error(participants.error);
    const availability = validateCrewAvailabilityForDate(
      found.projectId,
      participants.crewIds || [],
      patch.date || found.date,
    );
    if (availability.ok === false) throw new Error(availability.error);
    next = {
      ...next,
      ...patch,
      crew: participants.names,
      crewIds: participants.crewIds,
    };
  } else {
    next = { ...found, ...patch };
  }
  void hqUpsertShoot(getHqTenantForWrites(), next).catch((err) => console.error('[hq] updateShoot', err));
  recordHqActivity({
    projectId: next.projectId,
    entityType: 'shoot',
    entityLabel: next.title,
    actorName,
    action: 'updated shoot day',
  });
  return { ok: true };
}

export function deleteShoot(shootId: string, actorName: string): { ok: boolean } {
  const item = getShootsSync().find((s) => s.id === shootId);
  if (!item) return { ok: false };
  void hqDeleteShoot(getHqTenantForWrites(), shootId).catch((err) => console.error('[hq] deleteShoot', err));
  recordHqActivity({
    projectId: item.projectId,
    entityType: 'shoot',
    entityLabel: item.title,
    actorName,
    action: 'deleted shoot day',
  });
  return { ok: true };
}

export function updateMeeting(meetingId: string, patch: Partial<AdminMeeting>, actorName: string): { ok: boolean } {
  const item = getMeetingsSync().find((m) => m.id === meetingId);
  if (!item) return { ok: false };
  let next: AdminMeeting = { ...item };
  if (patch.participants) {
    const participants = validateProjectParticipants(item.projectId, patch.participants);
    if (participants.ok === false) throw new Error(participants.error);
    const availability = validateCrewAvailabilityForDate(
      item.projectId,
      participants.crewIds || [],
      patch.date || item.date,
    );
    if (availability.ok === false) throw new Error(availability.error);
    next = {
      ...next,
      ...patch,
      participants: participants.names,
      participantCrewIds: participants.crewIds,
    };
  } else {
    next = { ...item, ...patch };
  }
  void hqUpsertMeeting(getHqTenantForWrites(), next).catch((err) => console.error('[hq] updateMeeting', err));
  recordHqActivity({
    projectId: next.projectId,
    entityType: 'meeting',
    entityLabel: next.title,
    actorName,
    action: 'updated meeting',
  });
  return { ok: true };
}

export function deleteMeeting(meetingId: string, actorName: string): { ok: boolean } {
  const item = getMeetingsSync().find((m) => m.id === meetingId);
  if (!item) return { ok: false };
  void hqDeleteMeeting(getHqTenantForWrites(), meetingId).catch((err) => console.error('[hq] deleteMeeting', err));
  recordHqActivity({
    projectId: item.projectId,
    entityType: 'meeting',
    entityLabel: item.title,
    actorName,
    action: 'deleted meeting',
  });
  return { ok: true };
}

export function createProjectAsset(
  input: Omit<ProjectAsset, 'id' | 'updatedAt' | 'commentCount'>,
  actorName: string,
): ProjectAsset {
  if (!input.label.trim()) throw new Error('Asset label is required.');
  const id = `a-${Date.now()}`;
  const sourceType: ProjectAssetSourceType = input.sourceType ?? 'upload';
  const normalizedFile = input.storage?.filename?.trim() || input.label.trim().replace(/\s+/g, '-').toLowerCase();
  const storage =
    sourceType === 'upload'
      ? {
          ...getProjectAssetStorageAdapter().resolveStorage({
            projectId: input.projectId,
            assetId: id,
            filename: normalizedFile,
            sourceType,
          }),
          ...(input.storage?.path ? { path: input.storage.path } : {}),
          ...(input.storage?.url ? { url: input.storage.url } : {}),
          mimeType: input.storage?.mimeType,
          sizeBytes: input.storage?.sizeBytes,
          filename: input.storage?.filename || normalizedFile,
        }
      : undefined;
  const trimmedRef = input.sourceUrl?.trim();
  const item: ProjectAsset = {
    ...input,
    id,
    sourceType,
    sourceUrl: sourceType === 'external_link' ? trimmedRef || '' : trimmedRef || undefined,
    storage,
    notes: input.notes ?? '',
    updatedAt: new Date().toISOString(),
    commentCount: 0,
  };
  void hqUpsertProjectAsset(getHqTenantForWrites(), item).catch((err) => console.error('[hq] createProjectAsset', err));
  recordHqActivity({
    projectId: item.projectId,
    entityType: 'asset',
    entityLabel: item.label,
    actorName,
    action: 'created asset',
  });
  return item;
}

export function updateProjectAsset(assetId: string, patch: Partial<ProjectAsset>, actorName: string): { ok: boolean } {
  const item = getAssetsSync().find((a) => a.id === assetId);
  if (!item) return { ok: false };
  const nextSourceType = patch.sourceType ?? item.sourceType ?? 'upload';
  const nextStorageFilename = patch.storage?.filename || item.storage?.filename || item.label.replace(/\s+/g, '-').toLowerCase();
  const nextStorage =
    nextSourceType === 'upload'
      ? {
          ...getProjectAssetStorageAdapter().resolveStorage({
            projectId: item.projectId,
            assetId: item.id,
            filename: nextStorageFilename,
            sourceType: nextSourceType,
          }),
          ...(item.storage || {}),
          ...(patch.storage || {}),
          filename: nextStorageFilename,
        }
      : undefined;
  const nextSourceUrl =
    nextSourceType === 'external_link'
      ? (patch.sourceUrl !== undefined ? patch.sourceUrl : item.sourceUrl) ?? ''
      : patch.sourceUrl !== undefined
        ? patch.sourceUrl || undefined
        : item.sourceUrl || undefined;
  const merged: ProjectAsset = {
    ...item,
    ...patch,
    sourceType: nextSourceType,
    sourceUrl: nextSourceUrl as string | undefined,
    storage: nextStorage,
    notes: patch.notes ?? item.notes ?? '',
    updatedAt: new Date().toISOString(),
  };
  void hqUpsertProjectAsset(getHqTenantForWrites(), merged).catch((err) => console.error('[hq] updateProjectAsset', err));
  recordHqActivity({
    projectId: merged.projectId,
    entityType: 'asset',
    entityLabel: merged.label,
    actorName,
    action: 'updated asset',
  });
  return { ok: true };
}

export function deleteProjectAsset(assetId: string, actorName: string): { ok: boolean } {
  const item = getAssetsSync().find((a) => a.id === assetId);
  if (!item) return { ok: false };
  void hqDeleteProjectAsset(getHqTenantForWrites(), assetId).catch((err) => console.error('[hq] deleteProjectAsset', err));
  recordHqActivity({
    projectId: item.projectId,
    entityType: 'asset',
    entityLabel: item.label,
    actorName,
    action: 'deleted asset',
  });
  return { ok: true };
}
