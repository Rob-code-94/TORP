const OPEN_STATUSES = new Set([
  'UNPAID',
  'SCHEDULED',
  'PARTIALLY_PAID',
  'PAYMENT_PENDING',
]);

export function moneyToNumber(m) {
  if (m == null || m.amount == null) return 0;
  const a = typeof m.amount === 'bigint' ? Number(m.amount) : Number(m.amount);
  if (!Number.isFinite(a)) return 0;
  return a / 100;
}

function earliestDueDate(inv) {
  const prs = inv.paymentRequests;
  if (!prs?.length) return null;
  const dates = prs.map((p) => p.dueDate).filter(Boolean);
  if (!dates.length) return null;
  return dates.sort()[0];
}

function invoiceComputedTotal(inv) {
  const prs = inv.paymentRequests;
  if (!prs?.length) return moneyToNumber(inv.nextPaymentAmountMoney);
  return prs.reduce((s, pr) => s + moneyToNumber(pr.computedAmountMoney), 0);
}

function pickPrimaryInvoice(invoices) {
  const open = invoices.filter((i) => i.status && OPEN_STATUSES.has(i.status));
  if (open.length) {
    return [...open].sort((a, b) => {
      const da = earliestDueDate(a) ?? '9999-12-31';
      const db = earliestDueDate(b) ?? '9999-12-31';
      return da.localeCompare(db);
    })[0];
  }
  const paidLike = invoices.filter((i) =>
    ['PAID', 'PARTIALLY_REFUNDED', 'REFUNDED'].includes(i.status ?? ''),
  );
  if (paidLike.length) {
    return [...paidLike].sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''))[0];
  }
  return [...invoices].sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''))[0];
}

export function deriveBillingFromSquareData(invoices, paymentsForCustomer) {
  const open = invoices.filter((i) => i.status && OPEN_STATUSES.has(i.status));
  const balance = open.reduce((s, i) => s + moneyToNumber(i.nextPaymentAmountMoney), 0);

  const primary = pickPrimaryInvoice(invoices);
  const totalAmount = primary ? invoiceComputedTotal(primary) : balance;

  const completed = paymentsForCustomer
    .filter((p) => p.status === 'COMPLETED')
    .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
  const lastPay = completed[0];
  let lastPaymentDate;
  if (lastPay?.createdAt) {
    lastPaymentDate = lastPay.createdAt.slice(0, 10);
  }

  const dueDate = primary ? earliestDueDate(primary) ?? undefined : undefined;

  return {
    balance,
    totalAmount: totalAmount || balance,
    lastPaymentAmount: lastPay ? moneyToNumber(lastPay.amountMoney) : undefined,
    lastPaymentDate,
    dueDate: dueDate ?? undefined,
    invoiceNumber: primary?.invoiceNumber ?? undefined,
    invoiceUrl: primary?.publicUrl ?? undefined,
    status: primary?.status ?? (open.length ? 'UNPAID' : 'PAID'),
    squareInvoiceId: primary?.id ?? undefined,
    squareLastSyncedAt: new Date().toISOString(),
  };
}

export function customerIdFromInvoice(inv) {
  const id = inv.primaryRecipient?.customerId;
  return typeof id === 'string' && id.length ? id : null;
}
