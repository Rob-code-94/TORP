import {
  deleteObject,
  getDownloadURL,
  ref as storageRef,
  uploadBytesResumable,
  type UploadTaskSnapshot,
} from 'firebase/storage';
import { getFirebaseStorageInstance, isFirebaseConfigured } from './firebase';

export type AvatarUploadProgress = {
  bytesTransferred: number;
  totalBytes: number;
  percent: number;
};

export interface AvatarUploadResult {
  path: string;
  downloadUrl: string;
  contentType: string;
  size: number;
}

const ACCEPTED_MIME = ['image/jpeg', 'image/png', 'image/webp'];

export function avatarPath(args: { tenantId: string; uid: string; filename: string }): string {
  const safeName = args.filename.replace(/[^a-zA-Z0-9._-]/g, '-');
  return `tenants/${args.tenantId}/users/${args.uid}/avatar/${safeName}`;
}

export function logoIdentityPath(args: { tenantId: string; filename: string }): string {
  const safeName = args.filename.replace(/[^a-zA-Z0-9._-]/g, '-');
  return `tenants/${args.tenantId}/org/identity/${safeName}`;
}

export interface UploadAvatarArgs {
  tenantId: string;
  uid: string;
  file: File;
  maxBytes: number;
  onProgress?: (p: AvatarUploadProgress) => void;
}

/**
 * Uploads a single avatar to `tenants/{tenantId}/users/{uid}/avatar/{filename}`
 * using a resumable upload. Returns the gs:// path and a download URL.
 */
export async function uploadAvatar(args: UploadAvatarArgs): Promise<AvatarUploadResult> {
  if (!isFirebaseConfigured()) {
    throw new Error('Avatar uploads require Firebase to be configured.');
  }
  if (!ACCEPTED_MIME.includes(args.file.type)) {
    throw new Error('Avatar must be a JPEG, PNG, or WebP image.');
  }
  if (args.file.size > args.maxBytes) {
    const limitMb = Math.round(args.maxBytes / (1024 * 1024));
    throw new Error(`Avatar exceeds the ${limitMb} MB image limit.`);
  }
  const path = avatarPath({ tenantId: args.tenantId, uid: args.uid, filename: args.file.name });
  const storage = getFirebaseStorageInstance();
  const objectRef = storageRef(storage, path);
  const task = uploadBytesResumable(objectRef, args.file, {
    contentType: args.file.type,
    cacheControl: 'private, max-age=3600',
  });

  await new Promise<void>((resolve, reject) => {
    task.on(
      'state_changed',
      (snap: UploadTaskSnapshot) => {
        if (args.onProgress) {
          const total = snap.totalBytes || 1;
          args.onProgress({
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
    contentType: args.file.type,
    size: args.file.size,
  };
}

export async function deleteAvatarObject(path: string): Promise<void> {
  if (!isFirebaseConfigured()) return;
  const storage = getFirebaseStorageInstance();
  await deleteObject(storageRef(storage, path)).catch(() => {
    // best-effort; missing object is fine
  });
}

export interface UploadOrgLogoArgs {
  tenantId: string;
  file: File;
  maxBytes: number;
  onProgress?: (p: AvatarUploadProgress) => void;
}

export async function uploadOrgLogo(args: UploadOrgLogoArgs): Promise<AvatarUploadResult> {
  if (!isFirebaseConfigured()) {
    throw new Error('Org logo upload requires Firebase to be configured.');
  }
  if (!ACCEPTED_MIME.includes(args.file.type) && args.file.type !== 'image/svg+xml') {
    throw new Error('Logo must be JPEG, PNG, WebP, or SVG.');
  }
  if (args.file.size > args.maxBytes) {
    const limitMb = Math.round(args.maxBytes / (1024 * 1024));
    throw new Error(`Logo exceeds the ${limitMb} MB image limit.`);
  }
  const path = logoIdentityPath({ tenantId: args.tenantId, filename: args.file.name });
  const storage = getFirebaseStorageInstance();
  const objectRef = storageRef(storage, path);
  const task = uploadBytesResumable(objectRef, args.file, {
    contentType: args.file.type,
    cacheControl: 'public, max-age=300',
  });
  await new Promise<void>((resolve, reject) => {
    task.on(
      'state_changed',
      (snap) => {
        if (args.onProgress) {
          const total = snap.totalBytes || 1;
          args.onProgress({
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
    contentType: args.file.type,
    size: args.file.size,
  };
}
