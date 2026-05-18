import type { ClientProfile } from '../../types';

export type CollectionQuickFilter =
  | 'all'
  | 'overdue'
  | 'due_week'
  | 'stale30'
  | 'stale60'
  | 'stale90'
  | 'unlink';

const OPEN = new Set(['UNPAID', 'PARTIALLY_PAID', 'SCHEDULED', 'PAYMENT_PENDING']);

export function clientDisplayName(c: ClientProfile): string {
  const n = c.name?.trim();
  return n || c.company || c.email || c.id;
}

function parseLocalDay(s?: string): Date | null {
  if (!s || s.length < 10) return null;
  const [y, m, d] = s.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return null;
  const dt = new Date(y, m - 1, d);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

export function isInvoiceOverdue(due?: string): boolean {
  const d = parseLocalDay(due);
  if (!d) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d < today;
}

export function isDueWithinDays(due: string | undefined, days: number): boolean {
  const d = parseLocalDay(due);
  if (!d) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(today);
  end.setDate(end.getDate() + days);
  return d >= today && d <= end;
}

export function daysSinceIsoDay(iso?: string): number | null {
  const d = parseLocalDay(iso);
  if (!d) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.floor((today.getTime() - d.getTime()) / 86_400_000);
}

export function hasOpenBalance(c: ClientProfile): boolean {
  return (c.billing?.balance ?? 0) > 0;
}

export function looksUnpaid(c: ClientProfile): boolean {
  const st = c.billing?.status?.toUpperCase() ?? '';
  if (OPEN.has(st)) return true;
  return hasOpenBalance(c);
}

export function passesCollectionFilter(c: ClientProfile, f: CollectionQuickFilter): boolean {
  if (f === 'all') return true;
  if (f === 'unlink') return !c.squareCustomerId?.trim();
  if (f === 'overdue') return looksUnpaid(c) && isInvoiceOverdue(c.billing?.dueDate);
  if (f === 'due_week') return looksUnpaid(c) && isDueWithinDays(c.billing?.dueDate, 7);
  const staleDays = f === 'stale30' ? 30 : f === 'stale60' ? 60 : f === 'stale90' ? 90 : 0;
  if (!staleDays) return true;
  if (!looksUnpaid(c)) return false;
  const since = daysSinceIsoDay(c.billing?.lastPaymentDate);
  return since == null || since >= staleDays;
}

export function sortClientsForCollections(a: ClientProfile, b: ClientProfile): number {
  const balA = a.billing?.balance ?? 0;
  const balB = b.billing?.balance ?? 0;
  if (balB !== balA) return balB - balA;
  const odA = isInvoiceOverdue(a.billing?.dueDate) ? 1 : 0;
  const odB = isInvoiceOverdue(b.billing?.dueDate) ? 1 : 0;
  if (odB !== odA) return odB - odA;
  return clientDisplayName(a).localeCompare(clientDisplayName(b));
}
