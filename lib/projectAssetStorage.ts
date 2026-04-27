import type { ProjectAssetSourceType } from '../types';
import { buildStoragePath, resolveActiveTenantId } from './storagePaths';

export interface ResolveAssetStorageInput {
  tenantId?: string;
  projectId: string;
  assetId: string;
  filename: string;
  sourceType: ProjectAssetSourceType;
}

export interface ResolveAssetStorageResult {
  path?: string;
  url?: string;
}

export interface ProjectAssetStorageAdapter {
  resolveStorage(input: ResolveAssetStorageInput): ResolveAssetStorageResult;
}

export function buildProjectAssetStoragePath(projectId: string, assetId: string, filename: string): string {
  return buildStoragePath({
    tenantId: resolveActiveTenantId(),
    module: 'projects',
    projectId,
    entityId: assetId,
    version: 'v1',
    filename,
  });
}

const mockStorageAdapter: ProjectAssetStorageAdapter = {
  resolveStorage(input) {
    const path = buildStoragePath({
      tenantId: input.tenantId || resolveActiveTenantId(),
      module: 'projects',
      projectId: input.projectId,
      entityId: input.assetId,
      version: 'v1',
      filename: input.filename,
    });
    return {
      path,
      url: input.sourceType === 'upload' ? `mock://storage/${path}` : undefined,
    };
  },
};

let activeAdapter: ProjectAssetStorageAdapter = mockStorageAdapter;

export function setProjectAssetStorageAdapter(adapter: ProjectAssetStorageAdapter | null | undefined) {
  activeAdapter = adapter ?? mockStorageAdapter;
}

export function getProjectAssetStorageAdapter(): ProjectAssetStorageAdapter {
  return activeAdapter;
}
