import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type HorizontalMediaRailProps = {
  ariaLabel: string;
  children: React.ReactNode;
  className?: string;
};

const HorizontalMediaRail: React.FC<HorizontalMediaRailProps> = ({
  ariaLabel,
  children,
  className = '',
}) => {
  const railRef = useRef<HTMLDivElement>(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = railRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollPrev(scrollLeft > 4);
    setCanScrollNext(scrollLeft + clientWidth < scrollWidth - 4);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotion = () => setReducedMotion(mq.matches);
    updateMotion();
    mq.addEventListener('change', updateMotion);
    return () => mq.removeEventListener('change', updateMotion);
  }, []);

  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener('scroll', updateScrollState, { passive: true });
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', updateScrollState);
      ro.disconnect();
    };
  }, [updateScrollState, children]);

  const scrollByCard = (direction: -1 | 1) => {
    const el = railRef.current;
    if (!el) return;
    const firstCard = el.querySelector<HTMLElement>('[data-rail-card]');
    const cardWidth = firstCard?.offsetWidth ?? el.clientWidth * 0.82;
    const gap = 16;
    el.scrollBy({
      left: direction * (cardWidth + gap),
      behavior: reducedMotion ? 'auto' : 'smooth',
    });
  };

  return (
    <div className={`relative min-w-0 ${className}`}>
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-zinc-950 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-zinc-950 to-transparent" />

      {canScrollPrev ? (
        <button
          type="button"
          aria-label="Previous item"
          onClick={() => scrollByCard(-1)}
          className="absolute left-1 top-1/2 z-20 flex h-11 w-11 min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center rounded-full border border-zinc-700 bg-zinc-950/90 text-white backdrop-blur-sm transition-colors hover:border-zinc-500"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden />
        </button>
      ) : null}

      {canScrollNext ? (
        <button
          type="button"
          aria-label="Next item"
          onClick={() => scrollByCard(1)}
          className="absolute right-1 top-1/2 z-20 flex h-11 w-11 min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center rounded-full border border-zinc-700 bg-zinc-950/90 text-white backdrop-blur-sm transition-colors hover:border-zinc-500"
        >
          <ChevronRight className="h-5 w-5" aria-hidden />
        </button>
      ) : null}

      <div
        ref={railRef}
        role="region"
        aria-label={ariaLabel}
        className={`relative min-w-0 overflow-x-auto overscroll-x-contain snap-x snap-mandatory no-scrollbar ${
          reducedMotion ? '' : 'scroll-smooth'
        }`}
        style={{ scrollPaddingInline: '1rem' }}
      >
        <div className="flex w-max min-w-0 gap-4 px-4">{children}</div>
      </div>
    </div>
  );
};

export default HorizontalMediaRail;
