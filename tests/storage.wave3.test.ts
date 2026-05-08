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
    const taskId = 't-wave3';
    const projectId = 'p-wave3';
    const assetId = 'a-wave3';
    MOCK_PLANNER.unshift({
      id: taskId,
      projectId,
      projectTitle: 'Wave 3',
      title: 'Task',
      status: 'todo',
      dueDate: '2026-05-07',
      priority: 'normal',
      assigneeCrewId: 'cr-6',
      assigneeName: 'Jayden Price',
      done: false,
      attachmentAssetIds: [],
    });
    MOCK_ASSETS.unshift({
      id: assetId,
      projectId,
      projectTitle: 'Wave 3',
      label: 'Asset',
      type: 'video',
      sourceType: 'internal',
      sourceRef: 'local',
      version: 1,
      status: 'internal_review',
      signedUrl: null,
      signedUrlExpiresAt: null,
      uploadedBy: 'tester',
      uploadedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      usageRights: 'owned',
      storagePath: null,
      storageBucket: null,
      storageDownloadUrl: null,
      metadata: {},
    });
    const task = MOCK_PLANNER.find((item) => item.id === taskId)!;
    const asset = MOCK_ASSETS.find((item) => item.id === assetId)!;
    const attach = attachAssetToPlannerItem(task.id, asset.id, 'tester');
    expect(attach.ok).toBe(true);
    expect(MOCK_PLANNER.find((item) => item.id === task.id)?.attachmentAssetIds || []).toContain(asset.id);

    const detach = removeAssetFromPlannerItem(task.id, asset.id, 'tester');
    expect(detach.ok).toBe(true);
    expect(MOCK_PLANNER.find((item) => item.id === task.id)?.attachmentAssetIds || []).not.toContain(asset.id);
    MOCK_PLANNER.splice(MOCK_PLANNER.findIndex((item) => item.id === taskId), 1);
    MOCK_ASSETS.splice(MOCK_ASSETS.findIndex((item) => item.id === assetId), 1);
  });
});

describe('Wave 3 crew media rights', () => {
  it('stores crew media policy with expiration metadata', () => {
    const crew = MOCK_CREW.find((item) => item.id === 'cr-6')!;
    const assetId = 'a-wave3-policy';
    MOCK_ASSETS.unshift({
      id: assetId,
      projectId: 'p-wave3-policy',
      projectTitle: 'Wave 3 Policy',
      label: 'Policy asset',
      type: 'video',
      sourceType: 'internal',
      sourceRef: 'local',
      version: 1,
      status: 'internal_review',
      signedUrl: null,
      signedUrlExpiresAt: null,
      uploadedBy: 'tester',
      uploadedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      usageRights: 'owned',
      storagePath: null,
      storageBucket: null,
      storageDownloadUrl: null,
      metadata: {},
    });
    const asset = MOCK_ASSETS.find((item) => item.id === assetId)!;
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
    MOCK_ASSETS.splice(MOCK_ASSETS.findIndex((item) => item.id === assetId), 1);
  });
});

describe('Wave 3 storage ops actions', () => {
  it('records retry and revoke actions', () => {
    const source = {
      id: 'ops-wave3-source',
      eventType: 'upload_failed' as const,
      assetId: 'a-wave3-ops',
      actorName: 'tester',
      tenantId: 'torp-default',
      timestamp: new Date().toISOString(),
      errorCode: 'network-timeout',
      details: 'Synthetic source event',
    };
    MOCK_STORAGE_OPS_EVENTS.unshift(source);
    const before = MOCK_STORAGE_OPS_EVENTS.length;
    expect(retryStorageOperation(source.id, 'admin').ok).toBe(true);
    expect(revokeStorageOpsLink(source.id, 'admin').ok).toBe(true);
    expect(MOCK_STORAGE_OPS_EVENTS.length).toBeGreaterThan(before);
    expect(MOCK_STORAGE_OPS_EVENTS[0]?.eventType).toBe('link_revoked');
  });
});
