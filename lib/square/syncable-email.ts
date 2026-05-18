/** Matches synthetic quick-add emails in `data/hqClientCrud.ts`. */
export const QUICK_ADD_EMAIL_SUFFIX = '@quick-add.local';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isSyncableEmailForSquare(email: string | undefined | null): boolean {
  if (!email || typeof email !== 'string') return false;
  const n = email.trim().toLowerCase();
  if (!n || n.endsWith(QUICK_ADD_EMAIL_SUFFIX)) return false;
  return EMAIL_RE.test(n);
}

export function clientHasSyncableEmailForSquare(client: {
  email?: string;
  billingEmail?: string;
}): boolean {
  return isSyncableEmailForSquare(client.email) || isSyncableEmailForSquare(client.billingEmail);
}
