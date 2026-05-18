const QUICK_ADD_SUFFIX = '@quick-add.local';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** True when email is a real address we can use for Square directory sync (not quick-add synthetic). */
export function isSyncableEmail(email) {
  if (typeof email !== 'string') return false;
  const n = email.trim().toLowerCase();
  if (!n || n.endsWith(QUICK_ADD_SUFFIX)) return false;
  return EMAIL_RE.test(n);
}

/** @param {Record<string, unknown>} data */
export function clientHasSyncableEmail(data) {
  const keys = ['billingEmail', 'email', 'contactEmail'];
  for (const k of keys) {
    const v = data[k];
    if (typeof v === 'string' && isSyncableEmail(v)) return true;
  }
  const contact = data.contact;
  if (contact && typeof contact === 'object') {
    const nested = contact.email;
    if (typeof nested === 'string' && isSyncableEmail(nested)) return true;
  }
  return false;
}
