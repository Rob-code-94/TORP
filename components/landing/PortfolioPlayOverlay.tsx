import React from 'react';
import { Play } from 'lucide-react';

type PortfolioPlayOverlayProps = {
  variant: 'rail' | 'hero' | 'masonry';
  hidden?: boolean;
  marketingEditMode?: boolean;
  onPlayClick?: (event: React.MouseEvent) => void;
};

const PortfolioPlayOverlay: React.FC<PortfolioPlayOverlayProps> = ({
  variant,
  hidden = false,
  marketingEditMode = false,
  onPlayClick,
}) => {
  if (hidden || marketingEditMode) return null;

  if (variant === 'hero') {
    return (
      <button
        type="button"
        aria-label="Play preview"
        onClick={(event) => {
          event.stopPropagation();
          onPlayClick?.(event);
        }}
        className="absolute inset-0 z-10 flex items-center justify-center bg-black/25 transition-colors hover:bg-black/35"
      >
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/95 shadow-lg md:h-20 md:w-20">
          <Play className="ml-1 h-7 w-7 fill-current text-black md:h-8 md:w-8" aria-hidden />
        </span>
      </button>
    );
  }

  const isRail = variant === 'rail';

  return (
    <div
      className={`pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${
        isRail
          ? 'bg-black/10 opacity-70 md:bg-black/20 md:opacity-0 md:group-hover:opacity-100'
          : 'gap-4 bg-black/20 opacity-0 backdrop-blur-[2px] md:group-hover:opacity-100'
      }`}
    >
      <div
        className={`flex transform items-center justify-center rounded-full bg-white shadow-lg transition-transform ${
          isRail
            ? 'h-11 w-11 md:h-16 md:w-16 md:scale-90 md:group-hover:scale-100'
            : 'h-16 w-16 scale-90 md:group-hover:scale-100'
        }`}
      >
        <Play
          className={`fill-current text-black ${isRail ? 'ml-0.5 h-4 w-4 md:ml-1 md:h-6 md:w-6' : 'ml-1 h-6 w-6'}`}
          aria-hidden
        />
      </div>
      {!isRail ? (
        <span className="hidden font-mono text-xs uppercase tracking-widest text-white drop-shadow-md sm:inline">
          View case →
        </span>
      ) : null}
    </div>
  );
};

export default PortfolioPlayOverlay;
