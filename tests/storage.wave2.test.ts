import { describe, expect, it } from 'vitest';
import { createDefaultStoragePolicy, canIssueDeliveryLinkByPolicy } from '../lib/storagePolicy';
import { getFinanceRepository, resetFinanceStoreForTests } from '../data/financeRepository';
import { UserRole } from '../types';

describe('Wave 2 storage policy', () => {
  it('enforces role-based delivery issuance defaults', () => {
    const policy = createDefaultStoragePolicy('test');
    expect(canIssueDeliveryLinkByPolicy(policy, UserRole.ADMIN)).toBe(true);
    expect(canIssueDeliveryLinkByPolicy(policy, UserRole.PROJECT_MANAGER)).toBe(true);
    expect(canIssueDeliveryLinkByPolicy(policy, UserRole.STAFF)).toBe(false);
    expect(canIssueDeliveryLinkByPolicy(policy, UserRole.CLIENT)).toBe(false);
  });
});

describe('Wave 2 finance locking', () => {
  it('blocks protected field updates while locked', () => {
    resetFinanceStoreForTests();
    const repo = getFinanceRepository();
    const invoice = repo.createInvoice({
      projectId: 'p1',
      clientName: 'Nike',
      amount: 1000,
      amountPaid: 0,
      status: 'draft',
      issuedDate: '2026-04-01',
      dueDate: '2026-04-15',
      lockStatus: 'unlocked',
    });

    expect(repo.setInvoiceLockStatus(invoice.id, 'locked', 'admin').ok).toBe(true);
    expect(() => repo.updateInvoice(invoice.id, { amount: 2000 })).toThrowError(
      'Invoice is locked. Only status can be updated unless an admin override unlocks it.'
    );
    expect(repo.updateInvoice(invoice.id, { status: 'sent' }).ok).toBe(true);
  });
});
