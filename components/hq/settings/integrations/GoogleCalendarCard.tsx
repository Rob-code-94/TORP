import React, { useCallback, useEffect, useState } from 'react';
import IntegrationCard, { IntegrationCardSkeleton } from '../IntegrationCard';
import {
  getMyCalendarConnection,
  startGoogleCalendarOAuth,
  disconnectGoogleCalendar,
  setMyCalendarPreferences,
  retryMyCalendarSync,
  isCalendarBackendAvailable,
  formatLastUpdated,
  type MyCalendarConnection,
} from '../../../../lib/calendarIntegrations';
import {
  registerIntegration,
  type IntegrationRenderProps,
  type IntegrationStatus,
} from '../../../../lib/integrations/registry';
import { UserRole } from '../../../../types';

interface GoogleCalendarCardProps {
  isDark: boolean;
}

function statusFromConnection(
  conn: MyCalendarConnection | null,
  fetchError: string | null,
): IntegrationStatus {
  if (fetchError) return 'error';
  if (!conn) return 'not_connected';
  switch (conn.status) {
    case 'connected':
      return conn.lastError ? 'error' : 'connected';
    case 'error':
      return 'error';
    case 'pending':
      return 'pending';
    case 'disconnected':
      return 'not_connected';
    default: {
      const _exhaustive: never = conn.status;
      return _exhaustive;
    }
  }
}

