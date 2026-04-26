import React, { useCallback, useEffect, useState } from 'react';
import { Copy, RefreshCcw } from 'lucide-react';
import IntegrationCard, { IntegrationCardSkeleton } from '../IntegrationCard';
import {
  getMyFeedToken,
  rotateMyFeedToken,
  isCalendarBackendAvailable,
  formatLastUpdated,
  type MyFeedToken,
} from '../../../../lib/calendarIntegrations';
import {
  registerIntegration,
  type IntegrationRenderProps,
  type IntegrationStatus,
} from '../../../../lib/integrations/registry';
import { UserRole } from '../../../../types';

interface AppleSubscribeCardProps {
  isDark: boolean;
}

function maskUrl(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname;
    const last = path.split('/').filter(Boolean).pop() ?? '';
    const masked = last.length > 8 ? `${last.slice(0, 4)}…${last.slice(-4)}` : last;
    return `${u.origin}${path.replace(last, masked)}`;
  } catch {
    return url;
  }
}

const AppleSubscribeCard: React.FC<AppleSubscribeCardProps> = ({ isDark }) => {
  const [token, setToken] = useState<MyFeedToken | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<'rotate' | 'copy' | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmRotate, setConfirmRotate] = useState(false);
  const [copied, setCopied] = useState(false);

  const backendAvailable = isCalendarBackendAvailable();

  const refresh = useCallback(async () => {
    if (!backendAvailable) {
      setToken(null);
      setLoading(false);
      setFetchError(null);
      return;
    }
    setLoading(true);
    const result = await getMyFeedToken();
    if (result.ok === false) {
      setFetchError(result.error);
      setToken(null);
    } else {
      setFetchError(null);
      setToken(result.data);
    }
    setLoading(false);
  }, [backendAvailable]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onCopy = async () => {
    if (!token?.url || typeof navigator === 'undefined') return;
    setBusy('copy');
    setActionError(null);
    try {
      await navigator.clipboard.writeText(token.url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setActionError('Could not copy automatically. Long-press the URL to copy.');
    } finally {
      setBusy(null);
    }
  };

  const onRotate = async () => {
    setBusy('rotate');
    setActionError(null);
    const result = await rotateMyFeedToken();
    if (result.ok === false) {
      setActionError(result.error);
    } else {
      setToken(result.data);
    }
    setBusy(null);
    setConfirmRotate(false);
  };

  if (loading) return <IntegrationCardSkeleton isDark={isDark} />;

  const status: IntegrationStatus = !backendAvailable
    ? 'coming_soon'
    : fetchError
      ? 'error'
      : token?.url
        ? 'connected'
        : 'not_connected';

  const statusLine = !backendAvailable
    ? 'Available once HQ enables Firebase calendar sync.'
    : token?.url
      ? `Subscribe URL ready · ${maskUrl(token.url)}`
      : 'No subscribe URL yet';
  const lastUpdatedText =
    backendAvailable && token?.rotatedAt ? `Rotated ${formatLastUpdated(token.rotatedAt)}` : undefined;
  const errorText = fetchError ?? actionError ?? undefined;

  const buttonBase =
    'inline-flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed';
  const primaryBtn = isDark
    ? `${buttonBase} border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-100`
    : `${buttonBase} border-zinc-900 bg-zinc-900 text-white hover:bg-zinc-800`;
  const secondaryBtn = isDark
    ? `${buttonBase} border-zinc-700 bg-zinc-900 text-zinc-100 hover:border-zinc-500`
    : `${buttonBase} border-zinc-300 bg-white text-zinc-900 hover:border-zinc-500`;

  return (
    <IntegrationCard
      isDark={isDark}
      title="Apple / iCloud / Outlook"
      blurb="Subscribe URL works in any calendar that supports webcal. Read-only — TORP changes show up in your calendar within about an hour."
      status={status}
      statusLine={statusLine}
      lastUpdatedText={lastUpdatedText}
      errorText={errorText}
    >
      {!backendAvailable && (
        <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>
          When Firebase calendar sync is enabled, you will be able to copy a private subscribe URL
          here.
        </p>
      )}

      {backendAvailable && token?.url && (
        <div className="space-y-2 min-w-0">
          <code
            className={`block w-full overflow-x-auto rounded-md border px-2 py-1.5 text-[11px] font-mono whitespace-nowrap ${
              isDark
                ? 'border-zinc-700 bg-zinc-950 text-zinc-200'
                : 'border-zinc-200 bg-zinc-50 text-zinc-800'
            }`}
            aria-label="Subscribe URL (truncated for privacy)"
            title="Long-press or right-click to reveal full URL after copying"
          >
            {maskUrl(token.url)}
          </code>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={primaryBtn}
              onClick={() => void onCopy()}
              disabled={busy !== null}
            >
              <Copy size={14} />
              {copied ? 'Copied' : 'Copy URL'}
            </button>
            <button
              type="button"
              className={secondaryBtn}
              onClick={() => setConfirmRotate(true)}
              disabled={busy !== null}
            >
              <RefreshCcw size={14} />
              Rotate URL
            </button>
          </div>
        </div>
      )}

      {backendAvailable && !token?.url && (
        <button
          type="button"
          className={primaryBtn}
          onClick={() => void onRotate()}
          disabled={busy === 'rotate'}
        >
          {busy === 'rotate' ? 'Generating…' : 'Generate subscribe URL'}
        </button>
      )}

      <p className={`text-[11px] ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>
        Event titles use the project name and your role only. Anyone with this URL can see those
        details — keep it private and rotate it if you ever paste it somewhere public.
      </p>

      {confirmRotate && (
        <div
          className={`rounded-lg border p-3 text-xs space-y-2 ${
            isDark ? 'border-zinc-700 bg-zinc-950/50' : 'border-zinc-300 bg-white'
          }`}
          role="alertdialog"
        >
          <p className={`font-semibold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
            Rotate this subscribe URL?
          </p>
          <p className={isDark ? 'text-zinc-400' : 'text-zinc-600'}>
            The current URL will stop returning events within five minutes. You will need to
            re-add the new URL on every device that subscribes to it.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={secondaryBtn}
              onClick={() => setConfirmRotate(false)}
              disabled={busy === 'rotate'}
            >
              Cancel
            </button>
            <button
              type="button"
              className={primaryBtn}
              onClick={() => void onRotate()}
              disabled={busy === 'rotate'}
            >
              {busy === 'rotate' ? 'Rotating…' : 'Yes, rotate'}
            </button>
          </div>
        </div>
      )}
    </IntegrationCard>
  );
};

export function registerAppleSubscribeIntegration() {
  registerIntegration({
    id: 'appleSubscribe',
    label: 'Apple / iCloud subscribe URL',
    blurb: 'One-way read-only feed any calendar can subscribe to.',
    iconName: 'Link',
    scope: 'personal',
    roles: [UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.STAFF],
    isAvailable: () => true,
    render: ({ isDark }: IntegrationRenderProps) => <AppleSubscribeCard isDark={isDark} />,
  });
}

export default AppleSubscribeCard;
