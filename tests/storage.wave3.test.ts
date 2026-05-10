import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../lib/firebase', () => ({
  isFirebaseConfigured: () => false,
}));

import { attachAssetToPlannerItem, removeAssetFromPlannerItem } from '../data/hqPlannerCalendarOps';
import { retryStorageOperation, revokeStorageOpsLink } from '../data/hqStorageOps';
import { upsertCrewMediaPolicy } from '../data/hqCrewCrud';
import {
  resetHqSyncDirectoryForTests,
  setHqAssetDirectory,
  setHqCrewDirectory,
  setHqPlannerDirectory,
  setHqStorageOpsDirectory,
  getPlannerItemsSync,
  getAssetsSync,
  getHqCrewDirectory,
  getStorageOpsSync,
} from '../data/hqSyncDirectory';
import type { CrewProfile } from '../types';
import { UserRole } from '../types';

function minimalJayden(): CrewProfile {
  return {
    id: 'cr-6',
    displayName: 'Jayden Price',
    role: 'producer',
    systemRole: UserRole.ADMIN,
    email: 'jp@torp.life',
    phone: '',
    rateShootHour: 0,
    rateEditHour: 0,
    active: true,
    assignedProjectIds: [],
    availability: '',
    availabilityDetail: {
      timezone: 'America/Chicago',
      windows: [],
      exceptions: [],
      notes: '',
    },
  };
}

describe('Wave 3 planner attachments', () => {
  beforeEach(() => {
    resetHqSyncDirectoryForTests();
  });

  it('attaches and detaches planner asset references', async () => {
    const taskId = 't-wave3';
    const projectId = 'p-wave3';
    const assetId = 'a-wave3';
    setHqPlannerDirectory([
      {
        id: taskId,
        projectId,
        projectTitle: 'Wave 3',
        clientName: 'Client',
        type: 'edit',
        title: 'Task',
        column: 'queue',
        status: 'todo',
        dueDate: '2026-05-07',
        priority: 'normal',
        assigneeCrewId: 'cr-6',
        assigneeName: 'Jayden Price',
        done: false,
        attachmentAssetIds: [],
      },
    ]);
    setHqAssetDirectory([
      {
        id: assetId,
        projectId,
        projectTitle: 'Wave 3',
        label: 'Asset',
        type: 'video',
        sourceType: 'upload',
        sourceRef: 'local',
        version: '1',
        status: 'internal_review',
        clientVisible: false,
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
        commentCount: 0,
      },
    ]);
    const task = getPlannerItemsSync().find((item) => item.id === taskId)!;
    const asset = getAssetsSync().find((item) => item.id === assetId)!;
    const attach = await attachAssetToPlannerItem(task.id, asset.id, 'tester');
    expect(attach.ok).toBe(true);
    expect(getPlannerItemsSync().find((item) => item.id === task.id)?.attachmentAssetIds || []).toContain(asset.id);

    const detach = await removeAssetFromPlannerItem(task.id, asset.id, 'tester');
    expect(detach.ok).toBe(true);
    expect(getPlannerItemsSync().find((item) => item.id === task.id)?.attachmentAssetIds || []).not.toContain(asset.id);
  });
});

describe('Wave 3 crew media rights', () => {
  beforeEach(() => {
    resetHqSyncDirectoryForTests();
    setHqCrewDirectory([minimalJayden()]);
  });

  it('stores crew media policy with expiration metadata', () => {
    const crew = getHqCrewDirectory().find((item) => item.id === 'cr-6')!;
    const assetId = 'a-wave3-policy';
    setHqAssetDirectory([
      {
        id: assetId,
        projectId: 'p-wave3-policy',
        projectTitle: 'Wave 3 Policy',
        label: 'Policy asset',
        type: 'video',
        sourceType: 'upload',
        sourceRef: 'local',
        version: '1',
        status: 'internal_review',
        clientVisible: false,
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
        commentCount: 0,
      },
    ]);
    const asset = getAssetsSync().find((item) => item.id === assetId)!;
    const result = upsertCrewMediaPolicy(crew.id, {
      assetId: asset.id,
      visibility: 'client',
      usageRights: 'licensed',
      expiresAt: '2026-05-01',
    });
    expect(result.ok).toBe(true);
    const stored = getHqCrewDirectory()
      .find((item) => item.id === crew.id)
      ?.mediaPolicies?.find((item) => item.assetId === asset.id);
    expect(stored?.usageRights).toBe('licensed');
    expect(stored?.expiresAt).toBe('2026-05-01');
  });
});

describe('Wave 3 storage ops actions', () => {
  beforeEach(() => {
    resetHqSyncDirectoryForTests();
  });

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
    setHqStorageOpsDirectory([source]);
    const before = getStorageOpsSync().length;
    expect(retryStorageOperation(source.id, 'admin').ok).toBe(true);
    expect(revokeStorageOpsLink(source.id, 'admin').ok).toBe(true);
    expect(getStorageOpsSync().length).toBeGreaterThanOrEqual(before + 1);
    expect(getStorageOpsSync()[0]?.eventType).toBe('link_revoked');
  });
});
