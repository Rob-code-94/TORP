import { describe, expect, it } from 'vitest';
import { formatFirestoreListError } from './formatFirestoreListError';

describe('formatFirestoreListError', () => {
  it('maps permission-denied to actionable copy', () => {
    const s = formatFirestoreListError({ code: 'permission-denied', message: 'Missing or insufficient permissions.' }, 'showcase');
    expect(s).toContain('Deploy');
    expect(s).toContain('showcase');
    expect(s).not.toMatch(/^Missing or insufficient permissions/);
  });

  it('handles portfolio context label', () => {
    const s = formatFirestoreListError({ code: 'permission-denied' }, 'portfolio');
    expect(s).toContain('Landing portfolio');
    expect(s).toContain('portfolioProjects');
  });

  it('passes through unknown errors with message', () => {
    expect(formatFirestoreListError(new Error('Custom failure'), 'showcase')).toContain('Custom failure');
  });

  it('handles unavailable', () => {
    expect(formatFirestoreListError({ code: 'unavailable' }, 'portfolio')).toMatch(/reach Firestore/i);
  });
});
