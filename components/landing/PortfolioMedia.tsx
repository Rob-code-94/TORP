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

  const { startSeconds: segmentStart, endSeconds: segmentEnd } = useMemo(
    () => normalizeFeaturedVideoSegment(startSecondsProp, endSecondsProp),
    [startSecondsProp, endSecondsProp],
  );

  const hasPoster = Boolean(poster?.trim());
  const hasVideo = Boolean(videoSrc?.trim());
  const videoFrameFallback = mode === 'preview' && hasVideo && !hasPoster;
  const useNativeLoop = segmentStart === 0 && segmentEnd == null;

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const playPreview =
    hasVideo && !reducedMotion && (mode === 'player' || (mode === 'preview' && isHovering));

  const showPausedFrame = videoFrameFallback && !playPreview && !reducedMotion;

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
    if (!el || !hasVideo) return;

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
  }, [playPreview, showPausedFrame, hasVideo, videoFrameFallback, reducedMotion, videoSrc, segmentStart]);

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
      {hasPoster ? (
        <img
          src={poster}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          className={`${className} ${playPreview ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
          onError={onPosterError}
        />
      ) : !hasVideo ? (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
          <span className="px-3 text-center font-mono text-xs text-zinc-600">No media</span>
        </div>
      ) : null}
      {hasVideo ? (
        <video
          ref={videoRef}
          src={videoSrc}
          poster={hasPoster ? poster : undefined}
          muted
          loop={useNativeLoop}
          playsInline
          preload={priority || videoFrameFallback ? 'auto' : 'metadata'}
          className={`${videoClass} transition-opacity duration-300`}
          onError={onVideoError}
        />
      ) : null}
    </div>
  );
};

export default PortfolioMedia;
