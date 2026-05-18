import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCcw } from 'lucide-react';
import { getHqClientDirectory } from '../../../data/hqSyncDirectory';
import { useHqOrgTick } from '../HqFirestoreProvider';
import { useAdminTheme } from '../../../lib/adminTheme';
import { appInputClass, appLinkMutedClass, appPanelClass } from '../../../lib/appThemeClasses';
import {
  clientDisplayName,
  isInvoiceOverdue,
  passesCollectionFilter,
  sortClientsForCollections,
  type CollectionQuickFilter,
} from '../../../lib/square/collections';
import { squareApiFetch } from '../../../lib/square/browser-fetch';
import SquareInvoiceActions from './square/SquareInvoiceActions';

const FILTERS: { value: CollectionQuickFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'due_week', label: 'Due this week' },
  { value: 'unlink', label: 'Not linked' },
  { value: 'stale30', label: 'Stale 30d+' },
];

const AdminFinancialsSquare: React.FC = () => {
  const { theme } = useAdminTheme();
  const isDark = theme === 'dark';
  const hqTick = useHqOrgTick();
  const clients = useMemo(() => getHqClientDirectory(), [hqTick]);
  const [filter, setFilter] = useState<CollectionQuickFilter>('all');
  const [squareBusy, setSquareBusy] = useState<'sync' | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const withBilling = useMemo(
    () => clients.filter((c) => c.billing && Object.keys(c.billing).length > 0),
    [clients],
  );

  const totalAR = useMemo(
    () => clients.reduce((s, c) => s + (c.billing?.balance ?? 0), 0),
    [clients],
  );

  const overdueCount = useMemo(
    () =>
      clients.filter((c) => (c.billing?.balance ?? 0) > 0 && isInvoiceOverdue(c.billing?.dueDate))
        .length,
    [clients],
  );

  const linkedCount = useMemo(
    () => clients.filter((c) => c.squareCustomerId?.trim()).length,
    [clients],
  );

  const filtered = useMemo(() => {
    return clients.filter((c) => passesCollectionFilter(c, filter)).sort(sortClientsForCollections);
  }, [clients, filter]);

  const onSyncLocation = async () => {
    setSquareBusy('sync');
    setSyncError(null);
    setSyncMessage(null);
    try {
      const res = await squareApiFetch('/api/square/sync-location', { method: 'POST' });
      const data = (await res.json()) as {
        error?: string;
        clientsUpdated?: number;
        customersConsidered?: number;
      };
      if (!res.ok) {
        setSyncError(data.error ?? 'Sync failed');
      } else {
        setSyncMessage(
          `Updated ${data.clientsUpdated ?? 0} client(s) from ${data.customersConsidered ?? 0} Square customer(s).`,
        );
      }
    } catch (e) {
      setSyncError(e instanceof Error ? e.message : 'Sync failed');
    }
    setSquareBusy(null);
  };

  return (
    <div className="space-y-4 min-w-0" data-tour="financials-square">
      <p className={`text-sm ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>
        Square AR from linked clients. Project invoices remain in the Invoices tab.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 min-w-0">
        <div className={`rounded-xl p-4 min-w-0 ${appPanelClass(isDark)}`}>
          <p className="text-xs uppercase text-zinc-500 font-bold">Square AR</p>
          <p className={`text-2xl font-bold mt-1 ${isDark ? 'text-white' : 'text-zinc-900'}`}>
            ${totalAR.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
          <p className="text-[11px] text-zinc-500 mt-1">{withBilling.length} with billing data</p>
        </div>
        <div className={`rounded-xl p-4 min-w-0 ${appPanelClass(isDark)}`}>
          <p className="text-xs uppercase text-zinc-500 font-bold">Overdue</p>
          <p className={`text-2xl font-bold mt-1 ${isDark ? 'text-white' : 'text-zinc-900'}`}>
            {overdueCount}
          </p>
        </div>
        <div className={`rounded-xl p-4 min-w-0 ${appPanelClass(isDark)}`}>
          <p className="text-xs uppercase text-zinc-500 font-bold">Linked</p>
          <p className={`text-2xl font-bold mt-1 ${isDark ? 'text-white' : 'text-zinc-900'}`}>
            {linkedCount}
          </p>
          <p className="text-[11px] text-zinc-500 mt-1">of {clients.length} clients</p>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end min-w-0">
        <label className="text-xs text-zinc-500 flex flex-col gap-0.5 sm:min-w-[160px]">
          Filter
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as CollectionQuickFilter)}
            className={appInputClass(isDark)}
          >
            {FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          disabled={squareBusy !== null}
          onClick={() => void onSyncLocation()}
          className={
            isDark
              ? 'w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-md border border-zinc-600 px-3 py-1.5 text-xs font-semibold text-zinc-200 disabled:opacity-50'
              : 'w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-800 disabled:opacity-50'
          }
        >
          <RefreshCcw size={14} className={squareBusy === 'sync' ? 'animate-spin' : ''} />
          {squareBusy === 'sync' ? 'Syncing…' : 'Sync from Square'}
        </button>
        <Link to="/hq/admin/settings/integrations" className={`text-xs ${appLinkMutedClass(isDark)}`}>
          Square settings
        </Link>
      </div>

      {syncMessage && <p className="text-xs text-emerald-400/90">{syncMessage}</p>}
      {syncError && <p className="text-xs text-rose-400">{syncError}</p>}

      <div className={`rounded-xl overflow-x-auto min-w-0 ${appPanelClass(isDark)}`}>
        <table className="w-full min-w-[520px] text-sm text-left">
          <thead className={isDark ? 'text-zinc-500 border-b border-zinc-800' : 'text-zinc-600 border-b border-zinc-200'}>
            <tr>
              <th className="px-3 py-2 font-semibold">Client</th>
              <th className="px-3 py-2 font-semibold">Balance</th>
              <th className="px-3 py-2 font-semibold">Status</th>
              <th className="px-3 py-2 font-semibold">Due</th>
              <th className="px-3 py-2 font-semibold">Contract</th>
              <th className="px-3 py-2 font-semibold">Share</th>
              <th className="px-3 py-2 font-semibold">Square</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-4 text-zinc-500 text-xs">
                  No clients match this filter.
                </td>
              </tr>
            ) : (
              filtered.map((c) => (
                <tr
                  key={c.id}
                  className={isDark ? 'border-t border-zinc-800/50' : 'border-t border-zinc-100'}
                >
                  <td className="px-3 py-2 min-w-0">
                    <p className={`font-medium truncate ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                      {c.company}
                    </p>
                    <p className="text-xs text-zinc-500 truncate">{clientDisplayName(c)}</p>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    ${(c.billing?.balance ?? 0).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-xs">{c.billing?.status ?? '—'}</td>
                  <td className="px-3 py-2 text-xs whitespace-nowrap">{c.billing?.dueDate ?? '—'}</td>
                  <td className="px-3 py-2 text-xs whitespace-nowrap">
                    {c.billing?.contractSigned ? (
                      <span className="text-emerald-400">Signed</span>
                    ) : (
                      <span className="text-zinc-500">Pending</span>
                    )}
                  </td>
                  <td className="px-3 py-2 min-w-0">
                    <SquareInvoiceActions
                      isDark={isDark}
                      compact
                      invoiceUrl={c.billing?.invoiceUrl}
                      invoiceNumber={c.billing?.invoiceNumber}
                      squareInvoiceId={c.billing?.squareInvoiceId}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Link
                      to="/hq/admin/clients"
                      className={`text-xs ${appLinkMutedClass(isDark)}`}
                      onClick={() => {
                        try {
                          sessionStorage.setItem('torp_edit_client_id', c.id);
                        } catch {
                          /* ignore */
                        }
                      }}
                    >
                      {c.squareCustomerId ? 'Manage' : 'Link'}
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminFinancialsSquare;
