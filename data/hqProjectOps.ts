import type { AdminInvoice, AdminProject, BlockerItem, ChangeOrder, DependencyItem, ProjectExpense, ProjectStage, RiskItem } from '../types';
import { canTransitionStage, formatStageLabel } from './hqConstants';
import {
  getActivityByProjectSync,
  getAssetsByProjectSync,
  getDeliverablesByProjectSync,
  getHqBlockerDirectory,
  getHqChangeOrderDirectory,
  getHqDependencyDirectory,
  getHqExpenseDirectory,
  getHqInvoiceDirectory,
  getHqProposalDirectory,
  getHqRiskDirectory,
  getMeetingsByProjectSync,
  getPlannerItemsSync,
  getProjectByIdSync,
  getShootsByProjectSync,
} from './hqSyncDirectory';
import {
  hqDeleteProjectCascade,
  hqUpsertActivity,
  hqUpsertProject,
} from './hqFirestoreService';
import { getHqCrewDirectory } from './hqSyncDirectory';
import { getHqTenantForWrites } from './hqWriteContext';

export interface BulkProjectResult {
  ok: boolean;
  affected: string[];
  failed: Array<{ projectId: string; error: string }>;
}

export interface ProjectCascadeCounts {
  planner: number;
  shoots: number;
  meetings: number;
  assets: number;
  invoices: number;
  proposals: number;
  expenses: number;
  deliverables: number;
  risks: number;
  blockers: number;
  dependencies: number;
  changeOrders: number;
  stageTransitions: number;
  activity: number;
}

export interface DeleteProjectCascadeResult {
  ok: boolean;
  error?: string;
  counts?: ProjectCascadeCounts;
}

