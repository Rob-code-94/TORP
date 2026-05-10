import type { PlannerItem, ProjectCapability, ProjectStage } from '../types';

export const PLANNER_COLUMN_LABEL: Record<PlannerItem['column'], string> = {
  queue: 'Queue',
  active: 'Active',
  post: 'Post',
  client_review: 'Client',
  complete: 'Complete',
};

export const PROJECT_STAGE_ORDER: ProjectStage[] = [
  'inquiry',
  'scope',
  'estimate',
  'pre_production',
  'production',
  'post',
  'delivered',
  'archived',
];

const CAPABILITY_BY_ROLE: Record<'ADMIN' | 'PROJECT_MANAGER', ProjectCapability[]> = {
  ADMIN: [
    'project.create',
    'project.edit',
    'project.archive',
    'project.delete',
    'project.bulk.archive',
    'project.bulk.assign',
    'project.stage.move',
    'project.financial.approve',
    'project.changeOrder.request',
    'project.changeOrder.approve',
  ],
  PROJECT_MANAGER: [
    'project.create',
    'project.edit',
    'project.bulk.assign',
    'project.stage.move',
    'project.changeOrder.request',
  ],
};

export function capabilitiesForRole(role: 'ADMIN' | 'PROJECT_MANAGER'): ProjectCapability[] {
  return CAPABILITY_BY_ROLE[role];
}

/** Human label for activity strings (matches admin `formatStage` behavior). */
export function formatStageLabel(stage: ProjectStage): string {
  return stage
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function canTransitionStage(fromStage: ProjectStage, toStage: ProjectStage): boolean {
  const fromIdx = PROJECT_STAGE_ORDER.indexOf(fromStage);
  const toIdx = PROJECT_STAGE_ORDER.indexOf(toStage);
  if (fromIdx < 0 || toIdx < 0) return false;
  if (fromStage === toStage) return true;
  if (fromStage === 'archived' && toStage !== 'archived') return false;
  if (toStage === 'archived') return fromStage === 'delivered';
  return toIdx >= 0 && toIdx <= PROJECT_STAGE_ORDER.length - 2;
}
