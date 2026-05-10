import type {
  ActivityEntry,
  AdminMeeting,
  AdminProposal,
  AdminShoot,
  ClientProfile,
  PlannerItem,
  ProjectAsset,
  ProjectDeliverable,
  RiskItem,
  BlockerItem,
  DependencyItem,
  ChangeOrder,
  AdminInvoice,
  ProjectExpense,
} from '../types';
import type { AdminProject } from '../types';
import { commandStatsFromCaches } from './hqFirestoreService';
import {
  getActivityByProjectSync,
  getAdminShootByIdSync,
  getAssetsByProjectSync,
  getAssetsSync,
  getDeliverablesByProjectSync,
  getExpensesByProjectSync,
  getHqBlockerDirectory,
  getHqChangeOrderDirectory,
  getHqClientDirectory,
  getHqInvoiceDirectory,
  getHqProposalDirectory,
  getHqProjectDirectory,
  getHqRiskDirectory,
  getMeetingsByProjectSync,
  getPlannerItemsSync,
  getProjectByIdSync,
  getProposalByProjectSync,
  getShootsByProjectSync,
} from './hqSyncDirectory';

export function getProjectById(id: string): AdminProject | undefined {
  return getProjectByIdSync(id);
}

export function getPlannerByProject(id: string): PlannerItem[] {
  return getPlannerItemsSync()
    .filter((t) => t.projectId === id)
    .map((item) => {
      const assigneeCrewIds = item.assigneeCrewIds?.length ? item.assigneeCrewIds : [item.assigneeCrewId];
      const assigneeNames = item.assigneeNames?.length ? item.assigneeNames : [item.assigneeName];
      return { ...item, assigneeCrewIds, assigneeNames };
    });
}

export function getAssetsByProject(id: string): ProjectAsset[] {
  return getAssetsByProjectSync(id).map((item) => ({
    ...item,
    sourceType: item.sourceType ?? 'upload',
    notes: item.notes ?? '',
  }));
}

export function getActivityByProject(id: string): ActivityEntry[] {
  return getActivityByProjectSync(id);
}

export function getShootsByProject(id: string): AdminShoot[] {
  return getShootsByProjectSync(id);
}

export function getAdminShootById(id: string): AdminShoot | undefined {
  return getAdminShootByIdSync(id);
}

export function getMeetingsByProject(id: string): AdminMeeting[] {
  return getMeetingsByProjectSync(id);
}

export function getDeliverablesByProject(id: string): ProjectDeliverable[] {
  return getDeliverablesByProjectSync(id).map((deliverable) => ({
    ...deliverable,
    step: deliverable.step ?? 'post_production',
    acceptanceCriteria: deliverable.acceptanceCriteria ?? '',
    notes: deliverable.notes ?? '',
  }));
}

export function getRisksByProject(id: string): RiskItem[] {
  return getHqRiskDirectory().filter((item) => item.projectId === id);
}

export function getBlockersByProject(id: string): BlockerItem[] {
  return getHqBlockerDirectory().filter((item) => item.projectId === id);
}

export function getDependenciesByProject(id: string): DependencyItem[] {
  return getHqDependencyDirectory().filter((item) => item.projectId === id);
}

export function getChangeOrdersByProject(id: string): ChangeOrder[] {
  return getHqChangeOrderDirectory().filter((item) => item.projectId === id);
}

export function getInvoicesByProject(id: string): AdminInvoice[] {
  return getHqInvoiceDirectory().filter((i) => i.projectId === id);
}

export function getProposalByProject(id: string): AdminProposal | undefined {
  return getProposalByProjectSync(id);
}

export function getExpensesByProject(id: string): ProjectExpense[] {
  return getExpensesByProjectSync(id);
}

export function listClients(): ClientProfile[] {
  return getHqClientDirectory();
}

export function getCommandStats() {
  return commandStatsFromCaches({
    projects: getHqProjectDirectory(),
    invoices: getHqInvoiceDirectory(),
    assets: getAssetsSync(),
    planner: getPlannerItemsSync(),
  });
}