const GoogleCalendarCard: React.FC<GoogleCalendarCardProps> = ({ isDark }) => {
  const [conn, setConn] = useState<MyCalendarConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<'connect' | 'disconnect' | 'toggle' | 'retry' | null>(null);
  const [retryStatus, setRetryStatus] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  const backendAvailable = isCalendarBackendAvailable();

  const refresh = useCallback(async () => {
    if (!backendAvailable) {
      setConn(null);
      setLoading(false);
      setFetchError(null);
      return;
    }
    setLoading(true);
    const result = await getMyCalendarConnection();
    if (result.ok === false) {
      setFetchError(result.error);
      setConn(null);
    } else {
      setFetchError(null);
      setConn(result.data);
    }
    setLoading(false);
  }, [backendAvailable]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onConnect = async () => {
    setBusy('connect');
    setActionError(null);
    const result = await startGoogleCalendarOAuth();
    if (result.ok === false) {
      setActionError(result.error);
      setBusy(null);
      return;
    }
    if (typeof window !== 'undefined') {
      const popup = window.open(
        result.data.authUrl,
        'torp_google_oauth',
        'width=500,height=620,noopener,noreferrer',
      );
      if (!popup) {
        window.location.href = result.data.authUrl;
      }
    }
    setBusy(null);
  };

  const onDisconnect = async () => {
    setBusy('disconnect');
    setActionError(null);
    const result = await disconnectGoogleCalendar();
    if (result.ok === false) {
      setActionError(result.error);
    } else {
      await refresh();
    }
    setBusy(null);
    setConfirmDisconnect(false);
  };

  const onRetry = async () => {
    setBusy('retry');
    setActionError(null);
    setRetryStatus(null);
    const result = await retryMyCalendarSync();
    if (result.ok === false) {
      setActionError(result.error);
    } else {
      setRetryStatus(`Re-synced ${result.data.pushed} event${result.data.pushed === 1 ? '' : 's'}.`);
      await refresh();
    }
    setBusy(null);
  };

  const onTogglePref = async (key: 'pushEnabled' | 'freebusyEnabled', value: boolean) => {
    if (!conn) return;
    setBusy('toggle');
    setActionError(null);
    setConn({ ...conn, [key]: value });
    const result = await setMyCalendarPreferences({ [key]: value });
    if (result.ok === false) {
      setActionError(result.error);
      setConn({ ...conn });
    } else {
      setConn(result.data);
    }
    setBusy(null);
  };

  if (loading) return <IntegrationCardSkeleton isDark={isDark} />;

  const status: IntegrationStatus = backendAvailable
    ? statusFromConnection(conn, fetchError)
    : 'coming_soon';
  const statusLine = !backendAvailable
    ? 'Connection becomes available once HQ enables Firebase calendar sync.'
    : conn
      ? `Connected as ${conn.email ?? 'unknown account'}`
      : 'Not connected';
  const lastUpdatedText = backendAvailable && conn ? `Last synced ${formatLastUpdated(conn.lastSyncAt)}` : undefined;
  const errorText = fetchError ?? actionError ?? (conn?.lastError && status === 'error' ? conn.lastError : null) ?? undefined;

  const buttonBase = isDark
    ? 'inline-flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed'
    : 'inline-flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed';
  const primaryBtn = isDark
    ? `${buttonBase} border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-100`
    : `${buttonBase} border-zinc-900 bg-zinc-900 text-white hover:bg-zinc-800`;
  const secondaryBtn = isDark
    ? `${buttonBase} border-zinc-700 bg-zinc-900 text-zinc-100 hover:border-zinc-500`
    : `${buttonBase} border-zinc-300 bg-white text-zinc-900 hover:border-zinc-500`;

  return (
    <IntegrationCard
      isDark={isDark}
      title="Google Calendar"
      blurb="Push your TORP shoots and meetings to your Google calendar, and let TORP read your free/busy when scheduling."
      status={status}
      statusLine={statusLine}
      lastUpdatedText={lastUpdatedText}
      errorText={errorText}
    >
      {!backendAvailable && (
        <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>
          When Firebase calendar sync is enabled, you will be able to connect your Google account
          here without leaving Settings.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {conn ? (
          <>
            <button
              type="button"
              className={secondaryBtn}
              onClick={() => setConfirmDisconnect(true)}
              disabled={busy !== null || !backendAvailable}
            >
              Disconnect
            </button>
            {(status === 'error' || conn.status === 'pending') && (
              <button
                type="button"
                className={primaryBtn}
                onClick={() => void onRetry()}
                disabled={busy !== null || !backendAvailable}
              >
                {busy === 'retry' ? 'Retrying…' : 'Retry sync'}
              </button>
            )}
          </>
        ) : (
          <button
            type="button"
            className={primaryBtn}
            onClick={() => void onConnect()}
            disabled={busy !== null || !backendAvailable}
            aria-label="Connect Google Calendar"
          >
            {busy === 'connect' ? 'Opening Google…' : 'Connect Google Calendar'}
          </button>
        )}
      </div>

      {retryStatus && (
        <p className={`text-[11px] ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>
          {retryStatus}
        </p>
      )}

      {conn && (
        <div className="space-y-2">
          <PrefToggle
            isDark={isDark}
            checked={conn.pushEnabled}
            disabled={busy !== null || !backendAvailable}
            onChange={(v) => void onTogglePref('pushEnabled', v)}
            label="Push my TORP events to Google"
            description="When on, new shoots and meetings appear on your primary Google calendar within seconds."
          />
          <PrefToggle
            isDark={isDark}
            checked={conn.freebusyEnabled}
            disabled={busy !== null || !backendAvailable}
            onChange={(v) => void onTogglePref('freebusyEnabled', v)}
            label="Let TORP read my Google free/busy"
            description="Used to detect schedule conflicts. We never read event titles or attendees."
          />
        </div>
      )}

      {confirmDisconnect && (
        <div
          className={`rounded-lg border p-3 text-xs space-y-2 ${
            isDark ? 'border-zinc-700 bg-zinc-950/50' : 'border-zinc-300 bg-white'
          }`}
          role="alertdialog"
        >
          <p className={`font-semibold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
            Disconnect Google Calendar?
          </p>
          <p className={isDark ? 'text-zinc-400' : 'text-zinc-600'}>
            New TORP events will stop appearing on your Google calendar. Existing copies stay where
            they are; you can delete them manually in Google.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={secondaryBtn}
              onClick={() => setConfirmDisconnect(false)}
              disabled={busy === 'disconnect'}
            >
              Cancel
            </button>
            <button
              type="button"
              className={primaryBtn}
              onClick={() => void onDisconnect()}
              disabled={busy === 'disconnect'}
            >
              {busy === 'disconnect' ? 'Disconnecting…' : 'Yes, disconnect'}
            </button>
          </div>
        </div>
      )}
    </IntegrationCard>
  );
};

const PrefToggle: React.FC<{
  isDark: boolean;
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}> = ({ isDark, label, description, checked, disabled, onChange }) => (
  <label className={`flex items-start gap-3 min-w-0 ${disabled ? 'opacity-60' : ''}`}>
    <input
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={(e) => onChange(e.target.checked)}
      className={isDark ? 'mt-1 accent-white' : 'mt-1 accent-zinc-900'}
    />
    <span className="min-w-0">
      <span className={`block text-xs font-semibold ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
        {label}
      </span>
      <span className={`block text-[11px] ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>
        {description}
      </span>
    </span>
  </label>
);

/**
 * Registers the Google Calendar integration into the registry.
 * Called by `lib/integrations/register.ts`.
 */
export function registerGoogleCalendarIntegration() {
  registerIntegration({
    id: 'googleCalendar',
    label: 'Google Calendar',
    blurb: 'Push and free/busy sync with your Google account.',
    iconName: 'Calendar',
    scope: 'personal',
    roles: [UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.STAFF],
    isAvailable: () => true,
    render: ({ isDark }: IntegrationRenderProps) => <GoogleCalendarCard isDark={isDark} />,
  });
}

export default GoogleCalendarCard;
