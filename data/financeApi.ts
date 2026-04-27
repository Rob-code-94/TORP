import type { AdminInvoice, AdminProposal, ProjectExpense } from '../types';
import { getFinanceRepository } from './financeRepository';

export function listInvoices(): AdminInvoice[] {
  return getFinanceRepository().listInvoices();
}

export function getInvoicesByProject(projectId: string): AdminInvoice[] {
  return getFinanceRepository().listInvoicesByProject(projectId);
}

export function listProposals(): AdminProposal[] {
  return getFinanceRepository().listProposals();
}

export function getProposalByProject(projectId: string): AdminProposal | undefined {
  return getFinanceRepository().getProposalByProject(projectId);
}

export function getExpensesByProject(projectId: string): ProjectExpense[] {
  return getFinanceRepository().listExpensesByProject(projectId);
}

export function createExpense(input: Omit<ProjectExpense, 'id'>, _actorName?: string): ProjectExpense {
  return getFinanceRepository().createExpense(input);
}

export function createInvoice(input: Omit<AdminInvoice, 'id'>, _actorName?: string): AdminInvoice {
  return getFinanceRepository().createInvoice(input);
}

export function updateInvoice(
  id: string,
  patch: Partial<AdminInvoice>,
  _actorName?: string
): { ok: boolean } {
  return getFinanceRepository().updateInvoice(id, patch);
}

export function setInvoiceLockStatus(id: string, lockStatus: 'locked' | 'unlocked', _actorName?: string): { ok: boolean } {
  return getFinanceRepository().setInvoiceLockStatus(id, lockStatus, _actorName);
}

export function getFinanceDashboardMetrics() {
  return getFinanceRepository().getMetrics();
}
