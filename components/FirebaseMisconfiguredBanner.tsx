import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useAdminTheme } from '../lib/adminTheme';
import { isFirebaseConfigured } from '../lib/firebase';
import { shouldShowMisconfiguredBanner } from '../lib/firebaseMisconfigBanner';

const DISMISS_KEY = 'torp.firebaseMisconfig.dismissed';

/**
 * Visible only when the deployed bundle is missing Firebase web config AND
 * the user is on a hosted production-ish domain (Cloud Run / Firebase
 * Hosting). This is a guardrail against the silent "Coming Soon" regression
 * fixed in the deploy pipeline. Hidden in dev/local/preview.
 */
const FirebaseMisconfiguredBanner: React.FC = () => {
  const { theme } = useAdminTheme();
  const isDark = theme === 'dark';
  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return sessionStorage.getItem(DISMISS_KEY) === '1';
  });

  const hostname = typeof window === 'undefined' ? null : window.location.hostname;
  if (
    !shouldShowMisconfiguredBanner({
      isConfigured: isFirebaseConfigured(),
      hostname,
      dismissed,
    })
  ) {
    return null;
  }

  return (
    <div
      role="alert"
      className={`print:hidden z-[210] w-full min-w-0 border-b px-3 py-2.5 sm:px-4 ${
        isDark
          ? 'border-red-800/60 bg-red-950/90 text-red-100'
          : 'border-red-200 bg-red-100 text-red-950'
      }`}
    >
      <div className="mx-auto flex max-w-6xl min-w-0 items-start gap-2 sm:items-center sm:gap-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 sm:mt-0" aria-hidden />
        <p className="min-w-0 flex-1 text-left text-xs sm:text-sm leading-snug">
          <span className="font-semibold">Auth and integrations are unavailable in this build.</span>{' '}
          <span className="opacity-90">
            Ask an admin to redeploy with the Firebase web config baked in. See{' '}
            <a
              href="https://github.com/Rob-code-94/TORP/blob/main/docs/build-secrets.md"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2"
            >
              docs/build-secrets.md
            </a>
            .
          </span>
        </p>
        <button
          type="button"
          onClick={() => {
            if (typeof window !== 'undefined') sessionStorage.setItem(DISMISS_KEY, '1');
            setDismissed(true);
          }}
          className={
            isDark
              ? 'shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-md border border-red-700/50 text-red-100 hover:bg-red-900/50'
              : 'shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-md border border-red-300 text-red-900 hover:bg-red-200/60'
          }
          aria-label="Dismiss misconfiguration notice"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default FirebaseMisconfiguredBanner;
