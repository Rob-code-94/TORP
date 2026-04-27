import { getDownloadURL, ref, uploadBytesResumable, type UploadTask } from 'firebase/storage';
import { getFirebaseStorageInstance, isFirebaseConfigured } from './firebase';
import type { ProjectAssetStorageAdapter, ResolveAssetStorageInput } from './projectAssetStorage';
import { buildStoragePath, resolveActiveTenantId } from './storagePaths';

export interface ProjectAssetUploadParams {
  projectId: string;
  assetId: string;
  filename: string;
  file: Blob;
  tenantId?: string;
  contentType?: string;
}

export interface ProjectAssetUploadResult {
  path: string;
  downloadUrl: string;
}

export const firebaseProjectAssetStorageAdapter: ProjectAssetStorageAdapter = {
  resolveStorage(input: ResolveAssetStorageInput) {
    const path = buildStoragePath({
      tenantId: input.tenantId || resolveActiveTenantId(),
      module: 'projects',
      projectId: input.projectId,
      entityId: input.assetId,
      version: 'v1',
      filename: input.filename,
    });
    return { path };
  },
};

export function createProjectAssetUploadTask(params: ProjectAssetUploadParams): { path: string; task: UploadTask } {
  const path = buildStoragePath({
    tenantId: params.tenantId || resolveActiveTenantId(),
    module: 'projects',
    projectId: params.projectId,
    entityId: params.assetId,
    version: 'v1',
    filename: params.filename,
  });
  const objectRef = ref(getFirebaseStorageInstance(), path);
  const task = uploadBytesResumable(objectRef, params.file, {
    contentType: params.contentType,
    customMetadata: {
      projectId: params.projectId,
      assetId: params.assetId,
      tenantId: params.tenantId || resolveActiveTenantId(),
    },
  });
  return { path, task };
}

export async function uploadProjectAssetBinary(params: ProjectAssetUploadParams): Promise<ProjectAssetUploadResult> {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured for storage uploads.');
  }
  const { path, task } = createProjectAssetUploadTask(params);
  await task;
  const downloadUrl = await getDownloadURL(task.snapshot.ref);
  return { path, downloadUrl };
}
