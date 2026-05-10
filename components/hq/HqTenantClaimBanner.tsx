import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useAdminTheme } from '../../lib/adminTheme';
import { useAuth } from '../../lib/auth';

const DISMISS_KEY = 'torp.hqTenantClaim.dismissed';

/**
 * Shown when Firebase is configured and the signed-in user has no `tenantId` custom claim.
 * Firestore HQ rules require the claim; without it lists stay empty until token refresh.
 */
const HqTenantClaimBanner: React.FC = () => {
  const { theme } = useAdminTheme();
  const isDark = theme === 'dark';
  const { user, isFirebase } = useAuth();
  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return sessionStorage.getItem(DISMISS_KEY) === '1';
  });

  const needsClaim =
    isFirebase &&
    Boolean(user) &&
    !(typeof user?.tenantId === 'string' && user.tenantId.trim().length > 0);

  if (!needsClaim || dismissed) return null;

  const dismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  };

  return (
    <div
      role="status"
      className={`print:hidden shrink-0 z-[25] w-full min-w-0 border-b px-3 py-2 sm:px-4 ${
        isDark ? 'border-amber-800/50 bg-amber-950/90 text-amber-100' : 'border-amber-200 bg-amber-50 text-amber-950'
      }`}
    >
      <div className="flex min-w-0 items-start gap-2 sm:items-center sm:gap-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 sm:mt-0" aria-hidden />
        <p className="min-w-0 flex-1 text-left text-xs sm:text-sm leading-snug">
          <span className="font-semibold">HQ lists need a tenant on your ID token.</span>{' '}
          <span className="opacity-90">
            Until <code className="rounded bg-black/10 px-1 font-mono text-[11px]">tenantId</code> is present, the app
            does not subscribe to Firestore HQ data (nothing matches{' '}
            <code className="rounded bg-black/10 px-1 font-mono text-[11px]">where tenantId == …</code>). Sign out and
            sign back in after claims change, or ask an admin to run Auth seed / deploy the{' '}
            <code className="rounded bg-black/10 px-1 font-mono text-[11px]">ensureTenantClaim</code> callable.
          </span>
        </p>
        <button
          type="button"
          onClick={dismiss}
          className={`shrink-0 rounded p-1 ${isDark ? 'hover:bg-amber-900/80' : 'hover:bg-amber-100'}`}
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default HqTenantClaimBanner;
