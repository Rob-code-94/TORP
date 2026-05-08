import {
  deleteObject,
  getDownloadURL,
  ref as storageRef,
  uploadBytesResumable,
  type UploadTaskSnapshot,
} from 'firebase/storage';
import { getFirebaseStorageInstance, isFirebaseConfigured } from './firebase';

export interface PortfolioLandingUploadResult {
  path: string;
  downloadUrl: string;
  contentType: string;
  sizeBytes: number;
  filename: string;
}

export type PortfolioLandingUploadProgress = {
  percent: number;
  bytesTransferred: number;
  totalBytes: number;
};

const ALLOWED_MIME = /^image\/(jpeg|png|webp|gif)$/i;
const MAX_BYTES = 80 * 1024 * 1024;

export function portfolioLandingPublicPath(args: { assetId: string; filename: string }): string {
  const safeAsset = args.assetId.replace(/[^a-zA-Z0-9_-]/g, '-');
  const safeFile = args.filename.trim().replace(/[^a-zA-Z0-9._-]/g, '-');
  return `public/portfolio/${safeAsset}/${safeFile}`;
}

/** Public-readable paths for landing portfolio stills — admin-only writes in storage.rules */
export async function uploadPortfolioLandingImage(args: {
  assetId: string;
  file: File;
  onProgress?: (p: PortfolioLandingUploadProgress) => void;
}): Promise<PortfolioLandingUploadResult> {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase storage is not configured.');
  }
  if (!ALLOWED_MIME.test(args.file.type || '')) {
    throw new Error('Only image files (JPEG, PNG, WebP, GIF) are supported.');
  }
  if (args.file.size > MAX_BYTES) {
    throw new Error(`File is larger than ${Math.round(MAX_BYTES / (1024 * 1024))} MB.`);
  }
  const path = portfolioLandingPublicPath({ assetId: args.assetId, filename: args.file.name });
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

export async function deletePortfolioLandingPublicObject(path: string): Promise<void> {
  if (!isFirebaseConfigured()) return;
  const storage = getFirebaseStorageInstance();
  await deleteObject(storageRef(storage, path)).catch(() => {
    // best-effort
  });
}
