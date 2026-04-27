import { describe, expect, it } from 'vitest';
import {
  MOCK_STORAGE_OPS_EVENTS,
  attachAssetToPlannerItem,
  removeAssetFromPlannerItem,
  retryStorageOperation,
  revokeStorageOpsLink,
  upsertCrewMediaPolicy,
} from '../data/adminMock';
import { MOCK_PLANNER, MOCK_ASSETS, MOCK_CREW } from '../data/adminMock';

describe('Wave 3 planner attachments', () => {
  it('attaches and detaches planner asset references', () => {
    const task = MOCK_PLANNER[0]!;
    const asset = MOCK_ASSETS.find((item) => item.projectId === task.projectId)!;
    const attach = attachAssetToPlannerItem(task.id, asset.id, 'tester');
    expect(attach.ok).toBe(true);
    expect(MOCK_PLANNER.find((item) => item.id === task.id)?.attachmentAssetIds || []).toContain(asset.id);

    const detach = removeAssetFromPlannerItem(task.id, asset.id, 'tester');
    expect(detach.ok).toBe(true);
    expect(MOCK_PLANNER.find((item) => item.id === task.id)?.attachmentAssetIds || []).not.toContain(asset.id);
  });
});

describe('Wave 3 crew media rights', () => {
  it('stores crew media policy with expiration metadata', () => {
    const crew = MOCK_CREW[0]!;
    const asset = MOCK_ASSETS[0]!;
    const result = upsertCrewMediaPolicy(crew.id, {
      assetId: asset.id,
      visibility: 'client',
      usageRights: 'licensed',
      expiresAt: '2026-05-01',
    });
    expect(result.ok).toBe(true);
    const stored = MOCK_CREW.find((item) => item.id === crew.id)?.mediaPolicies?.find((item) => item.assetId === asset.id);
    expect(stored?.usageRights).toBe('licensed');
    expect(stored?.expiresAt).toBe('2026-05-01');
  });
});

describe('Wave 3 storage ops actions', () => {
  it('records retry and revoke actions', () => {
    const source = MOCK_STORAGE_OPS_EVENTS[0]!;
    const before = MOCK_STORAGE_OPS_EVENTS.length;
    expect(retryStorageOperation(source.id, 'admin').ok).toBe(true);
    expect(revokeStorageOpsLink(source.id, 'admin').ok).toBe(true);
    expect(MOCK_STORAGE_OPS_EVENTS.length).toBeGreaterThan(before);
    expect(MOCK_STORAGE_OPS_EVENTS[0]?.eventType).toBe('link_revoked');
  });
});
