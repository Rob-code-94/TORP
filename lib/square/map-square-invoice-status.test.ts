import { describe, expect, it } from 'vitest';
import { isSquareInvoiceComplete, squareInvoiceStatusLabel } from './map-square-invoice-status';

describe('squareInvoiceStatusLabel', () => {
  it('maps PAID', () => {
    expect(squareInvoiceStatusLabel('PAID')).toBe('Paid');
  });

  it('maps unknown to readable text', () => {
    expect(squareInvoiceStatusLabel('PAYMENT_PENDING')).toBe('Payment pending');
  });
});

describe('isSquareInvoiceComplete', () => {
  it('is true for PAID', () => {
    expect(isSquareInvoiceComplete('PAID')).toBe(true);
  });

  it('is false for UNPAID', () => {
    expect(isSquareInvoiceComplete('UNPAID')).toBe(false);
  });
});
