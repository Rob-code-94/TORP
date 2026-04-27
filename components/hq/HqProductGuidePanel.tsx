import React, { useCallback, useEffect, useId, useRef } from 'react';
import { BookOpen, X } from 'lucide-react';
import type { GuideSection } from '../../lib/hqProductGuideModel';

export interface HqProductGuidePanelProps {
  open: boolean;
  onClose: () => void;
  sections: GuideSection[];
  isDark: boolean;
  /** Shown in the header next to the title. */
  subtitle?: string;
  /** When set, show a “Start quick tour” action (e.g. Driver.js on admin shell). */
  onStartTour?: () => void;
  /** Hide tour CTA on narrow viewports or when the parent can’t start a tour. */
  canStartTour?: boolean;
}

const HqProductGuidePanel: React.FC<HqProductGuidePanelProps> = ({
  open,
  onClose,
  sections,
  isDark,
  subtitle = 'What each area does',
  onStartTour,
  canStartTour = false,
}) => {
  const labelId = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        e.preventDefault();
        onClose();
      }
    },
    [open, onClose]
  );

  useEffect(() => {
    if (!open) {
      return;
    }
    document.addEventListener('keydown', onKeyDown);
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const t = window.setTimeout(() => {
      closeRef.current?.focus();
    }, 0);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      window.clearTimeout(t);
      previouslyFocused.current?.focus?.();
    };
  }, [open, onKeyDown]);

  if (!open) {
    return null;
  }

  const panelClass = isDark
    ? 'bg-zinc-950 border-l border-zinc-800 text-zinc-100'
    : 'bg-white border-l border-zinc-200 text-zinc-900';
  const muted = isDark ? 'text-zinc-500' : 'text-zinc-600';
  const subBorder = isDark ? 'border-zinc-800' : 'border-zinc-200';
  const jumpLink = isDark
    ? 'text-zinc-300 hover:text-white underline decoration-zinc-600 underline-offset-2'
    : 'text-zinc-700 hover:text-zinc-950 underline decoration-zinc-300 underline-offset-2';

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end min-w-0"
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelId}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm w-full h-full"
        aria-label="Close product guide"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        className={[
          'relative flex flex-col w-full min-w-0 max-w-md h-full shadow-2xl overflow-hidden outline-none',
          panelClass,
        ].join(' ')}
      >
        <div className={`shrink-0 flex items-start justify-between gap-3 p-4 border-b ${subBorder}`}>
          <div className="min-w-0">
            <h2
              id={labelId}
              className={`font-[Bebas_Neue,Phosphate,Impact,sans-serif] text-xl tracking-wide uppercase ${
                isDark ? 'text-white' : 'text-zinc-950'
              }`}
            >
              Product guide
            </h2>
            <p className={`text-xs mt-0.5 ${muted}`}>
              {subtitle} · TORP
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {canStartTour && onStartTour && (
              <button
                type="button"
                onClick={onStartTour}
                className={
                  isDark
                    ? 'hidden sm:inline-flex text-xs font-semibold uppercase tracking-wide text-zinc-200 border border-zinc-700 rounded-md px-2 py-1.5 hover:bg-zinc-900'
                    : 'hidden sm:inline-flex text-xs font-semibold uppercase tracking-wide text-zinc-800 border border-zinc-300 rounded-md px-2 py-1.5 hover:bg-zinc-100'
                }
              >
                Quick tour
              </button>
            )}
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              className={
                isDark
                  ? 'p-2 rounded-md text-zinc-500 hover:text-white hover:bg-zinc-900'
                  : 'p-2 rounded-md text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
              }
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {sections.length > 1 && (
          <div className={`shrink-0 px-4 py-2 border-b ${subBorder} overflow-x-auto`}>
            <p className={`text-[10px] font-mono uppercase tracking-wider ${muted} mb-1.5`}>Jump to</p>
            <nav className="flex flex-wrap gap-x-2 gap-y-1" aria-label="Guide sections">
              {sections.map((s) => (
                <a key={s.id} href={`#hq-guide-${s.id}`} className={`text-xs font-medium ${jumpLink}`}>
                  {s.title}
                </a>
              ))}
            </nav>
          </div>
        )}

        <div
          className={`flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 py-4 space-y-3`}
          data-hq-guide-panel-scroll
        >
          {sections.length === 0 ? (
            <p className={`text-sm ${muted}`}>No sections to show for your account on this page.</p>
          ) : (
            sections.map((s) => (
              <section
                key={s.id}
                id={`hq-guide-${s.id}`}
                className={[
                  'rounded-xl border p-3 min-w-0',
                  isDark ? 'border-zinc-800 bg-zinc-900/40' : 'border-zinc-200 bg-zinc-50/80',
                ].join(' ')}
              >
                <h3
                  className={`font-[Bebas_Neue,Phosphate,Impact,sans-serif] text-sm tracking-wide uppercase ${
                    isDark ? 'text-zinc-100' : 'text-zinc-900'
                  }`}
                >
                  {s.title}
                </h3>
                <p
                  className={`text-sm mt-1.5 leading-relaxed ${
                    isDark ? 'text-zinc-400' : 'text-zinc-600'
                  }`}
                >
                  {s.summary}
                </p>
                {s.bullets && s.bullets.length > 0 && (
                  <ul className="mt-2 space-y-2 list-none">
                    {s.bullets.map((b) => (
                      <li key={b.title} className="min-w-0">
                        <p
                          className={`text-xs font-semibold ${
                            isDark ? 'text-zinc-200' : 'text-zinc-800'
                          }`}
                        >
                          {b.title}
                        </p>
                        <p
                          className={`text-xs mt-0.5 leading-relaxed ${
                            isDark ? 'text-zinc-500' : 'text-zinc-600'
                          }`}
                        >
                          {b.body}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))
          )}

          <div className={`flex items-center gap-2 pt-2 text-xs ${muted}`}>
            <BookOpen size={14} className="shrink-0" aria-hidden />
            <span>Scroll here only — the rest of the app stays in place.</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HqProductGuidePanel;
