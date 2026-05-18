/** Human-readable label for Square invoice status strings. */
export function squareInvoiceStatusLabel(status?: string | null): string {
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

export function isSquareInvoiceComplete(status?: string | null): boolean {
  const s = (status ?? '').toUpperCase();
  return s === 'PAID' || s === 'PARTIALLY_REFUNDED' || s === 'REFUNDED';
}
