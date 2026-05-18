import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCcw } from 'lucide-react';
import { squareApiFetch } from '../../../../lib/square/browser-fetch';
import { ensureSquareCustomerForClient } from '../../../../lib/square/ensure-customer';
import { squareInvoiceStatusLabel } from '../../../../lib/square/map-square-invoice-status';
import { squareBillingSummary } from '../../../../lib/square/billing-summary';
import { appLinkMutedClass, appPanelClass } from '../../../../lib/appThemeClasses';
import type { ClientProfile } from '../../../../types';
import SquareInvoiceActions from './SquareInvoiceActions';

type SquareActivityInvoice = Record<string, unknown>;

interface ProjectSquareBillingCardProps {
  client: ClientProfile | undefined;
  isDark: boolean;
  canWriteSquare: boolean;
  onRefresh?: () => void;
}

function formatMoney(n?: number): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const ProjectSquareBillingCard: React.FC<ProjectSquareBillingCardProps> = ({
  client,
  isDark,
  canWriteSquare,
  onRefresh,
}) => {
  const [busy, setBusy] = useState<'sync' | 'link' | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showActivity, setShowActivity] = useState(false);
  const [activityLoading, setActivityLoading] = useState(false);
  const [invoices, setInvoices] = useState<SquareActivityInvoice[]>([]);

  const linked = Boolean(client?.squareCustomerId?.trim());
  const billing = client?.billing;
  const summary = squareBillingSummary(billing);

  const loadActivity = useCallback(async () => {
    if (!client?.id || !linked) return;
    setActivityLoading(true);
    try {
      const res = await squareApiFetch(
        `/api/square/activity?clientId=${encodeURIComponent(client.id)}`,
      );
      const data = (await res.json()) as { error?: string; invoices?: SquareActivityInvoice[] };
      if (!res.ok) {
        setError(data.error ?? 'Could not load activity');
        setInvoices([]);
      } else {
        setInvoices(data.invoices ?? []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Activity load failed');
    }
    setActivityLoading(false);
  }, [client?.id, linked]);

  useEffect(() => {
    if (showActivity && linked) void loadActivity();
  }, [showActivity, linked, loadActivity]);

  const syncFromSquare = async () => {
    if (!client) return;
    setBusy('sync');
    setError(null);
    setMessage(null);
    try {
      const res = await squareApiFetch('/api/square/sync-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: client.id }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? 'Sync failed');
      } else {
        setMessage('Square billing synced.');
        onRefresh?.();
        if (showActivity) void loadActivity();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sync failed');
    }
    setBusy(null);
  };

  const linkClient = async () => {
    if (!client) return;
    setBusy('link');
    setError(null);
    setMessage(null);
    try {
      const result = await ensureSquareCustomerForClient(client.id);
      if (!result.ok) {
        setError(result.error ?? 'Could not link client in Square');
        return;
      }
      setMessage(
        result.status === 'created'
          ? 'Created and linked in Square.'
          : result.status === 'already_linked'
            ? 'Already linked to Square.'
            : 'Linked to Square.',
      );
      onRefresh?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Link failed');
    }
    setBusy(null);
  };

  if (!client) {
    return (
      <div className={`rounded-xl p-4 min-w-0 ${appPanelClass(isDark)}`}>
        <h3 className="text-sm font-bold text-white mb-2">Square client billing</h3>
        <p className="text-sm text-zinc-500">
          No client linked to this project. Assign a client on the project record to see Square AR.
        </p>
      </div>
    );
  }

  return (
    <div className={`rounded-xl p-4 space-y-4 min-w-0 ${appPanelClass(isDark)}`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between min-w-0">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-white">Square client billing</h3>
          <p className="text-sm text-zinc-400 mt-0.5 truncate">
            {client.company || client.name}
            {linked ? ` · ${client.squareCustomerId}` : ' · Not linked'}
          </p>
          <Link
            to="/hq/admin/clients"
            className={`text-xs mt-1 inline-block ${appLinkMutedClass(isDark)}`}
            onClick={() => {
              try {
                sessionStorage.setItem('torp_edit_client_id', client.id);
              } catch {
                /* ignore */
              }
            }}
          >
            Open client editor
          </Link>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap shrink-0">
          {!linked && canWriteSquare && (
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void linkClient()}
              className="rounded-md border border-zinc-600 px-3 py-1.5 text-xs font-semibold text-zinc-100 disabled:opacity-50"
            >
              {busy === 'link' ? 'Linking…' : 'Link client in Square'}
            </button>
          )}
          {linked && (
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void syncFromSquare()}
              className="inline-flex items-center justify-center gap-1.5 rounded-md border border-zinc-600 px-3 py-1.5 text-xs font-semibold text-zinc-100 disabled:opacity-50"
            >
              <RefreshCcw size={14} className={busy === 'sync' ? 'animate-spin' : ''} />
              {busy === 'sync' ? 'Syncing…' : 'Sync from Square'}
            </button>
          )}
        </div>
      </div>

      {message && <p className="text-xs text-emerald-400/90">{message}</p>}
      {error && <p className="text-xs text-rose-400">{error}</p>}

      {linked && summary && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs min-w-0">
            <div>
              <p className="text-zinc-500 uppercase font-bold">Balance</p>
              <p className="text-lg font-bold text-white mt-0.5">{formatMoney(summary.balance)}</p>
            </div>
            <div>
              <p className="text-zinc-500 uppercase font-bold">Square status</p>
              <p className="text-sm text-zinc-200 mt-0.5">{summary.statusLabel}</p>
              {summary.complete && (
                <span className="mt-1 inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                  Complete
                </span>
              )}
            </div>
            <div>
              <p className="text-zinc-500 uppercase font-bold">Due</p>
              <p className="text-sm text-zinc-200 mt-0.5">{summary.dueDate ?? '—'}</p>
            </div>
            <div>
              <p className="text-zinc-500 uppercase font-bold">Invoice #</p>
              <p className="text-sm text-zinc-200 mt-0.5 truncate">{summary.invoiceNumber ?? '—'}</p>
            </div>
          </div>

          <SquareInvoiceActions
            isDark={isDark}
            invoiceUrl={summary.invoiceUrl}
            invoiceNumber={summary.invoiceNumber}
            squareInvoiceId={summary.squareInvoiceId}
          />

          <button
            type="button"
            onClick={() => setShowActivity((v) => !v)}
            className={`text-xs font-semibold ${appLinkMutedClass(isDark)}`}
          >
            {showActivity ? 'Hide' : 'Show'} Square invoice history
          </button>
          {showActivity && (
            <div className="overflow-x-auto min-w-0 rounded-lg border border-zinc-800/50">
              {activityLoading ? (
                <p className="text-xs text-zinc-500 p-2">Loading…</p>
              ) : (
                <table className="w-full min-w-[420px] text-xs text-left">
                  <thead className="text-zinc-500 bg-zinc-900/50">
                    <tr>
                      <th className="px-2 py-1.5 font-semibold">Invoice</th>
                      <th className="px-2 py-1.5 font-semibold">Status</th>
                      <th className="px-2 py-1.5 font-semibold">Due</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-2 py-2 text-zinc-500">
                          No invoices found.
                        </td>
                      </tr>
                    ) : (
                      invoices.slice(0, 15).map((inv) => (
                        <tr key={String(inv.id ?? inv.invoiceNumber)} className="border-t border-zinc-800/30">
                          <td className="px-2 py-1.5 truncate max-w-[120px]">
                            {String(inv.invoiceNumber ?? inv.id ?? '—')}
                          </td>
                          <td className="px-2 py-1.5">
                            {squareInvoiceStatusLabel(
                              typeof inv.status === 'string' ? inv.status : undefined,
                            )}
                          </td>
                          <td className="px-2 py-1.5">
                            {typeof inv.paymentRequests === 'object' &&
                            Array.isArray(inv.paymentRequests) &&
                            inv.paymentRequests[0] &&
                            typeof inv.paymentRequests[0] === 'object' &&
                            'dueDate' in inv.paymentRequests[0]
                              ? String((inv.paymentRequests[0] as { dueDate?: string }).dueDate ?? '—')
                              : '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </>
      )}

      {linked && !billing && (
        <p className="text-sm text-zinc-500">Linked — sync from Square to load billing summary.</p>
      )}
    </div>
  );
};

export default ProjectSquareBillingCard;
