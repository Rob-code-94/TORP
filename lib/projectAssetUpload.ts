import {
  getDownloadURL,
  ref as storageRef,
  uploadBytesResumable,
  type UploadTaskSnapshot,
} from 'firebase/storage';
import type { ProjectAssetType, StoragePolicy } from '../types';
import { getFirebaseStorageInstance, isFirebaseConfigured } from './firebase';
import { buildStoragePath } from './storagePaths';

export interface ProjectAssetUploadInput {
  tenantId: string;
  projectId: string;
  assetId: string;
  version: string;
  file: File;
  policy: StoragePolicy;
  onProgress?: (p: { percent: number; bytesTransferred: number; totalBytes: number }) => void;
}

export interface ProjectAssetUploadResult {
  path: string;
  downloadUrl: string;
  contentType: string;
  size: number;
  filename: string;
}

export function inferAssetType(mime: string, filename: string): ProjectAssetType {
  const lower = (mime || '').toLowerCase();
  if (lower.startsWith('video/')) return 'video';
  if (lower.startsWith('image/')) return 'still';
  if (lower.startsWith('audio/')) return 'audio';
  if (/\.(pdf|docx?|xlsx?|pptx?|txt|md)$/i.test(filename)) return 'doc';
  return 'doc';
}

function maxBytesForFile(policy: StoragePolicy, file: File): number {
  const mime = (file.type || '').toLowerCase();
  const limits = policy.maxSizeByMimeGroup;
  if (mime.startsWith('video/')) return limits.videoMb * 1024 * 1024;
  if (mime.startsWith('image/')) return limits.imageMb * 1024 * 1024;
  if (mime.startsWith('audio/')) return limits.audioMb * 1024 * 1024;
  return limits.documentMb * 1024 * 1024;
}

export function projectAssetStoragePath(args: {
  tenantId: string;
  projectId: string;
  assetId: string;
  version: string;
  filename: string;
}): string {
  return buildStoragePath({
    tenantId: args.tenantId,
    module: 'projects',
    projectId: args.projectId,
    entityId: args.assetId,
    version: args.version,
    filename: args.filename,
  });
}

/**
 * Uploads a single project asset version to
 * `tenants/{tenantId}/projects/{projectId}/{assetId}/v{n}/{filename}` using a
 * resumable upload. Returns the gs:// path and a download URL. Caller is
 * responsible for persisting the resulting `AssetVersion` and bumping the
 * `ProjectAsset.version` pointer.
 */
export async function uploadProjectAsset(
  input: ProjectAssetUploadInput,
): Promise<ProjectAssetUploadResult> {
  if (!isFirebaseConfigured()) {
    throw new Error('Project asset uploads require Firebase to be configured.');
  }
  const limit = maxBytesForFile(input.policy, input.file);
  if (input.file.size > limit) {
    const limitMb = Math.round(limit / (1024 * 1024));
    throw new Error(`File is larger than the ${limitMb} MB org limit for this MIME group.`);
  }
  const path = projectAssetStoragePath({
    tenantId: input.tenantId,
    projectId: input.projectId,
    assetId: input.assetId,
    version: input.version,
    filename: input.file.name,
  });
  const storage = getFirebaseStorageInstance();
  const objectRef = storageRef(storage, path);
  const task = uploadBytesResumable(objectRef, input.file, {
    contentType: input.file.type || 'application/octet-stream',
    cacheControl: 'private, max-age=300',
  });
  await new Promise<void>((resolve, reject) => {
    task.on(
      'state_changed',
      (snap: UploadTaskSnapshot) => {
        if (input.onProgress) {
          const total = snap.totalBytes || 1;
          input.onProgress({
            bytesTransferred: snap.bytesTransferred,
            totalBytes: snap.totalBytes,
            percent: Math.min(100, Math.round((snap.bytesTransferred / total) * 100)),
          });
        }
      },
      (err) => reject(err),
      () => resolve(),
    );
  });
  const downloadUrl = await getDownloadURL(objectRef);
  return {
    path,
    downloadUrl,
    contentType: input.file.type,
    size: input.file.size,
    filename: input.file.name,
  };
}
