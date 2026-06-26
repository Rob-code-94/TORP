import React, { useEffect, useMemo, useRef, useState } from 'react';
import { normalizeFeaturedVideoSegment } from '../../lib/portfolioMedia';

export type PortfolioMediaMode = 'poster' | 'preview' | 'player';

type PortfolioMediaProps = {
  mode: PortfolioMediaMode;
  poster?: string;
  videoSrc?: string;
  startSeconds?: number;
  endSeconds?: number;
  alt?: string;
  className?: string;
  aspectClassName?: string;
  /** When true, play muted loop while hovered (preview mode only). */
  isHovering?: boolean;
  /** Eager load for hero. */
  priority?: boolean;
  onPosterError?: () => void;
  onVideoError?: () => void;
};

function seekVideoTo(el: HTMLVideoElement, seconds: number) {
  try {
    el.currentTime = seconds;
  } catch {
    /* seek unsupported */
  }
}

function MediaLoadingPlaceholder({ label = 'One moment' }: { label?: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-900 animate-pulse">
      <div className="h-px w-12 bg-zinc-700" aria-hidden />
      <span className="px-3 text-center font-mono text-[10px] uppercase tracking-widest text-zinc-600">
        {label}
      </span>
    </div>
  );
}

const PortfolioMedia: React.FC<PortfolioMediaProps> = ({
  mode,
  poster,
  videoSrc,
  startSeconds: startSecondsProp,
  endSeconds: endSecondsProp,
  alt = '',
  className = 'h-full w-full object-cover',
  aspectClassName,
  isHovering = false,
  priority = false,
  onPosterError,
  onVideoError,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [finePointer, setFinePointer] = useState(true);
  const [posterLoaded, setPosterLoaded] = useState(false);
  const [posterFailed, setPosterFailed] = useState(false);

  const { startSeconds: segmentStart, endSeconds: segmentEnd } = useMemo(
    () => normalizeFeaturedVideoSegment(startSecondsProp, endSecondsProp),
    [startSecondsProp, endSecondsProp],
  );

  const hasPoster = Boolean(poster?.trim());
  const hasVideo = Boolean(videoSrc?.trim());
  const videoFrameFallback =
    finePointer && mode === 'preview' && hasVideo && !hasPoster && !posterFailed;
  const useNativeLoop = segmentStart === 0 && segmentEnd == null;

  useEffect(() => {
    setPosterLoaded(false);
    setPosterFailed(false);
  }, [poster]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
    const update = () => setFinePointer(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const playPreview =
    hasVideo &&
    finePointer &&
    !reducedMotion &&
    (mode === 'player' || (mode === 'preview' && isHovering));

  const showPausedFrame = videoFrameFallback && !playPreview && !reducedMotion;

  const showMobileDeferredPlaceholder =
    !finePointer &&
    mode === 'preview' &&
    hasVideo &&
    (!hasPoster || posterFailed);

  const videoPreload = useMemo(() => {
    if (mode === 'player') return 'metadata';
    if (priority) return 'metadata';
    if (!finePointer) return 'none';
    if (videoFrameFallback) return 'auto';
    return 'metadata';
  }, [finePointer, mode, priority, videoFrameFallback]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !hasVideo || mode === 'player') return;

    const onTimeUpdate = () => {
      if (segmentEnd != null && el.currentTime >= segmentEnd - 0.05) {
        seekVideoTo(el, segmentStart);
      }
    };

    const onEnded = () => {
      if (segmentEnd != null || segmentStart === 0) return;
      seekVideoTo(el, segmentStart);
      void el.play().catch(() => {
        /* autoplay blocked */
      });
    };

    if (segmentEnd != null) {
      el.addEventListener('timeupdate', onTimeUpdate);
    }
    if (segmentStart > 0 && segmentEnd == null) {
      el.addEventListener('ended', onEnded);
    }

    return () => {
      el.removeEventListener('timeupdate', onTimeUpdate);
      el.removeEventListener('ended', onEnded);
    };
  }, [hasVideo, mode, segmentEnd, segmentStart]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !hasVideo || showMobileDeferredPlaceholder) return;

    if (playPreview) {
      seekVideoTo(el, segmentStart);
      void el.play().catch(() => {
        /* autoplay blocked */
      });
      return () => {
        el.pause();
        seekVideoTo(el, segmentStart);
      };
    }

    if (showPausedFrame || (videoFrameFallback && reducedMotion)) {
      el.pause();
      const holdFrame = () => {
        if (Math.abs(el.currentTime - segmentStart) > 0.05) {
          seekVideoTo(el, segmentStart);
        }
      };
      if (el.readyState >= 1) holdFrame();
      else el.addEventListener('loadeddata', holdFrame, { once: true });
    }

    return undefined;
  }, [
    playPreview,
    showPausedFrame,
    hasVideo,
    videoFrameFallback,
    reducedMotion,
    videoSrc,
    segmentStart,
    showMobileDeferredPlaceholder,
  ]);

  const wrapperClass = aspectClassName
    ? `relative w-full overflow-hidden ${aspectClassName}`
    : 'relative h-full w-full overflow-hidden';

  if (mode === 'player' && hasVideo) {
    return (
      <div className={wrapperClass}>
        <video
          src={videoSrc}
          poster={poster}
          controls
          playsInline
          preload="metadata"
          className={className}
          onError={onVideoError}
        />
      </div>
    );
  }

  const videoClass = [
    'absolute inset-0',
    className,
    playPreview ? 'opacity-100' : '',
    showPausedFrame ? 'opacity-100' : '',
    hasPoster && !playPreview ? 'opacity-0 pointer-events-none' : '',
    videoFrameFallback && reducedMotion ? 'opacity-100' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={wrapperClass}>
      {showMobileDeferredPlaceholder ? (
        <MediaLoadingPlaceholder label="Loading reel…" />
      ) : hasPoster ? (
        <>
          {!posterLoaded && !posterFailed ? (
            <MediaLoadingPlaceholder />
          ) : null}
          <img
            src={poster}
            alt={alt}
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            className={`${className} ${playPreview ? 'opacity-0' : posterLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
            onLoad={() => setPosterLoaded(true)}
            onError={() => {
              setPosterFailed(true);
              onPosterError?.();
            }}
          />
        </>
      ) : !hasVideo ? (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
          <span className="px-3 text-center font-mono text-xs text-zinc-600">No media</span>
        </div>
      ) : videoFrameFallback ? null : (
        <MediaLoadingPlaceholder label="Loading reel…" />
      )}
      {hasVideo && !showMobileDeferredPlaceholder ? (
        <video
          ref={videoRef}
          src={videoSrc}
          poster={hasPoster ? poster : undefined}
          muted
          loop={useNativeLoop}
          playsInline
          preload={videoPreload}
          className={`${videoClass} transition-opacity duration-300`}
          onError={onVideoError}
        />
      ) : null}
    </div>
  );
};

export default PortfolioMedia;
