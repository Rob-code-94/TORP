import { describe, expect, it } from 'vitest';
import { formatHqOrgAggregatedListenerError, formatHqOrgFirestoreError } from './formatHqOrgFirestoreError';

describe('formatHqOrgFirestoreError', () => {
  it('explains permission-denied with optional collection', () => {
    const msg = formatHqOrgFirestoreError({ code: 'permission-denied' }, 'crew');
    expect(msg).toMatch(/Firestore denied/i);
    expect(msg).toMatch(/crew/i);
    expect(msg).toMatch(/tenantId/i);
  });

  it('mentions indexes for failed-precondition', () => {
    const msg = formatHqOrgFirestoreError({ code: 'failed-precondition' });
    expect(msg).toMatch(/index/i);
  });
});

describe('formatHqOrgAggregatedListenerError', () => {
  it('lists all collections and explains parallel listeners', () => {
    const msg = formatHqOrgAggregatedListenerError(['shoots', 'crew'], { code: 'permission-denied' });
    expect(msg).toMatch(/Affected HQ collections:/);
    expect(msg).toMatch(/crew/);
    expect(msg).toMatch(/shoots/);
    expect(msg).toMatch(/parallel/);
    expect(msg).toMatch(/Firestore denied/i);
  });
});
