export type FirestoreListContext = 'showcase' | 'portfolio';

function errorCode(err: unknown): string | undefined {
  if (err && typeof err === 'object' && 'code' in err) {
    const c = (err as { code?: unknown }).code;
    if (typeof c === 'string') return c;
  }
  return undefined;
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return '';
}

/**
 * User-facing message when Firestore list/query fails in HQ marketing panels.
 */
export function formatFirestoreListError(err: unknown, context: FirestoreListContext): string {
  const code = errorCode(err);
  const msg = errorMessage(err);
  const permissionLike =
    code === 'permission-denied' || code === 'functions/permission-denied' || /insufficient permissions/i.test(msg);

  if (permissionLike) {
    const label = context === 'showcase' ? 'Showcase reel' : 'Landing portfolio';
    return `${label}: Firestore denied this request (permission denied). Deploy the repo's latest firestore.rules (npm run deploy:rules), confirm VITE_FIREBASE_PROJECT_ID matches the Firebase project you opened in the console, and verify rules include public read for tenants/{tenantId}/showcase and tenants/{tenantId}/portfolioProjects.`;
  }
  if (code === 'unavailable' || /network|offline|Failed to fetch/i.test(msg)) {
    return 'Could not reach Firestore. Check your network and try again.';
  }
  if (msg) return msg;
  return 'Could not load data.';
}
