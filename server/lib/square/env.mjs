import { SquareEnvironment } from 'square';

export function getSquareAccessToken() {
  const t = process.env.SQUARE_ACCESS_TOKEN?.trim();
  return t || null;
}

export function getSquareLocationId() {
  const id = process.env.SQUARE_LOCATION_ID?.trim();
  return id || null;
}

export function getSquareWebhookSignatureKey() {
  const k = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY?.trim();
  return k || null;
}

/** Must match the exact notification URL configured in Square Developer → Webhooks. */
export function getSquareWebhookNotificationUrl() {
  const u = process.env.SQUARE_WEBHOOK_NOTIFICATION_URL?.trim();
  return u || null;
}

export function resolveSquareEnvironment() {
  const raw = process.env.SQUARE_ENVIRONMENT?.trim().toLowerCase();
  if (raw === 'sandbox') return SquareEnvironment.Sandbox;
  return SquareEnvironment.Production;
}

export function getSquareEnvironmentLabel() {
  return process.env.SQUARE_ENVIRONMENT?.trim().toLowerCase() || 'production';
}
