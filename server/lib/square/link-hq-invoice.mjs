import { FieldValue } from 'firebase-admin/firestore';

/**
 * @param {import('firebase-admin/firestore').Firestore} db
 * @param {{ tenantId: string; projectId: string; clientName: string; squareInvoice: Record<string, unknown>; existingInvoiceId?: string }} input
 */
export async function upsertHqInvoiceFromSquare(db, input) {
  const { tenantId, projectId, clientName, squareInvoice, existingInvoiceId } = input;
  const squareInvoiceId = typeof squareInvoice.id === 'string' ? squareInvoice.id : '';
  const publicUrl = typeof squareInvoice.publicUrl === 'string' ? squareInvoice.publicUrl : undefined;
  const status = typeof squareInvoice.status === 'string' ? squareInvoice.status : 'DRAFT';

  let amount = 0;
  const prs = squareInvoice.paymentRequests;
  if (Array.isArray(prs)) {
    for (const pr of prs) {
      if (pr && typeof pr === 'object' && pr.computedAmountMoney) {
        const a = pr.computedAmountMoney.amount;
        const n = typeof a === 'bigint' ? Number(a) : Number(a);
        if (Number.isFinite(n)) amount += n / 100;
      }
    }
  }

  let dueDate = new Date().toISOString().slice(0, 10);
  if (Array.isArray(prs) && prs[0]?.dueDate) {
    dueDate = String(prs[0].dueDate).slice(0, 10);
  }

  const issuedDate = new Date().toISOString().slice(0, 10);
  const torpStatus =
    status === 'PAID' ? 'paid' : status === 'DRAFT' ? 'draft' : 'sent';

  const id =
    existingInvoiceId ||
    `SQ-${squareInvoice.invoiceNumber || squareInvoiceId.slice(-8) || Date.now()}`;

  const row = {
    tenantId,
    projectId,
    clientName,
    amount,
    amountPaid: torpStatus === 'paid' ? amount : 0,
    issuedDate,
    dueDate,
    status: torpStatus,
    lockStatus: 'unlocked',
    squareInvoiceId,
    squareInvoiceUrl: publicUrl,
    squareInvoiceStatus: status,
    source: 'square',
    updatedAt: FieldValue.serverTimestamp(),
  };

  await db.collection('hqInvoices').doc(id).set(row, { merge: true });
  return { id, ...row };
}
