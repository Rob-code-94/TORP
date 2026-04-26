import React, { useState } from 'react';
import { X } from 'lucide-react';

const DISMISS_KEY = 'torp.demoBanner.dismissed';

/**
 * Sticky, dismissible (per session) notice when VITE_DEMO_BANNER=true.
 * Excluded on print.
 */
const DemoDataBanner: React.FC = () => {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return true;
    return sessionStorage.getItem(DISMISS_KEY) === '1';
  });

  if (import.meta.env.VITE_DEMO_BANNER !== 'true' || dismissed) {
    return null;
  }

  return (
    <div
      role="status"
      className="print:hidden z-[200] w-full min-w-0 border-b border-amber-800/50 bg-amber-950/90 px-3 py-2.5 sm:px-4 text-amber-100/95"
    >
      <div className="mx-auto flex max-w-6xl min-w-0 items-start gap-2 sm:items-center sm:gap-3">
        <p className="min-w-0 flex-1 text-left text-xs sm:text-sm leading-snug">
          Demo data — changes will reset on reload.
        </p>
        <button
          type="button"
          onClick={() => {
            if (typeof window !== 'undefined') sessionStorage.setItem(DISMISS_KEY, '1');
            setDismissed(true);
          }}
          className="shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-md border border-amber-700/50 text-amber-200 hover:bg-amber-900/50"
          aria-label="Dismiss demo notice"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default DemoDataBanner;
