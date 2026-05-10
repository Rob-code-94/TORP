import type {
  AdminInvoice,
  AdminInvoiceStatus,
  AdminProposal,
  FinancialLockStatus,
  ProjectExpense,
} from '../types';
import { hqUpsertExpense, hqUpsertInvoice } from './hqFirestoreService';
import {
  getHqExpenseDirectory,
  getHqInvoiceDirectory,
  getHqProposalDirectory,
} from './hqSyncDirectory';
import { getHqTenantForWrites } from './hqWriteContext';

export interface FinanceMetrics {
  openArTotal: number;
  outstandingInvoiceCount: number;
  overdueInvoiceCount: number;
  overdueInvoices: AdminInvoice[];
  revenueYtd: number;
  monthlyRevenue: Array<{ name: string; revenue: number }>;
}

export interface FinanceRepository {
  listInvoices(): AdminInvoice[];
  listInvoicesByProject(projectId: string): AdminInvoice[];
  listProposals(): AdminProposal[];
  getProposalByProject(projectId: string): AdminProposal | undefined;
  listExpensesByProject(projectId: string): ProjectExpense[];
  createInvoice(input: Omit<AdminInvoice, 'id'>): AdminInvoice;
  updateInvoice(id: string, patch: Partial<AdminInvoice>): { ok: boolean };
  setInvoiceLockStatus(id: string, lockStatus: FinancialLockStatus, actor?: string): { ok: boolean };
  createExpense(input: Omit<ProjectExpense, 'id'>): ProjectExpense;
  getMetrics(now?: Date): FinanceMetrics;
}

function coerceInvoiceStatus(invoice: AdminInvoice): AdminInvoiceStatus {
  if (invoice.status === 'paid' || invoice.status === 'void') return invoice.status;
  const openAmount = invoice.amount - invoice.amountPaid;
  if (openAmount <= 0) return 'paid';
  if (invoice.amountPaid > 0) return 'partial';
  return invoice.status;
}

function validateInvoicePatch(patch: Partial<AdminInvoice>) {
  if (patch.amount !== undefined && (!Number.isFinite(patch.amount) || patch.amount < 0)) {
    throw new Error('Invoice amount must be a non-negative number.');
  }
  if (patch.amountPaid !== undefined && (!Number.isFinite(patch.amountPaid) || patch.amountPaid < 0)) {
    throw new Error('Amount paid must be a non-negative number.');
  }
  if (patch.issuedDate !== undefined && !patch.issuedDate) {
    throw new Error('Issued date is required.');
  }
  if (patch.dueDate !== undefined && !patch.dueDate) {
    throw new Error('Due date is required.');
  }
}

function validateInvoice(input: Omit<AdminInvoice, 'id'>) {
  validateInvoicePatch(input);
  if (!input.clientName.trim()) throw new Error('Client name is required.');
  if (!input.projectId.trim()) throw new Error('Project is required.');
  if (input.dueDate < input.issuedDate) throw new Error('Due date cannot be earlier than issued date.');
  if (input.amountPaid > input.amount) throw new Error('Amount paid cannot exceed invoice amount.');
}

function validateExpense(input: Omit<ProjectExpense, 'id'>) {
  if (!input.projectId.trim()) throw new Error('Project is required.');
  if (!input.label.trim()) throw new Error('Expense label is required.');
  if (!Number.isFinite(input.amount) || input.amount < 0) throw new Error('Expense amount must be non-negative.');
  if (!input.date) throw new Error('Expense date is required.');
}

function monthLabel(monthIndex: number) {
  return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][monthIndex]!;
}

function calculateMonthlyRevenue(invoices: AdminInvoice[], now: Date): Array<{ name: string; revenue: number }> {
  const currentMonthIndex = now.getMonth();
  const monthIndexes = Array.from({ length: 6 }, (_, idx) => {
    const monthIndex = currentMonthIndex - (5 - idx);
    return (monthIndex + 12) % 12;
  });
  const totalsByMonth = new Map<number, number>();
  for (const monthIndex of monthIndexes) totalsByMonth.set(monthIndex, 0);
  for (const invoice of invoices) {
    if (!invoice.issuedDate) continue;
    const issuedAt = new Date(`${invoice.issuedDate}T00:00:00`);
    if (Number.isNaN(issuedAt.getTime())) continue;
    const monthIndex = issuedAt.getMonth();
    if (!totalsByMonth.has(monthIndex)) continue;
    totalsByMonth.set(monthIndex, (totalsByMonth.get(monthIndex) || 0) + invoice.amountPaid);
  }
  return monthIndexes.map((monthIndex) => ({
    name: monthLabel(monthIndex),
    revenue: totalsByMonth.get(monthIndex) || 0,
  }));
}

