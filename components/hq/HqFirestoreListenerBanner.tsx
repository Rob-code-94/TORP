import React, { useEffect, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useAdminTheme } from '../../lib/adminTheme';
import { useHqFirestoreListenerError } from './HqFirestoreProvider';

/**
 * Shown when a tenant-scoped HQ Firestore listener fails (permission-denied, index, etc.).
 */
const HqFirestoreListenerBanner: React.FC = () => {
  const { theme } = useAdminTheme();
  const isDark = theme === 'dark';
  const rawError = useHqFirestoreListenerError();
  const [dismissedForMessage, setDismissedForMessage] = useState<string | null>(null);

  useEffect(() => {
    setDismissedForMessage(null);
  }, [rawError]);

  if (!rawError || dismissedForMessage === rawError) return null;

  return (
    <div
      role="alert"
      className={`print:hidden shrink-0 z-[24] w-full min-w-0 border-b px-3 py-2 sm:px-4 ${
        isDark ? 'border-rose-900/60 bg-rose-950/95 text-rose-50' : 'border-rose-200 bg-rose-50 text-rose-950'
      }`}
    >
      <div className="flex min-w-0 items-start gap-2 sm:items-center sm:gap-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 sm:mt-0" aria-hidden />
        <p className="min-w-0 flex-1 text-left text-xs sm:text-sm leading-snug">
          <span className="font-semibold">Could not sync HQ data from Firestore.</span>{' '}
          <span className="opacity-95">{rawError}</span>
        </p>
        <button
          type="button"
          onClick={() => setDismissedForMessage(rawError)}
          className={`shrink-0 rounded p-1 ${isDark ? 'hover:bg-rose-900/80' : 'hover:bg-rose-100'}`}
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default HqFirestoreListenerBanner;
