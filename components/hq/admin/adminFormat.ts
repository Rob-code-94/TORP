import type { AdminInvoiceStatus, PlannerBoardColumn, PlannerItemType, ProjectAssetStatus, ProjectStage, ProposalContractStatus } from '../../../types';
import { PLANNER_COLUMN_LABEL } from '../../../data/adminMock';

export function formatStage(s: ProjectStage): string {
  return s
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function stageClass(s: ProjectStage): string {
  if (s === 'delivered' || s === 'archived' || s === 'approved') {
    return 'bg-emerald-950/50 text-emerald-300 border border-emerald-900/60';
  }
  if (s === 'intake' || s === 'proposal') return 'bg-zinc-800/80 text-zinc-300 border border-zinc-700';
  if (s === 'client_review' || s === 'revision') {
    return 'bg-amber-950/50 text-amber-200 border border-amber-900/50';
  }
  return 'bg-zinc-900/80 text-white border border-zinc-700';
}

export function invoiceStatusClass(s: AdminInvoiceStatus): string {
  if (s === 'paid') return 'bg-emerald-950/50 text-emerald-300 border border-emerald-900/60';
  if (s === 'overdue' || s === 'void') return 'bg-red-950/50 text-red-300 border border-red-900/50';
  if (s === 'partial') return 'bg-amber-950/50 text-amber-200 border border-amber-800/50';
  return 'bg-zinc-800/80 text-zinc-200 border border-zinc-600';
}

export function proposalStatusClass(s: ProposalContractStatus): string {
  if (s === 'signed') return 'bg-emerald-950/50 text-emerald-300 border border-emerald-900/60';
  if (s === 'declined') return 'bg-red-950/40 text-red-200 border border-red-900/50';
  if (s === 'viewed') return 'bg-blue-950/40 text-blue-200 border border-blue-900/40';
  return 'bg-zinc-800/80 text-zinc-200 border border-zinc-600';
}

export function assetStatusClass(s: ProjectAssetStatus): string {
  if (s === 'delivered' || s === 'approved') {
    return 'bg-emerald-950/50 text-emerald-300 border border-emerald-900/60';
  }
  if (s === 'client_review') return 'bg-amber-950/50 text-amber-200 border border-amber-900/50';
  return 'bg-zinc-800/60 text-zinc-300 border border-zinc-700';
}

export function typeLabel(t: PlannerItemType): string {
  const m: Record<PlannerItemType, string> = {
    pre_production: 'Pre-prod',
    shoot: 'Shoot',
    edit: 'Edit',
    review: 'Review',
    delivery: 'Delivery',
    admin: 'Admin',
    invoice: 'Invoice',
    client_followup: 'Client',
  };
  return m[t] ?? t;
}

export function columnLabel(c: PlannerBoardColumn): string {
  return PLANNER_COLUMN_LABEL[c] ?? c;
}
