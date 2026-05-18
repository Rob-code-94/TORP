import React, { useCallback, useEffect, useState } from 'react';
import { ExternalLink, RefreshCcw } from 'lucide-react';
import IntegrationCard, { IntegrationCardSkeleton } from '../IntegrationCard';
import {
  registerIntegration,
  type IntegrationRenderProps,
  type IntegrationStatus,
} from '../../../../lib/integrations/registry';
import { squareApiFetch } from '../../../../lib/square/browser-fetch';
import { SQUARE_CONTRACTS_DASHBOARD_URL } from '../../../../lib/square/contracts';
import { UserRole } from '../../../../types';

interface SquareCardProps {
  isDark: boolean;
}

type HealthPayload = {
  ok?: boolean;
  error?: string;
  squareEnvironment?: string;
  locationCount?: number;
  locationIdConfigured?: boolean;
  activeLocationId?: string | null;
  activeLocationName?: string | null;
  directoryCustomerCount?: number;
};

const SquareCard: React.FC<SquareCardProps> = ({ isDark }) => {
  const [health, setHealth] = useState<HealthPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<'health' | 'sync' | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await squareApiFetch('/api/square/health');
      const data = (await res.json()) as HealthPayload;
      if (!res.ok) {
        setFetchError(data.error ?? `Health check failed (${res.status})`);
        setHealth(null);
      } else {
        setHealth(data);
      }
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : 'Could not reach Square API');
      setHealth(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onSyncLocation = async () => {
    setBusy('sync');
    setActionError(null);
    setSyncResult(null);
    try {
      const res = await squareApiFetch('/api/square/sync-location', { method: 'POST' });
      const data = (await res.json()) as {
        error?: string;
        clientsUpdated?: number;
        customersConsidered?: number;
        errors?: string[];
      };
      if (!res.ok) {
        setActionError(data.error ?? `Sync failed (${res.status})`);
      } else {
        const errNote = data.errors?.length ? ` (${data.errors.length} errors)` : '';
        setSyncResult(
          `Updated ${data.clientsUpdated ?? 0} client(s) from ${data.customersConsidered ?? 0} Square customer(s).${errNote}`,
        );
        await refresh();
      }
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Sync failed');
    }
    setBusy(null);
  };

  if (loading) return <IntegrationCardSkeleton isDark={isDark} />;

  const status: IntegrationStatus = fetchError
    ? 'error'
    : health?.ok
      ? 'connected'
      : 'not_connected';

  return (
    <IntegrationCard
      isDark={isDark}
      title="Square"
      status={status}
      statusLabel={
        status === 'connected'
          ? health?.activeLocationName
            ? `Connected · ${health.activeLocationName}`
            : 'Connected'
          : status === 'error'
            ? 'Error'
            : 'Not configured'
      }
      description="Sync customer billing from your TORP Square merchant account. Project invoices in Financials stay manual."
    >
      <div className="space-y-3 min-w-0">
        {fetchError && <p className="text-xs text-rose-400 break-words">{fetchError}</p>}
        {health?.ok && (
          <dl className={`text-xs space-y-1 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5">
              <dt className="text-zinc-500">Environment</dt>
              <dd className={isDark ? 'text-zinc-200' : 'text-zinc-800'}>{health.squareEnvironment}</dd>
            </div>
            {health.directoryCustomerCount != null && (
              <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                <dt className="text-zinc-500">Directory customers</dt>
                <dd className={isDark ? 'text-zinc-200' : 'text-zinc-800'}>{health.directoryCustomerCount}</dd>
              </div>
            )}
            {health.activeLocationId && (
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 min-w-0">
                <dt className="text-zinc-500 shrink-0">Location</dt>
                <dd className={`truncate min-w-0 ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                  {health.activeLocationName ?? health.activeLocationId}
                </dd>
              </div>
            )}
          </dl>
        )}
        {actionError && <p className="text-xs text-rose-400 break-words">{actionError}</p>}
        {syncResult && <p className="text-xs text-emerald-400/90 break-words">{syncResult}</p>}
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void refresh()}
            className={
              isDark
                ? 'w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-md border border-zinc-600 px-3 py-1.5 text-xs font-semibold text-zinc-200 disabled:opacity-50'
                : 'w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-800 disabled:opacity-50'
            }
          >
            <RefreshCcw size={14} className={busy === 'health' ? 'animate-spin' : ''} />
            Refresh status
          </button>
          <button
            type="button"
            disabled={busy !== null || !health?.ok}
            onClick={() => void onSyncLocation()}
            className={
              isDark
                ? 'w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-md border border-zinc-500 bg-zinc-100/10 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50'
                : 'w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50'
            }
          >
            {busy === 'sync' ? 'Syncing…' : 'Sync all linked clients'}
          </button>
          <a
            href={SQUARE_CONTRACTS_DASHBOARD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={
              isDark
                ? 'w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:text-white'
                : 'w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-md border border-zinc-300 px-3 py-1.5 text-xs text-zinc-700 hover:text-zinc-900'
            }
          >
            Square dashboard
            <ExternalLink size={12} />
          </a>
        </div>
      </div>
    </IntegrationCard>
  );
};

export function registerSquareIntegration() {
  registerIntegration({
    id: 'square',
    label: 'Square',
    blurb: 'Payment sync and customer billing from Square.',
    iconName: 'CreditCard',
    scope: 'org',
    roles: [UserRole.ADMIN],
    isAvailable: () => true,
    render: ({ isDark }: IntegrationRenderProps) => <SquareCard isDark={isDark} />,
  });
}

export default SquareCard;
