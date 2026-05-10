/** User-facing messages when HQ org Firestore listeners fail (`subscribeHqOrgData`). */

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
 * Maps listener/query failures to actionable copy. Optional `collection` labels which HQ feed failed first.
 */
export function formatHqOrgFirestoreError(err: unknown, collection?: string): string {
  const code = errorCode(err);
  const msg = errorMessage(err);
  const suffix = collection ? ` — collection “${collection}”` : '';

  const permissionLike =
    code === 'permission-denied' ||
    code === 'functions/permission-denied' ||
    /insufficient permissions|permission/i.test(msg);

  if (permissionLike) {
    return `HQ data could not load${suffix}. Firestore denied the request. Deploy the repo’s latest firestore.rules (npm run deploy:rules), confirm VITE_FIREBASE_PROJECT_ID matches the Firebase project you opened in the console, and ensure your ID token’s tenantId matches each document’s tenantId field. Sign out and sign back in after changing claims.`;
  }

  if (code === 'failed-precondition' || /index/i.test(msg)) {
    return `HQ query needs a Firestore composite index${suffix}. Open the browser console for the Firebase index link, or deploy firestore.indexes.json.`;
  }

  if (code === 'unavailable' || /network|offline|Failed to fetch/i.test(msg)) {
    return 'Could not reach Firestore. Check your network and try again.';
  }

  if (msg) return `${msg}${suffix}`;
  return `Could not sync HQ data from Firestore${suffix}.`;
}

/**
 * Combines all listener failures into one message (same root cause is typical).
 * Uses the first error’s code/message for remediation text; lists every collection that reported an error.
 */
export function formatHqOrgAggregatedListenerError(collectionLabels: string[], sampleErr: unknown): string {
  const unique = [...new Set(collectionLabels)].filter(Boolean).sort();
  const list = unique.join(', ');
  const prefix =
    unique.length > 0
      ? `Affected HQ collections: ${list}. Listeners run in parallel—the name you saw before was only the first failure, not necessarily the only broken rule. `
      : '';
  return `${prefix}${formatHqOrgFirestoreError(sampleErr)}`;
}
