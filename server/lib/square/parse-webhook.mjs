export function parseSquareWebhookPayload(raw) {
  if (!raw || typeof raw !== 'object') {
    return { eventId: null, type: null, invoiceId: null, embeddedInvoice: null };
  }
  const b = raw;
  const eventId =
    (typeof b.event_id === 'string' && b.event_id) ||
    (typeof b.eventId === 'string' && b.eventId) ||
    null;
  const type = typeof b.type === 'string' ? b.type : null;
  const data = b.data;
  if (!data || typeof data !== 'object') {
    return { eventId, type, invoiceId: null, embeddedInvoice: null };
  }
  const d = data;
  const invoiceId =
    (typeof d.id === 'string' && d.id) ||
    (typeof d.invoice_id === 'string' && d.invoice_id) ||
    null;
  const obj = d.object;
  if (!obj || typeof obj !== 'object') {
    return { eventId, type, invoiceId, embeddedInvoice: null };
  }
  const o = obj;
  const inv = o.invoice ?? o['invoice'];
  return {
    eventId,
    type,
    invoiceId,
    embeddedInvoice: inv && typeof inv === 'object' ? inv : null,
  };
}
