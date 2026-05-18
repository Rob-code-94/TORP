/** @param {string | null | undefined} status */
export function squareInvoiceStatusLabel(status) {
  const s = (status ?? '').toUpperCase();
  switch (s) {
    case 'PAID':
      return 'Paid';
    case 'PARTIALLY_PAID':
      return 'Partially paid';
    case 'UNPAID':
      return 'Unpaid';
    case 'SCHEDULED':
      return 'Scheduled';
    case 'PAYMENT_PENDING':
      return 'Payment pending';
    case 'CANCELED':
    case 'CANCELLED':
      return 'Canceled';
    case 'DRAFT':
      return 'Draft';
    default:
      return s ? s.replace(/_/g, ' ').toLowerCase() : '—';
  }
}

/** @param {string | null | undefined} status */
export function isSquareInvoiceComplete(status) {
  const s = (status ?? '').toUpperCase();
  return s === 'PAID' || s === 'PARTIALLY_REFUNDED' || s === 'REFUNDED';
}
