import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, RotateCw, Search } from 'lucide-react';
import { appPanelClass } from '../../../../lib/appThemeClasses';
import {
  listOrgCalendarConnections,
  forceResyncForUser,
  isCalendarBackendAvailable,
  formatLastUpdated,
  type OrgCalendarConnectionRow,
} from '../../../../lib/calendarIntegrations';

interface AdminOrgConnectionsProps {
  isDark: boolean;
}

type Filter = 'all' | 'connected' | 'errors' | 'not_connected';

function statusLabel(row: OrgCalendarConnectionRow): { label: string; tone: 'ok' | 'err' | 'mute' } {
  if (row.lastError) return { label: 'Error', tone: 'err' };
  switch (row.status) {
    case 'connected':
      return { label: 'Connected', tone: 'ok' };
    case 'pending':
      return { label: 'Pending', tone: 'mute' };
    case 'error':
      return { label: 'Error', tone: 'err' };
    case 'disconnected':
      return { label: 'Not connected', tone: 'mute' };
    default: {
      const _exhaustive: never = row.status;
      return _exhaustive;
    }
  }
}

function filterMatches(row: OrgCalendarConnectionRow, filter: Filter): boolean {
  if (filter === 'all') return true;
  if (filter === 'errors') return Boolean(row.lastError) || row.status === 'error';
  if (filter === 'connected') return row.status === 'connected' && !row.lastError;
  if (filter === 'not_connected') return row.status === 'disconnected';
  return true;
}

function toCsv(rows: OrgCalendarConnectionRow[]): string {
  const header = ['Name', 'Email', 'Provider', 'Status', 'Last sync', 'Last error'];
  const lines = [header.join(',')];
  for (const row of rows) {
    const cells = [
      row.displayName,
      row.email,
      row.provider,
      row.lastError ? 'error' : row.status,
      row.lastSyncAt ?? '',
      row.lastError ?? '',
    ];
    lines.push(cells.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','));
  }
  return lines.join('\n');
}

