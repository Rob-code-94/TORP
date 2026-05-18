import type { AdminInvoice, ClientBilling, ProposalContractStatus } from '../../types';
import { isSquareInvoiceComplete, squareInvoiceStatusLabel } from './map-square-invoice-status';

export function torpInvoicesAllPaid(invoices: AdminInvoice[]): boolean {
  if (invoices.length === 0) return false;
  return invoices.every((i) => i.status === 'paid' || i.status === 'void');
}

export function torpInvoicesOpenTotal(invoices: AdminInvoice[]): number {
  return invoices.reduce((s, i) => {
    if (i.status === 'paid' || i.status === 'void') return s;
    return s + Math.max(0, i.amount - i.amountPaid);
  }, 0);
}

export function squareBillingSummary(billing?: ClientBilling) {
  if (!billing) return null;
  const complete = isSquareInvoiceComplete(billing.status);
  return {
    balance: billing.balance ?? 0,
    status: billing.status,
    statusLabel: squareInvoiceStatusLabel(billing.status),
    dueDate: billing.dueDate,
    invoiceUrl: billing.invoiceUrl,
    invoiceNumber: billing.invoiceNumber,
    squareInvoiceId: billing.squareInvoiceId,
    complete,
  };
}

export function proposalIsComplete(status?: ProposalContractStatus): boolean {
  return status === 'signed';
}

export type BillingCompletionItem = {
  id: string;
  label: string;
  done: boolean;
  detail?: string;
};

export function buildBillingCompletionChecklist(input: {
  proposalStatus?: ProposalContractStatus;
  contractSigned?: boolean;
  billing?: ClientBilling;
  torpInvoices: AdminInvoice[];
}): BillingCompletionItem[] {
  const sq = squareBillingSummary(input.billing);
  return [
    {
      id: 'proposal',
      label: 'TORP proposal signed',
      done: proposalIsComplete(input.proposalStatus),
      detail: input.proposalStatus ?? 'No proposal',
    },
    {
      id: 'crm_contract',
      label: 'CRM contract signed',
      done: Boolean(input.contractSigned),
    },
    {
      id: 'square_invoice',
      label: 'Square invoice paid',
      done: Boolean(sq?.complete),
      detail: sq?.statusLabel,
    },
    {
      id: 'torp_invoices',
      label: 'TORP project invoices paid',
      done: torpInvoicesAllPaid(input.torpInvoices),
      detail:
        input.torpInvoices.length === 0
          ? 'No TORP invoices'
          : `${input.torpInvoices.filter((i) => i.status === 'paid').length}/${input.torpInvoices.length} paid`,
    },
  ];
}