const firestoreFinanceRepository: FinanceRepository = {
  listInvoices() {
    return getHqInvoiceDirectory().map((invoice) => ({ ...invoice, status: coerceInvoiceStatus(invoice) }));
  },
  listInvoicesByProject(projectId) {
    return this.listInvoices().filter((invoice) => invoice.projectId === projectId);
  },
  listProposals() {
    return getHqProposalDirectory().map((item) => ({
      ...item,
      lineItems: item.lineItems.map((lineItem) => ({ ...lineItem })),
    }));
  },
  getProposalByProject(projectId) {
    return this.listProposals().find((proposal) => proposal.projectId === projectId);
  },
  listExpensesByProject(projectId) {
    return getHqExpenseDirectory().filter((expense) => expense.projectId === projectId);
  },
  createInvoice(input) {
    validateInvoice(input);
    const invoice: AdminInvoice = {
      ...input,
      id: `INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 900 + 100)}`,
      lockStatus: input.lockStatus || 'unlocked',
      lockedAt: input.lockStatus === 'locked' ? new Date().toISOString() : undefined,
      lockedBy: input.lockStatus === 'locked' ? 'system' : undefined,
    };
    void hqUpsertInvoice(getHqTenantForWrites(), invoice).catch((err) => console.error('[hq] createInvoice', err));
    return invoice;
  },
  updateInvoice(id, patch) {
    validateInvoicePatch(patch);
    const invoice = getHqInvoiceDirectory().find((item) => item.id === id);
    if (!invoice) return { ok: false };
    if (
      invoice.lockStatus === 'locked' &&
      (patch.amount !== undefined ||
        patch.amountPaid !== undefined ||
        patch.issuedDate !== undefined ||
        patch.dueDate !== undefined ||
        patch.projectId !== undefined ||
        patch.clientName !== undefined ||
        patch.attachmentAssetIds !== undefined)
    ) {
      throw new Error('Invoice is locked. Only status can be updated unless an admin override unlocks it.');
    }
    const merged: AdminInvoice = { ...invoice, ...patch };
    if (merged.dueDate < merged.issuedDate) throw new Error('Due date cannot be earlier than issued date.');
    if (merged.amountPaid > merged.amount) throw new Error('Amount paid cannot exceed invoice amount.');
    const next = { ...merged, status: coerceInvoiceStatus(merged) };
    void hqUpsertInvoice(getHqTenantForWrites(), next).catch((err) => console.error('[hq] updateInvoice', err));
    return { ok: true };
  },
  setInvoiceLockStatus(id, lockStatus, actor = 'system') {
    const invoice = getHqInvoiceDirectory().find((item) => item.id === id);
    if (!invoice) return { ok: false };
    const next: AdminInvoice = {
      ...invoice,
      lockStatus,
      lockedAt: lockStatus === 'locked' ? new Date().toISOString() : undefined,
      lockedBy: lockStatus === 'locked' ? actor : undefined,
    };
    void hqUpsertInvoice(getHqTenantForWrites(), next).catch((err) => console.error('[hq] setInvoiceLockStatus', err));
    return { ok: true };
  },
  createExpense(input) {
    validateExpense(input);
    const expense: ProjectExpense = {
      ...input,
      id: `e-${Date.now()}`,
    };
    void hqUpsertExpense(getHqTenantForWrites(), expense).catch((err) => console.error('[hq] createExpense', err));
    return expense;
  },
  getMetrics(now = new Date()) {
    const invoices = this.listInvoices();
    const openInvoices = invoices.filter((invoice) => invoice.status !== 'paid' && invoice.status !== 'void');
    const openArTotal = openInvoices.reduce((sum, invoice) => sum + (invoice.amount - invoice.amountPaid), 0);
    const overdueInvoices = invoices.filter((invoice) => invoice.status === 'overdue');
    const currentYear = now.getFullYear();
    const revenueYtd = invoices.reduce((sum, invoice) => {
      const issuedAt = new Date(`${invoice.issuedDate}T00:00:00`);
      if (Number.isNaN(issuedAt.getTime())) return sum;
      if (issuedAt.getFullYear() !== currentYear) return sum;
      return sum + invoice.amountPaid;
    }, 0);
    return {
      openArTotal,
      outstandingInvoiceCount: openInvoices.length,
      overdueInvoiceCount: overdueInvoices.length,
      overdueInvoices,
      revenueYtd,
      monthlyRevenue: calculateMonthlyRevenue(invoices, now),
    };
  },
};

export function getFinanceRepository(): FinanceRepository {
  return firestoreFinanceRepository;
}

export function resetFinanceStoreForTests() {
  /* Firestore-backed finance has no localStorage store; tests rely on `resetHqSyncDirectoryForTests`. */
}