const AdminOrgConnections: React.FC<AdminOrgConnectionsProps> = ({ isDark }) => {
  const [rows, setRows] = useState<OrgCalendarConnectionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [busyResyncUid, setBusyResyncUid] = useState<string | null>(null);
  const [resyncMessage, setResyncMessage] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');

  const backendAvailable = isCalendarBackendAvailable();

  const refresh = useCallback(async () => {
    if (!backendAvailable) {
      setRows([]);
      setLoading(false);
      setFetchError(null);
      return;
    }
    setLoading(true);
    const result = await listOrgCalendarConnections();
    if (result.ok === false) {
      setFetchError(result.error);
      setRows([]);
    } else {
      setFetchError(null);
      setRows(result.data);
    }
    setLoading(false);
  }, [backendAvailable]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (!filterMatches(row, filter)) return false;
      if (!q) return true;
      return (
        row.displayName.toLowerCase().includes(q) ||
        row.email.toLowerCase().includes(q)
      );
    });
  }, [rows, filter, search]);

  const onForceResync = async (uid: string) => {
    setBusyResyncUid(uid);
    setResyncMessage(null);
    const result = await forceResyncForUser(uid);
    if (result.ok === false) {
      setResyncMessage(result.error);
    } else {
      setResyncMessage('Resync queued.');
      await refresh();
    }
    setBusyResyncUid(null);
  };

  const onExportCsv = () => {
    if (typeof window === 'undefined') return;
    const blob = new Blob([toCsv(filteredRows)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `torp-calendar-connections-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filterButton = (id: Filter, label: string) => {
    const active = filter === id;
    const base = 'rounded-full border px-3 py-1 text-xs font-semibold transition-colors';
    const cls = active
      ? isDark
        ? `${base} border-zinc-200 bg-white text-zinc-900`
        : `${base} border-zinc-900 bg-zinc-900 text-white`
      : isDark
        ? `${base} border-zinc-700 text-zinc-300 hover:border-zinc-500`
        : `${base} border-zinc-300 text-zinc-700 hover:border-zinc-500`;
    return (
      <button key={id} type="button" className={cls} onClick={() => setFilter(id)}>
        {label}
      </button>
    );
  };

  return (
    <div className={`rounded-xl p-4 sm:p-5 space-y-3 min-w-0 ${appPanelClass(isDark)}`}>
      {!backendAvailable && (
        <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
          The org connections audit becomes available once Firebase calendar sync is enabled.
        </p>
      )}

      {backendAvailable && (
        <>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between min-w-0">
            <div className="flex flex-wrap gap-1.5">
              {filterButton('all', 'All')}
              {filterButton('connected', 'Connected')}
              {filterButton('errors', 'Errors')}
              {filterButton('not_connected', 'Not connected')}
            </div>
            <label className="relative w-full sm:w-72 min-w-0">
              <span className="sr-only">Search</span>
              <Search
                size={14}
                className={`pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 ${
                  isDark ? 'text-zinc-500' : 'text-zinc-400'
                }`}
                aria-hidden
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name or email"
                className={`w-full rounded-md border pl-7 pr-3 py-1.5 text-xs min-w-0 ${
                  isDark
                    ? 'border-zinc-700 bg-zinc-900 text-zinc-100 placeholder:text-zinc-500'
                    : 'border-zinc-300 bg-white text-zinc-900 placeholder:text-zinc-400'
                }`}
              />
            </label>
          </div>

          {fetchError && (
            <p
              className={`rounded-md border px-3 py-2 text-xs ${
                isDark
                  ? 'border-red-900/50 bg-red-950/30 text-red-200'
                  : 'border-red-200 bg-red-50 text-red-800'
              }`}
              role="alert"
            >
              {fetchError}
            </p>
          )}

          {loading ? (
            <ul className="space-y-2 motion-safe:animate-pulse" aria-busy>
              {[0, 1, 2].map((i) => (
                <li
                  key={i}
                  className={`h-12 rounded-md ${isDark ? 'bg-zinc-800/60' : 'bg-zinc-100'}`}
                />
              ))}
            </ul>
          ) : filteredRows.length === 0 ? (
            <p className={`text-sm ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>
              No matching connections.
            </p>
          ) : (
            <>
              <ul className="md:hidden space-y-2 min-w-0">
                {filteredRows.map((row) => {
                  const s = statusLabel(row);
                  return (
                    <li
                      key={row.uid}
                      className={`rounded-md border p-3 text-xs space-y-1 min-w-0 ${
                        isDark ? 'border-zinc-800 bg-zinc-950/60' : 'border-zinc-200 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 min-w-0">
                        <span className={`font-semibold truncate ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                          {row.displayName}
                        </span>
                        <span className={pillClassName(s.tone, isDark)}>{s.label}</span>
                      </div>
                      <p className={`truncate ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>{row.email}</p>
                      <p className={isDark ? 'text-zinc-500' : 'text-zinc-600'}>
                        Last sync · {formatLastUpdated(row.lastSyncAt)}
                      </p>
                      {row.lastError && (
                        <p
                          className={isDark ? 'text-red-300 break-words' : 'text-red-700 break-words'}
                        >
                          {row.lastError}
                        </p>
                      )}
                      <button
                        type="button"
                        className={`inline-flex items-center gap-1 text-[11px] font-semibold underline ${
                          isDark ? 'text-zinc-200 hover:text-white' : 'text-zinc-800 hover:text-black'
                        }`}
                        onClick={() => void onForceResync(row.uid)}
                        disabled={busyResyncUid === row.uid}
                      >
                        <RotateCw size={12} />
                        {busyResyncUid === row.uid ? 'Queued…' : 'Force resync'}
                      </button>
                    </li>
                  );
                })}
              </ul>
              <table className="hidden md:table w-full text-xs">
                <thead>
                  <tr className={isDark ? 'text-zinc-500' : 'text-zinc-500'}>
                    <th className="text-left py-2 pr-2 font-semibold uppercase tracking-wide">Name</th>
                    <th className="text-left py-2 pr-2 font-semibold uppercase tracking-wide">Email</th>
                    <th className="text-left py-2 pr-2 font-semibold uppercase tracking-wide">Status</th>
                    <th className="text-left py-2 pr-2 font-semibold uppercase tracking-wide">Last sync</th>
                    <th className="text-left py-2 pr-2 font-semibold uppercase tracking-wide">Last error</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody className={isDark ? 'divide-y divide-zinc-800' : 'divide-y divide-zinc-200'}>
                  {filteredRows.map((row) => {
                    const s = statusLabel(row);
                    return (
                      <tr key={row.uid} className={isDark ? 'text-zinc-200' : 'text-zinc-800'}>
                        <td className="py-2 pr-2 font-semibold">{row.displayName}</td>
                        <td className="py-2 pr-2 truncate max-w-[18rem]">{row.email}</td>
                        <td className="py-2 pr-2">
                          <span className={pillClassName(s.tone, isDark)}>{s.label}</span>
                        </td>
                        <td className="py-2 pr-2 whitespace-nowrap">{formatLastUpdated(row.lastSyncAt)}</td>
                        <td
                          className={`py-2 pr-2 max-w-[14rem] truncate ${
                            row.lastError
                              ? isDark
                                ? 'text-red-300'
                                : 'text-red-700'
                              : isDark
                                ? 'text-zinc-500'
                                : 'text-zinc-500'
                          }`}
                          title={row.lastError ?? ''}
                        >
                          {row.lastError ?? '—'}
                        </td>
                        <td className="py-2 text-right">
                          <button
                            type="button"
                            className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold ${
                              isDark
                                ? 'border-zinc-700 text-zinc-200 hover:border-zinc-500'
                                : 'border-zinc-300 text-zinc-800 hover:border-zinc-500'
                            }`}
                            onClick={() => void onForceResync(row.uid)}
                            disabled={busyResyncUid === row.uid}
                          >
                            <RotateCw size={12} />
                            {busyResyncUid === row.uid ? 'Queued…' : 'Resync'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-2 min-w-0">
            <button
              type="button"
              className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold ${
                isDark
                  ? 'border-zinc-700 text-zinc-200 hover:border-zinc-500'
                  : 'border-zinc-300 text-zinc-800 hover:border-zinc-500'
              }`}
              onClick={onExportCsv}
              disabled={filteredRows.length === 0}
            >
              <Download size={14} />
              Export CSV
            </button>
            {resyncMessage && (
              <span className={`text-xs ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>
                {resyncMessage}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
};

function pillClassName(tone: 'ok' | 'err' | 'mute', isDark: boolean): string {
  const base = 'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide';
  if (tone === 'ok') {
    return isDark
      ? `${base} border-emerald-700/50 bg-emerald-950/40 text-emerald-200`
      : `${base} border-emerald-200 bg-emerald-50 text-emerald-800`;
  }
  if (tone === 'err') {
    return isDark
      ? `${base} border-red-700/50 bg-red-950/40 text-red-200`
      : `${base} border-red-200 bg-red-50 text-red-800`;
  }
  return isDark
    ? `${base} border-zinc-700 bg-zinc-900 text-zinc-300`
    : `${base} border-zinc-200 bg-zinc-50 text-zinc-700`;
}

export default AdminOrgConnections;
