import {
  deleteObject,
  getDownloadURL,
  ref as storageRef,
  uploadBytesResumable,
  type UploadTaskSnapshot,
} from 'firebase/storage';
import { getFirebaseStorageInstance, isFirebaseConfigured } from './firebase';

export interface ShowcaseUploadResult {
  path: string;
  downloadUrl: string;
  contentType: string;
  sizeBytes: number;
  filename: string;
}

export type ShowcaseUploadProgress = {
  percent: number;
  bytesTransferred: number;
  totalBytes: number;
};

const ALLOWED_MIME = /^(image\/(jpeg|png|webp|gif)|video\/(mp4|webm|quicktime))$/i;
const MAX_BYTES = 200 * 1024 * 1024; // 200 MB hard cap for Landing reel assets.

export function showcasePath(args: { assetId: string; filename: string }): string {
  const safeAsset = args.assetId.replace(/[^a-zA-Z0-9_-]/g, '-');
  const safeFile = args.filename.trim().replace(/[^a-zA-Z0-9._-]/g, '-');
  return `public/showcase/${safeAsset}/${safeFile}`;
}

/**
 * Uploads a single showcase asset (image or short video). Storage path lives
 * outside the tenant prefix so unauthenticated landing visitors can read it
 * — `storage.rules` enforces admin-only writes. Caller is responsible for
 * persisting the resulting URL into the matching Firestore doc.
 */
export async function uploadShowcaseAsset(args: {
  assetId: string;
  file: File;
  onProgress?: (p: ShowcaseUploadProgress) => void;
}): Promise<ShowcaseUploadResult> {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase storage is not configured.');
  }
  if (!ALLOWED_MIME.test(args.file.type || '')) {
    throw new Error('Only image (jpeg/png/webp/gif) or video (mp4/webm/mov) files are supported.');
  }
  if (args.file.size > MAX_BYTES) {
    throw new Error(`File is larger than ${Math.round(MAX_BYTES / (1024 * 1024))} MB.`);
  }
  const path = showcasePath({ assetId: args.assetId, filename: args.file.name });
  const storage = getFirebaseStorageInstance();
  const objectRef = storageRef(storage, path);
  const task = uploadBytesResumable(objectRef, args.file, {
    contentType: args.file.type,
    cacheControl: 'public, max-age=86400',
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
    sizeBytes: args.file.size,
    filename: args.file.name,
  };
}

export async function deleteShowcaseAsset(path: string): Promise<void> {
  if (!isFirebaseConfigured()) return;
  const storage = getFirebaseStorageInstance();
  await deleteObject(storageRef(storage, path)).catch(() => {
    // best-effort: tolerate missing object
  });
}
