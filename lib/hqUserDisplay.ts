import type { AuthUser } from './auth';

function firstLetterToken(token: string): string {
  const m = token.match(/[a-zA-Z]/i);
  return (m ? m[0] : token[0] || '').toUpperCase();
}

/** Two letters from display name or email local-part; never role abbreviations (no PM/AD). */
export function hqUserInitials(user: Pick<AuthUser, 'displayName' | 'email'> | null): string {
  if (!user) return '…';

  const displayName = user.displayName?.trim();
  if (displayName) {
    const parts = displayName.split(/\s+/).filter(Boolean);
    // Two+ tokens: first letter of first + first letter of last (e.g. Jayden Price -> JP, ROB R -> RR).
    if (parts.length >= 2) {
      return (firstLetterToken(parts[0]) + firstLetterToken(parts[parts.length - 1])).toUpperCase();
    }
    // Single token: first two letters/digits (e.g. Admin -> AD).
    const compact = displayName.replace(/[^a-zA-Z0-9]/g, '');
    if (compact.length >= 2) return compact.slice(0, 2).toUpperCase();
    if (compact.length === 1) return (compact[0] + compact[0]).toUpperCase();
  }

  const email = user.email?.trim().toLowerCase();
  if (email) {
    const local = email.split('@')[0] || email;
    const alnum = local.replace(/[^a-z0-9]/gi, '');
    if (alnum.length >= 2) return alnum.slice(0, 2).toUpperCase();
    if (alnum.length === 1) return (alnum[0] + alnum[0]).toUpperCase();
  }

  return 'HQ';
}

/** Greeting first name: first word of displayName; else title-cased first segment of email local-part; else "there". */
export function hqUserGreetingName(user: Pick<AuthUser, 'displayName' | 'email'> | null): string {
  if (!user) return 'there';

  const displayName = user.displayName?.trim();
  if (displayName) {
    const first = displayName.split(/\s+/).filter(Boolean)[0];
    if (first) return first;
  }

  const email = user.email?.trim().toLowerCase();
  if (email.includes('@')) {
    const local = email.split('@')[0] || '';
    const segment = (local.split(/[._-]/)[0] || local).replace(/[^a-z0-9]/gi, '');
    if (segment) return segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase();
  }

  return 'there';
}
