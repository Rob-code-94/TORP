import React from 'react';
import type { PortfolioLandingUploadProgress } from '../../../lib/portfolioLandingStorage';

export type PortfolioUploadStatus = 'uploading' | 'success' | 'error';

export interface PortfolioUploadFeedback {
  status: PortfolioUploadStatus;
  progress: PortfolioLandingUploadProgress | null;
  label: string;
  message?: string;
}

function formatTransferMb(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1);
}

interface PortfolioUploadProgressProps {
  feedback: PortfolioUploadFeedback | null | undefined;
}

const PortfolioUploadProgress: React.FC<PortfolioUploadProgressProps> = ({ feedback }) => {
  if (!feedback) return null;

  const { status, progress, label, message } = feedback;

  if (status === 'success') {
    return (
      <p className="text-[11px] text-emerald-400/90 break-words" role="status">
        {message ?? `Upload complete — saved to ${label}.`}
      </p>
    );
  }

  if (status === 'error') {
    return (
      <p className="text-[11px] text-rose-400 break-words" role="alert">
        {message ?? 'Upload failed.'}
      </p>
    );
  }

  const percent = progress?.percent ?? 0;
  const transferred = progress ? formatTransferMb(progress.bytesTransferred) : '0.0';
  const total = progress ? formatTransferMb(progress.totalBytes) : '0.0';

  return (
    <div className="min-w-0 space-y-1" role="status" aria-live="polite">
      <div className="flex items-center justify-between gap-2 text-[10px] text-zinc-500">
        <span>Uploading {label.toLowerCase()}…</span>
        <span>
          {transferred} / {total} MB ({percent}%)
        </span>
      </div>
      <div
        className="h-1.5 w-full min-w-0 overflow-hidden rounded-full bg-zinc-800"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Uploading ${label}`}
      >
        <div
          className="h-full rounded-full bg-white/80 transition-[width] duration-150 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
};

export default PortfolioUploadProgress;

export const PORTFOLIO_IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';
export const PORTFOLIO_VIDEO_ACCEPT = 'video/mp4,video/quicktime,video/webm,video/x-m4v';
export const PORTFOLIO_GALLERY_ACCEPT = `${PORTFOLIO_VIDEO_ACCEPT},${PORTFOLIO_IMAGE_ACCEPT}`;

export const PORTFOLIO_IMAGE_HINT =
  'JPEG, PNG, WebP, or GIF · max 80 MB. See docs/portfolio-landing-media.md.';
export const PORTFOLIO_VIDEO_HINT =
  'MP4, MOV, or WebM (H.264 recommended) · max 500 MB · best under 200 MB for web playback.';
export const PORTFOLIO_GALLERY_HINT =
  'Video or image · video: MP4/MOV/WebM max 500 MB (under 200 MB recommended) · image: max 80 MB.';
