import type { ProjectAssetSourceType } from '../types';

export interface ResolveAssetStorageInput {
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

function sanitizePathSegment(segment: string): string {
  return segment.trim().replace(/[^a-zA-Z0-9._-]/g, '-');
}

export function buildProjectAssetStoragePath(projectId: string, assetId: string, filename: string): string {
  return `projects/${sanitizePathSegment(projectId)}/assets/${sanitizePathSegment(assetId)}/${sanitizePathSegment(filename)}`;
}

const mockStorageAdapter: ProjectAssetStorageAdapter = {
  resolveStorage(input) {
    const path = buildProjectAssetStoragePath(input.projectId, input.assetId, input.filename);
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