export function recordHqActivity(entry: {
  projectId: string;
  projectTitle?: string;
  entityType: import('../types').ActivityEntry['entityType'];
  entityLabel: string;
  actorName: string;
  action: string;
}) {
  const project = getProjectByIdSync(entry.projectId);
  const row: import('../types').ActivityEntry = {
    id: `ac-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    projectId: entry.projectId,
    projectTitle: entry.projectTitle || project?.title || 'Unknown project',
    entityType: entry.entityType,
    entityLabel: entry.entityLabel,
    actorName: entry.actorName,
    action: entry.action,
    createdAt: new Date().toISOString(),
  };
  void hqUpsertActivity(getHqTenantForWrites(), row).catch((err) => console.error('[hq] pushActivity', err));
}

export function transitionProjectStage(
  projectId: string,
  toStage: ProjectStage,
  actorName: string,
): { ok: boolean; error?: string } {
  const project = getProjectByIdSync(projectId);
  if (!project) return { ok: false, error: 'Project not found.' };

  if (toStage === 'delivered') {
    const pendingRequired = getDeliverablesByProjectSync(projectId).some(
      (item) => item.required && item.status !== 'delivered' && item.status !== 'approved',
    );
    if (pendingRequired) return { ok: false, error: 'Required deliverables must be approved before delivery.' };
  }

  if (!canTransitionStage(project.stage, toStage)) {
    return { ok: false, error: `Invalid stage transition from ${project.stage} to ${toStage}.` };
  }

  const next: AdminProject = { ...project, stage: toStage };
  void hqUpsertProject(getHqTenantForWrites(), next).catch((err) => console.error('[hq] transitionProjectStage', err));
  recordHqActivity({
    projectId,
    entityType: 'project',
    entityLabel: 'Stage',
    actorName,
    action: `moved to ${formatStageLabel(toStage)}`,
    projectTitle: project.title,
  });
  return { ok: true };
}

export function removeCrewFromProject(projectId: string, crewId: string, actorName: string): { ok: boolean; error?: string } {
  const project = getProjectByIdSync(projectId);
  if (!project) return { ok: false, error: 'Project not found.' };
  const next: AdminProject = {
    ...project,
    assignedCrewIds: (project.assignedCrewIds || []).filter((id) => id !== crewId),
  };
  void hqUpsertProject(getHqTenantForWrites(), next).catch((err) => console.error('[hq] removeCrewFromProject', err));
  const crew = getHqCrewDirectory().find((c) => c.id === crewId);
  recordHqActivity({
    projectId,
    entityType: 'project',
    entityLabel: 'Team',
    actorName,
    action: `removed ${crew?.displayName || crewId} from project team`,
    projectTitle: project.title,
  });
  return { ok: true };
}

export function assignCrewToProject(projectId: string, crewId: string, actorName: string): { ok: boolean; error?: string } {
  const project = getProjectByIdSync(projectId);
  if (!project) return { ok: false, error: 'Project not found.' };
  const assigned = project.assignedCrewIds || [];
  if (assigned.includes(crewId)) return { ok: true };
  const next: AdminProject = {
    ...project,
    assignedCrewIds: [...assigned, crewId],
  };
  void hqUpsertProject(getHqTenantForWrites(), next).catch((err) => console.error('[hq] assignCrewToProject', err));
  const crew = getHqCrewDirectory().find((c) => c.id === crewId);
  recordHqActivity({
    projectId,
    entityType: 'project',
    entityLabel: 'Team',
    actorName,
    action: `added ${crew?.displayName || crewId} to project team`,
    projectTitle: project.title,
  });
  return { ok: true };
}

export function bulkAssignCrewToProjects(projectIds: string[], crewIds: string[], actorName: string): BulkProjectResult {
  const affected: string[] = [];
  const failed: Array<{ projectId: string; error: string }> = [];
  for (const projectId of projectIds) {
    const project = getProjectByIdSync(projectId);
    if (!project) {
      failed.push({ projectId, error: 'Project not found.' });
      continue;
    }
    let mutated = false;
    for (const crewId of crewIds) {
      const result = assignCrewToProject(projectId, crewId, actorName);
      if (result.ok) mutated = true;
    }
    if (mutated) affected.push(projectId);
  }
  return { ok: failed.length === 0, affected, failed };
}

export function bulkArchiveProjects(projectIds: string[], actorName: string): BulkProjectResult {
  const affected: string[] = [];
  const failed: Array<{ projectId: string; error: string }> = [];
  for (const projectId of projectIds) {
    const project = getProjectByIdSync(projectId);
    if (!project) {
      failed.push({ projectId, error: 'Project not found.' });
      continue;
    }
    if (project.stage === 'archived') {
      affected.push(projectId);
      continue;
    }
    const fromStage = project.stage;
    const next: AdminProject = { ...project, stage: 'archived', status: 'complete' };
    void hqUpsertProject(getHqTenantForWrites(), next).catch((err) => console.error('[hq] bulkArchiveProjects', err));
    recordHqActivity({
      projectId,
      entityType: 'project',
      entityLabel: 'Stage',
      actorName,
      action: `archived (was ${formatStageLabel(fromStage)})`,
      projectTitle: project.title,
    });
    affected.push(projectId);
  }
  return { ok: failed.length === 0, affected, failed };
}

export function archiveProject(projectId: string, actorName: string): { ok: boolean; error?: string } {
  const result = bulkArchiveProjects([projectId], actorName);
  if (!result.ok) {
    return { ok: false, error: result.failed[0]?.error || 'Could not archive project.' };
  }
  return { ok: true };
}

export function countProjectCascade(projectId: string): ProjectCascadeCounts {
  return {
    planner: getPlannerItemsSync().filter((i) => i.projectId === projectId).length,
    shoots: getShootsByProjectSync(projectId).length,
    meetings: getMeetingsByProjectSync(projectId).length,
    assets: getAssetsByProjectSync(projectId).length,
    invoices: getHqInvoiceDirectory().filter((i: AdminInvoice) => i.projectId === projectId).length,
    proposals: getHqProposalDirectory().filter((p) => p.projectId === projectId).length,
    expenses: getHqExpenseDirectory().filter((e: ProjectExpense) => e.projectId === projectId).length,
    deliverables: getDeliverablesByProjectSync(projectId).length,
    risks: getHqRiskDirectory().filter((r: RiskItem) => r.projectId === projectId).length,
    blockers: getHqBlockerDirectory().filter((b: BlockerItem) => b.projectId === projectId).length,
    dependencies: getHqDependencyDirectory().filter((d: DependencyItem) => d.projectId === projectId).length,
    changeOrders: getHqChangeOrderDirectory().filter((c: ChangeOrder) => c.projectId === projectId).length,
    stageTransitions: 0,
    activity: getActivityByProjectSync(projectId).length,
  };
}

export function deleteProjectCascade(projectId: string, actorName: string): DeleteProjectCascadeResult {
  const project = getProjectByIdSync(projectId);
  if (!project) return { ok: false, error: 'Project not found.' };
  const counts = countProjectCascade(projectId);
  void hqDeleteProjectCascade(getHqTenantForWrites(), projectId, actorName).catch((err) =>
    console.error('[hq] deleteProjectCascade', err),
  );
  return { ok: true, counts };
}

export function updateProjectNarrative(
  projectId: string,
  patch: Pick<AdminProject, 'summary' | 'brief' | 'goals' | 'nextMilestone'>,
  actorName: string,
): { ok: boolean; error?: string } {
  const project = getProjectByIdSync(projectId);
  if (!project) return { ok: false, error: 'Project not found.' };
  const next: AdminProject = {
    ...project,
    summary: patch.summary.trim(),
    brief: patch.brief.trim(),
    goals: patch.goals.trim(),
    nextMilestone: patch.nextMilestone.trim(),
  };
  void hqUpsertProject(getHqTenantForWrites(), next).catch((err) => console.error('[hq] updateProjectNarrative', err));
  recordHqActivity({
    projectId,
    entityType: 'project',
    entityLabel: 'Narrative',
    actorName,
    action: 'updated summary and brief details',
    projectTitle: project.title,
  });
  return { ok: true };
}
