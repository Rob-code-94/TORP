import type { AdminInvoiceStatus, PlannerBoardColumn, PlannerItemType, ProjectAssetStatus, ProjectStage, ProposalContractStatus } from '../../../types';
import { PLANNER_COLUMN_LABEL } from '../../../data/hqConstants';

export type AdminThemeMode = 'dark' | 'light';

export function formatStage(s: ProjectStage): string {
  return s
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function stageClass(s: ProjectStage): string {
  return stageClassForTheme(s, 'dark');
}

export function stageClassForTheme(s: ProjectStage, theme: AdminThemeMode): string {
  if (theme === 'light') {
    if (s === 'delivered' || s === 'archived') return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    if (s === 'inquiry' || s === 'scope' || s === 'estimate') return 'bg-zinc-100 text-zinc-700 border border-zinc-200';
    if (s === 'pre_production') return 'bg-amber-50 text-amber-700 border border-amber-200';
    return 'bg-zinc-200/80 text-zinc-800 border border-zinc-200';
  }
  if (s === 'delivered' || s === 'archived') {
    return 'bg-emerald-950/50 text-emerald-300 border border-emerald-900/60';
  }
  if (s === 'inquiry' || s === 'scope' || s === 'estimate') return 'bg-zinc-800/80 text-zinc-300 border border-zinc-700';
  if (s === 'pre_production') {
    return 'bg-amber-950/50 text-amber-200 border border-amber-900/50';
  }
  return 'bg-zinc-900/80 text-white border border-zinc-700';
}

export function invoiceStatusClass(s: AdminInvoiceStatus): string {
  return invoiceStatusClassForTheme(s, 'dark');
}

export function invoiceStatusClassForTheme(s: AdminInvoiceStatus, theme: AdminThemeMode): string {
  if (theme === 'light') {
    if (s === 'paid') return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    if (s === 'overdue' || s === 'void') return 'bg-red-50 text-red-700 border border-red-200';
    if (s === 'partial') return 'bg-amber-50 text-amber-700 border border-amber-200';
    return 'bg-zinc-100 text-zinc-700 border border-zinc-200';
  }
  if (s === 'paid') return 'bg-emerald-950/50 text-emerald-300 border border-emerald-900/60';
  if (s === 'overdue' || s === 'void') return 'bg-red-950/50 text-red-300 border border-red-900/50';
  if (s === 'partial') return 'bg-amber-950/50 text-amber-200 border border-amber-800/50';
  return 'bg-zinc-800/80 text-zinc-200 border border-zinc-600';
}

export function proposalStatusClass(s: ProposalContractStatus): string {
  return proposalStatusClassForTheme(s, 'dark');
}

export function proposalStatusClassForTheme(s: ProposalContractStatus, theme: AdminThemeMode): string {
  if (theme === 'light') {
    if (s === 'signed') return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    if (s === 'declined') return 'bg-red-50 text-red-700 border border-red-200';
    if (s === 'viewed') return 'bg-blue-50 text-blue-700 border border-blue-200';
    return 'bg-zinc-100 text-zinc-700 border border-zinc-200';
  }
  if (s === 'signed') return 'bg-emerald-950/50 text-emerald-300 border border-emerald-900/60';
  if (s === 'declined') return 'bg-red-950/40 text-red-200 border border-red-900/50';
  if (s === 'viewed') return 'bg-blue-950/40 text-blue-200 border border-blue-900/40';
  return 'bg-zinc-800/80 text-zinc-200 border border-zinc-600';
}

export function assetStatusClass(s: ProjectAssetStatus): string {
  return assetStatusClassForTheme(s, 'dark');
}

export function assetStatusClassForTheme(s: ProjectAssetStatus, theme: AdminThemeMode): string {
  if (theme === 'light') {
    if (s === 'delivered' || s === 'approved') return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    if (s === 'client_review') return 'bg-amber-50 text-amber-700 border border-amber-200';
    return 'bg-zinc-100 text-zinc-700 border border-zinc-200';
  }
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

const ADMIN_DATE_FMT = new Intl.DateTimeFormat('en-US', {
  month: '2-digit',
  day: '2-digit',
  year: 'numeric',
});

const ADMIN_DATE_TIME_FMT = new Intl.DateTimeFormat('en-US', {
  month: '2-digit',
  day: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

/**
 * Normalize admin-facing date display while preserving ISO-like storage.
 */
export function formatAdminDate(value?: string | null): string {
  if (!value) return '—';
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value;
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) return '—';
  return ADMIN_DATE_FMT.format(d);
}

export function formatAdminDateTime(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return ADMIN_DATE_TIME_FMT.format(d);
}
