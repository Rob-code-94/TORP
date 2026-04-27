import type {
  AdminInvoice,
  AdminInvoiceStatus,
  AdminProposal,
  FinancialLockStatus,
  ProjectExpense,
} from '../types';
import { MOCK_EXPENSES, MOCK_INVOICES_ADMIN, MOCK_PROPOSALS } from './adminMock';

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

interface FinanceStore {
  invoices: AdminInvoice[];
  proposals: AdminProposal[];
  expenses: ProjectExpense[];
}

const STORE_KEY = 'torp.finance.v1';
let memoryStore: FinanceStore | null = null;

function cloneStore(store: FinanceStore): FinanceStore {
  return {
    invoices: store.invoices.map((item) => ({ ...item })),
    proposals: store.proposals.map((item) => ({
      ...item,
      lineItems: item.lineItems.map((lineItem) => ({ ...lineItem })),
    })),
    expenses: store.expenses.map((item) => ({ ...item })),
  };
}

function createSeedStore(): FinanceStore {
  return {
    invoices: MOCK_INVOICES_ADMIN.map((item) => ({ ...item })),
    proposals: MOCK_PROPOSALS.map((item) => ({
      ...item,
      lineItems: item.lineItems.map((lineItem) => ({ ...lineItem })),
    })),
    expenses: MOCK_EXPENSES.map((item) => ({ ...item })),
  };
}

function parseStore(raw: string | null): FinanceStore | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as FinanceStore;
    if (!parsed || !Array.isArray(parsed.invoices) || !Array.isArray(parsed.proposals) || !Array.isArray(parsed.expenses)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function readStore(): FinanceStore {
  if (typeof window === 'undefined') {
    if (!memoryStore) memoryStore = createSeedStore();
    return cloneStore(memoryStore);
  }
  const parsed = parseStore(window.localStorage.getItem(STORE_KEY));
  if (parsed) return cloneStore(parsed);
  const seeded = createSeedStore();
  window.localStorage.setItem(STORE_KEY, JSON.stringify(seeded));
  return cloneStore(seeded);
}

function writeStore(store: FinanceStore) {
  memoryStore = cloneStore(store);
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORE_KEY, JSON.stringify(store));
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

function coerceInvoiceStatus(invoice: AdminInvoice): AdminInvoiceStatus {
  if (invoice.status === 'paid' || invoice.status === 'void') return invoice.status;
  const openAmount = invoice.amount - invoice.amountPaid;
  if (openAmount <= 0) return 'paid';
  if (invoice.amountPaid > 0) return 'partial';
  return invoice.status;
}

function calculateMonthlyRevenue(
  invoices: AdminInvoice[],
  now: Date
): Array<{ name: string; revenue: number }> {
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

const localFinanceRepository: FinanceRepository = {
  listInvoices() {
    const store = readStore();
    return store.invoices.map((invoice) => ({ ...invoice, status: coerceInvoiceStatus(invoice) }));
  },
  listInvoicesByProject(projectId) {
    return this.listInvoices().filter((invoice) => invoice.projectId === projectId);
  },
  listProposals() {
    const store = readStore();
    return store.proposals;
  },
  getProposalByProject(projectId) {
    return this.listProposals().find((proposal) => proposal.projectId === projectId);
  },
  listExpensesByProject(projectId) {
    const store = readStore();
    return store.expenses.filter((expense) => expense.projectId === projectId);
  },
  createInvoice(input) {
    validateInvoice(input);
    const store = readStore();
    const invoice: AdminInvoice = {
      ...input,
      id: `INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 900 + 100)}`,
      lockStatus: input.lockStatus || 'unlocked',
      lockedAt: input.lockStatus === 'locked' ? new Date().toISOString() : undefined,
      lockedBy: input.lockStatus === 'locked' ? 'system' : undefined,
    };
    store.invoices.unshift(invoice);
    writeStore(store);
    return invoice;
  },
  updateInvoice(id, patch) {
    validateInvoicePatch(patch);
    const store = readStore();
    const invoice = store.invoices.find((item) => item.id === id);
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
    Object.assign(invoice, merged, { status: coerceInvoiceStatus(merged) });
    writeStore(store);
    return { ok: true };
  },
  setInvoiceLockStatus(id, lockStatus, actor = 'system') {
    const store = readStore();
    const invoice = store.invoices.find((item) => item.id === id);
    if (!invoice) return { ok: false };
    invoice.lockStatus = lockStatus;
    invoice.lockedAt = lockStatus === 'locked' ? new Date().toISOString() : undefined;
    invoice.lockedBy = lockStatus === 'locked' ? actor : undefined;
    writeStore(store);
    return { ok: true };
  },
  createExpense(input) {
    validateExpense(input);
    const store = readStore();
    const expense: ProjectExpense = {
      ...input,
      id: `e-${Date.now()}`,
    };
    store.expenses.unshift(expense);
    writeStore(store);
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
  return localFinanceRepository;
}

export function resetFinanceStoreForTests() {
  memoryStore = null;
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(STORE_KEY);
  }
}
