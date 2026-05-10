import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../lib/firebase', () => ({
  isFirebaseConfigured: vi.fn(() => true),
}));

vi.mock('../data/hqWriteContext', () => ({
  getHqTenantForWrites: () => null,
}));

import { isFirebaseConfigured } from '../lib/firebase';
import { createCrewMemberProfile } from '../data/hqCrewCrud';
import { getHqCrewDirectory, resetHqSyncDirectoryForTests } from '../data/hqSyncDirectory';

describe('createCrewMemberProfile', () => {
  beforeEach(() => {
    resetHqSyncDirectoryForTests();
    vi.mocked(isFirebaseConfigured).mockReturnValue(true);
  });

  it('returns not ok and leaves directory unchanged when tenant scope is missing (Firebase on)', async () => {
    const beforeLen = getHqCrewDirectory().length;
    const result = await createCrewMemberProfile({
      displayName: 'Test User',
      role: 'other',
      email: 'test-crew-crud@example.com',
      rateShootHour: 1,
      rateEditHour: 1,
    });
    if (!result.ok) {
      expect(result.error).toMatch(/tenant/i);
    } else {
      throw new Error('expected failure');
    }
    expect(getHqCrewDirectory().length).toBe(beforeLen);
  });

  it('updates in-memory directory when Firebase is not configured', async () => {
    vi.mocked(isFirebaseConfigured).mockReturnValue(false);
    const result = await createCrewMemberProfile({
      displayName: 'Local Only',
      role: 'other',
      email: 'local-only@example.com',
      rateShootHour: 0,
      rateEditHour: 0,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected success');
    expect(getHqCrewDirectory().some((c) => c.id === result.crew.id)).toBe(true);
  });
});
