import { randomUUID } from 'node:crypto';
import { moneyToNumber } from './billing-merge.mjs';

/**
 * @param {import('square').SquareClient} square
 * @param {{ locationId: string; squareCustomerId: string; lineItems: { label: string; amount: number }[]; dueDate?: string; memo?: string }} input
 */
export async function createSquareInvoiceDraft(square, input) {
  const { locationId, squareCustomerId, lineItems, dueDate, memo } = input;
  if (!lineItems.length) {
    throw new Error('At least one line item is required.');
  }

  const orderRes = await square.orders.create({
    idempotencyKey: randomUUID(),
    order: {
      locationId,
      customerId: squareCustomerId,
      lineItems: lineItems.map((li) => ({
        name: String(li.label || 'Line item').slice(0, 512),
        quantity: '1',
        basePriceMoney: {
          amount: BigInt(Math.round(Number(li.amount) * 100)),
          currency: 'USD',
        },
      })),
    },
  });

  if (orderRes.errors?.length) {
    throw new Error(orderRes.errors.map((e) => e.detail ?? e.code).join('; '));
  }
  const orderId = orderRes.order?.id;
  if (!orderId) throw new Error('Square order create returned no id');

  const invRes = await square.invoices.create({
    idempotencyKey: randomUUID(),
    invoice: {
      locationId,
      orderId,
      primaryRecipient: { customerId: squareCustomerId },
      deliveryMethod: 'EMAIL',
      paymentRequests: [
        {
          requestType: 'BALANCE',
          dueDate: dueDate || undefined,
          tippingEnabled: false,
          automaticPaymentSource: 'NONE',
        },
      ],
      ...(memo ? { description: String(memo).slice(0, 1000) } : {}),
    },
  });

  if (invRes.errors?.length) {
    throw new Error(invRes.errors.map((e) => e.detail ?? e.code).join('; '));
  }
  const invoice = invRes.invoice;
  if (!invoice?.id) throw new Error('Square invoice create returned no id');
  return invoice;
}

/**
 * @param {import('square').SquareClient} square
 * @param {string} invoiceId
 * @param {number | bigint} version
 */
export async function publishSquareInvoice(square, invoiceId, version) {
  const pubRes = await square.invoices.publish({
    invoiceId,
    version,
    idempotencyKey: randomUUID(),
  });
  if (pubRes.errors?.length) {
    throw new Error(pubRes.errors.map((e) => e.detail ?? e.code).join('; '));
  }
  const invoice = pubRes.invoice;
  if (!invoice) throw new Error('Square publish returned no invoice');
  return invoice;
}

/**
 * @param {import('square').SquareClient} square
 * @param {string} invoiceId
 */
export async function getSquareInvoice(square, invoiceId) {
  const res = await square.invoices.get({ invoiceId });
  if (res.errors?.length) {
    throw new Error(res.errors.map((e) => e.detail ?? e.code).join('; '));
  }
  return res.invoice ?? null;
}

/** @param {Record<string, unknown>} invoice */
export function squareInvoiceToBillingPatch(invoice) {
  const prs = invoice.paymentRequests;
  let dueDate;
  if (Array.isArray(prs) && prs[0] && typeof prs[0] === 'object' && prs[0].dueDate) {
    dueDate = String(prs[0].dueDate);
  }
  const total =
    Array.isArray(prs) && prs.length
      ? prs.reduce((s, pr) => s + moneyToNumber(pr.computedAmountMoney), 0)
      : moneyToNumber(invoice.nextPaymentAmountMoney);

  return {
    balance: moneyToNumber(invoice.nextPaymentAmountMoney) || total,
    totalAmount: total,
    dueDate: dueDate ?? undefined,
    invoiceNumber: invoice.invoiceNumber ?? undefined,
    invoiceUrl: invoice.publicUrl ?? undefined,
    status: invoice.status ?? undefined,
    squareInvoiceId: invoice.id ?? undefined,
    squareLastSyncedAt: new Date().toISOString(),
  };
}
