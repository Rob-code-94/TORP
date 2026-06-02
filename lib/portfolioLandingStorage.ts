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

export type PortfolioLandingUploadResponse = PortfolioLandingUploadResult & {
  /** Set when file exceeds warn threshold but is under hard max. */
  warning?: string;
};

export type PortfolioLandingUploadProgress = {
  percent: number;
  bytesTransferred: number;
  totalBytes: number;
};

export const PORTFOLIO_IMAGE_MAX_BYTES = 80 * 1024 * 1024;
export const PORTFOLIO_VIDEO_WARN_BYTES = 200 * 1024 * 1024;
export const PORTFOLIO_VIDEO_MAX_BYTES = 500 * 1024 * 1024;

const IMAGE_MIME = /^image\/(jpeg|png|webp|gif)$/i;
const VIDEO_MIME = /^video\/(mp4|quicktime|webm|x-m4v)$/i;

const PORTFOLIO_MEDIA_DOC = 'docs/portfolio-landing-media.md';

export function portfolioVideoSizeWarning(fileSizeBytes: number): string | undefined {
  if (fileSizeBytes <= PORTFOLIO_VIDEO_WARN_BYTES) return undefined;
  const mb = Math.round(fileSizeBytes / (1024 * 1024));
  return `Uploaded ${mb} MB — large for web playback. Prefer a 15–30s H.264 export under 200 MB for grid/hero (see ${PORTFOLIO_MEDIA_DOC}).`;
}

export function validatePortfolioVideoFileSize(fileSizeBytes: number): void {
  if (fileSizeBytes > PORTFOLIO_VIDEO_MAX_BYTES) {
    const maxMb = Math.round(PORTFOLIO_VIDEO_MAX_BYTES / (1024 * 1024));
    throw new Error(
      `File is larger than ${maxMb} MB. Compress with ffmpeg or host the full master on Vimeo/YouTube and paste the link as Watch full film (see ${PORTFOLIO_MEDIA_DOC}).`,
    );
  }
}

export function portfolioLandingPublicPath(args: { assetId: string; filename: string }): string {
  const safeAsset = args.assetId.replace(/[^a-zA-Z0-9_-]/g, '-');
  const safeFile = args.filename.trim().replace(/[^a-zA-Z0-9._-]/g, '-');
  return `public/portfolio/${safeAsset}/${safeFile}`;
}

async function uploadPortfolioFile(args: {
  assetId: string;
  file: File;
  allowedMime: RegExp;
  maxBytes: number;
  typeLabel: string;
  onProgress?: (p: PortfolioLandingUploadProgress) => void;
  validateSize?: (size: number) => void;
  sizeWarning?: (size: number) => string | undefined;
}): Promise<PortfolioLandingUploadResponse> {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase storage is not configured.');
  }
  if (!args.allowedMime.test(args.file.type || '')) {
    throw new Error(`Only ${args.typeLabel} files are supported for this upload.`);
  }
  if (args.validateSize) {
    args.validateSize(args.file.size);
  } else if (args.file.size > args.maxBytes) {
    throw new Error(`File is larger than ${Math.round(args.maxBytes / (1024 * 1024))} MB.`);
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
  const warning = args.sizeWarning?.(args.file.size);
  return {
    path,
    downloadUrl,
    contentType: args.file.type,
    sizeBytes: args.file.size,
    filename: args.file.name,
    ...(warning ? { warning } : {}),
  };
}

/** Public-readable paths for landing portfolio images — admin-only writes in storage.rules */
export async function uploadPortfolioLandingImage(args: {
  assetId: string;
  file: File;
  onProgress?: (p: PortfolioLandingUploadProgress) => void;
}): Promise<PortfolioLandingUploadResponse> {
  return uploadPortfolioFile({
    ...args,
    allowedMime: IMAGE_MIME,
    maxBytes: PORTFOLIO_IMAGE_MAX_BYTES,
    typeLabel: 'image (JPEG, PNG, WebP, GIF)',
  });
}

/** Public-readable paths for landing portfolio video reels — admin-only writes in storage.rules */
export async function uploadPortfolioLandingVideo(args: {
  assetId: string;
  file: File;
  onProgress?: (p: PortfolioLandingUploadProgress) => void;
}): Promise<PortfolioLandingUploadResponse> {
  return uploadPortfolioFile({
    ...args,
    allowedMime: VIDEO_MIME,
    maxBytes: PORTFOLIO_VIDEO_MAX_BYTES,
    typeLabel: 'video (MP4, MOV, WebM)',
    validateSize: validatePortfolioVideoFileSize,
    sizeWarning: portfolioVideoSizeWarning,
  });
}

export async function deletePortfolioLandingPublicObject(path: string): Promise<void> {
  if (!isFirebaseConfigured()) return;
  const storage = getFirebaseStorageInstance();
  await deleteObject(storageRef(storage, path)).catch(() => {
    // best-effort
  });
}
