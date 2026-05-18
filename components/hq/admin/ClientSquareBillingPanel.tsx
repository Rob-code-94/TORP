import React, { useCallback, useEffect, useState } from 'react';
import { Link2, RefreshCcw } from 'lucide-react';
import SquareInvoiceActions from './square/SquareInvoiceActions';
import { doc, updateDoc } from 'firebase/firestore';
import { getFirebaseFirestoreInstance, isFirebaseConfigured } from '../../../lib/firebase';
import { squareApiFetch } from '../../../lib/square/browser-fetch';
import { clientHasSyncableEmailForSquare } from '../../../lib/square/syncable-email';
import { appInputClass, appLinkMutedClass, appPanelClass } from '../../../lib/appThemeClasses';
import type { ClientProfile } from '../../../types';

type SquareLinkMatch = {
  id: string;
  givenName?: string | null;
  familyName?: string | null;
  emailAddress?: string | null;
};

type SquareActivityInvoice = Record<string, unknown>;
type SquareActivityPayment = Record<string, unknown>;

interface ClientSquareBillingPanelProps {
  client: ClientProfile;
  isDark: boolean;
  onLinked?: () => void;
}

function formatMoney(n?: number): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function invoiceStatusLabel(inv: SquareActivityInvoice): string {
  const s = inv.status;
  return typeof s === 'string' ? s : '—';
}

const ClientSquareBillingPanel: React.FC<ClientSquareBillingPanelProps> = ({
  client,
  isDark,
  onLinked,
}) => {
  const [linkBusy, setLinkBusy] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [activityLoading, setActivityLoading] = useState(false);
  const [invoices, setInvoices] = useState<SquareActivityInvoice[]>([]);
  const [payments, setPayments] = useState<SquareActivityPayment[]>([]);
  const [pickDialogOpen, setPickDialogOpen] = useState(false);
  const [linkCandidates, setLinkCandidates] = useState<SquareLinkMatch[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showActivity, setShowActivity] = useState(false);

  const linked = Boolean(client.squareCustomerId?.trim());
  const canCreateInSquare = clientHasSyncableEmailForSquare(client);
  const billing = client.billing;

  const loadActivity = useCallback(async () => {
    if (!linked) return;
    setActivityLoading(true);
    setError(null);
    try {
      const res = await squareApiFetch(
        `/api/square/activity?clientId=${encodeURIComponent(client.id)}`,
      );
      const data = (await res.json()) as {
        error?: string;
        invoices?: SquareActivityInvoice[];
        payments?: SquareActivityPayment[];
      };
      if (!res.ok) {
        setError(data.error ?? 'Could not load activity');
        setInvoices([]);
        setPayments([]);
      } else {
        setInvoices(data.invoices ?? []);
        setPayments(data.payments ?? []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Activity load failed');
    }
    setActivityLoading(false);
  }, [client.id, linked]);

  useEffect(() => {
    if (showActivity && linked) void loadActivity();
  }, [showActivity, linked, loadActivity]);

  const ensureInSquare = async () => {
    setLinkBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await squareApiFetch('/api/square/ensure-customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: client.id }),
      });
      const data = (await res.json()) as {
        error?: string;
        status?: string;
        matches?: SquareLinkMatch[];
      };
      if (!res.ok) {
        setError(data.error ?? 'Could not create in Square');
        return;
      }
      if (data.status === 'choose' && data.matches?.length) {
        setLinkCandidates(data.matches);
        setPickDialogOpen(true);
        return;
      }
      if (data.status === 'created') {
        setMessage('Created in Square directory and linked.');
        onLinked?.();
        return;
      }
      if (data.status === 'linked' || data.status === 'already_linked') {
        setMessage(data.status === 'already_linked' ? 'Already linked to Square.' : 'Linked to Square.');
        onLinked?.();
        return;
      }
      if (data.status === 'skipped_no_email') {
        setMessage('Add a real email to this client before creating in Square.');
        return;
      }
      setMessage('Square ensure completed.');
      onLinked?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Square create failed');
    } finally {
      setLinkBusy(false);
    }
  };

  const linkSquare = async (squareCustomerId?: string) => {
    setLinkBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await squareApiFetch('/api/square/link-by-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: client.id,
          squareCustomerId: squareCustomerId || undefined,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        status?: string;
        matches?: SquareLinkMatch[];
        squareEnvironment?: string;
        directoryCustomerCount?: number;
        searchedEmail?: string;
      };
      if (!res.ok) {
        setError(data.error ?? 'Link failed');
        return;
      }
      if (data.status === 'choose' && data.matches?.length) {
        setLinkCandidates(data.matches);
        setPickDialogOpen(true);
        return;
      }
      if (data.status === 'no_match') {
        const envNote = data.squareEnvironment ? ` (${data.squareEnvironment})` : '';
        const dirNote =
          data.directoryCustomerCount != null
            ? ` Square directory has ${data.directoryCustomerCount} customers${envNote}.`
            : '';
        setMessage(
          `No Square customer matched ${data.searchedEmail ?? client.billingEmail ?? client.email}.${dirNote}`,
        );
        return;
      }
      if (data.status === 'created') {
        setMessage('Created in Square directory and linked.');
        onLinked?.();
        return;
      }
      if (data.status === 'linked' || data.status === 'already_linked') {
        setMessage(data.status === 'already_linked' ? 'Already linked to Square.' : 'Linked to Square.');
        onLinked?.();
        return;
      }
      setMessage('Link request completed.');
      onLinked?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Link failed');
    } finally {
      setLinkBusy(false);
    }
  };

  const syncFromSquare = async () => {
    setSyncing(true);
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
        setMessage('Billing synced from Square.');
        onLinked?.();
        if (showActivity) void loadActivity();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sync failed');
    }
    setSyncing(false);
  };

  const saveBillingPatch = async (patch: Record<string, unknown>) => {
    if (!isFirebaseConfigured()) return;
    const db = getFirebaseFirestoreInstance();
    const prev = { ...(client.billing ?? {}) };
    await updateDoc(doc(db, 'clients', client.id), {
      billing: { ...prev, ...patch },
    });
    onLinked?.();
  };

  const saveContractNotes = async (notes: string) => {
    await saveBillingPatch({ contractNotes: notes || null });
  };

  const toggleContractSigned = async (signed: boolean) => {
    await saveBillingPatch({
      contractSigned: signed,
      contractSignedAt: signed ? new Date().toISOString().slice(0, 10) : null,
    });
    setMessage(signed ? 'Contract marked signed.' : 'Contract marked unsigned.');
  };

  return (
    <div className={`mt-6 rounded-xl p-4 space-y-4 min-w-0 ${appPanelClass(isDark)}`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between min-w-0">
        <div className="min-w-0">
          <p className={`text-xs font-mono uppercase ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>
            Square billing
          </p>
          <p className={`text-sm mt-0.5 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
            {linked
              ? `Linked · ${client.squareCustomerId}`
              : 'Not linked — match by billing or contact email'}
          </p>
          {client.billingSquareSyncedAt && (
            <p className="text-[11px] text-zinc-500 mt-1">
              Last sync {client.billingSquareSyncedAt}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap shrink-0">
          {!linked && (
            <>
              <button
                type="button"
                disabled={linkBusy}
                onClick={() => void linkSquare()}
                className={
                  isDark
                    ? 'w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-md border border-zinc-600 px-3 py-1.5 text-xs font-semibold text-zinc-100 disabled:opacity-50'
                    : 'w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-900 disabled:opacity-50'
                }
              >
                <Link2 size={14} />
                {linkBusy ? 'Linking…' : 'Link from email'}
              </button>
              {canCreateInSquare && (
                <button
                  type="button"
                  disabled={linkBusy}
                  onClick={() => void ensureInSquare()}
                  className={
                    isDark
                      ? 'w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-md border border-zinc-500 bg-zinc-100/10 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50'
                      : 'w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50'
                  }
                >
                  {linkBusy ? 'Working…' : 'Create in Square'}
                </button>
              )}
            </>
          )}
          {linked && (
            <button
              type="button"
              disabled={syncing}
              onClick={() => void syncFromSquare()}
              className={
                isDark
                  ? 'w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-md border border-zinc-600 px-3 py-1.5 text-xs font-semibold text-zinc-100 disabled:opacity-50'
                  : 'w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-900 disabled:opacity-50'
              }
            >
              <RefreshCcw size={14} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Syncing…' : 'Sync from Square'}
            </button>
          )}
        </div>
      </div>

      {message && <p className="text-xs text-emerald-400/90 break-words">{message}</p>}
      {error && <p className="text-xs text-rose-400 break-words">{error}</p>}

      {billing && (
        <dl className={`grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs min-w-0 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
          <div>
            <dt className="text-zinc-500">Balance</dt>
            <dd className={isDark ? 'text-zinc-100 font-semibold' : 'text-zinc-900 font-semibold'}>
              {formatMoney(billing.balance)}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">Status</dt>
            <dd className="truncate">{billing.status ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Due</dt>
            <dd>{billing.dueDate ?? '—'}</dd>
          </div>
          <div className="col-span-2 sm:col-span-1 min-w-0">
            <dt className="text-zinc-500">Invoice</dt>
            <dd className="truncate">{billing.invoiceNumber ?? '—'}</dd>
          </div>
          <div className="col-span-2 sm:col-span-3 min-w-0">
            <SquareInvoiceActions
              isDark={isDark}
              compact
              invoiceUrl={billing.invoiceUrl}
              invoiceNumber={billing.invoiceNumber}
              squareInvoiceId={billing.squareInvoiceId}
            />
          </div>
        </dl>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center min-w-0">
        <label className="inline-flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
          <input
            type="checkbox"
            checked={Boolean(billing?.contractSigned)}
            onChange={(e) => void toggleContractSigned(e.target.checked)}
            className="rounded border-zinc-600"
          />
          Contract signed (CRM)
        </label>
        {billing?.contractSignedAt && (
          <span className="text-xs text-zinc-500">Signed {billing.contractSignedAt}</span>
        )}
      </div>

      {linked && (
        <div className="space-y-2 min-w-0">
          <button
            type="button"
            onClick={() => setShowActivity((v) => !v)}
            className={`text-xs font-semibold ${appLinkMutedClass(isDark)}`}
          >
            {showActivity ? 'Hide' : 'Show'} invoice & payment history
          </button>
          {showActivity && (
            <div className="space-y-3 min-w-0">
              {activityLoading && <p className="text-xs text-zinc-500">Loading activity…</p>}
              {!activityLoading && (
                <>
                  <div className="overflow-x-auto min-w-0 rounded-lg border border-zinc-800/50">
                    <table className="w-full min-w-[480px] text-xs text-left">
                      <thead className={isDark ? 'text-zinc-500 bg-zinc-900/50' : 'text-zinc-600 bg-zinc-50'}>
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
                              No invoices in the last sync window.
                            </td>
                          </tr>
                        ) : (
                          invoices.slice(0, 20).map((inv) => (
                            <tr key={String(inv.id ?? inv.invoiceNumber)} className="border-t border-zinc-800/30">
                              <td className="px-2 py-1.5 truncate max-w-[140px]">
                                {String(inv.invoiceNumber ?? inv.id ?? '—')}
                              </td>
                              <td className="px-2 py-1.5">{invoiceStatusLabel(inv)}</td>
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
                  </div>
                  <div className="overflow-x-auto min-w-0 rounded-lg border border-zinc-800/50">
                    <table className="w-full min-w-[400px] text-xs text-left">
                      <thead className={isDark ? 'text-zinc-500 bg-zinc-900/50' : 'text-zinc-600 bg-zinc-50'}>
                        <tr>
                          <th className="px-2 py-1.5 font-semibold">Payment</th>
                          <th className="px-2 py-1.5 font-semibold">Status</th>
                          <th className="px-2 py-1.5 font-semibold">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payments.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="px-2 py-2 text-zinc-500">
                              No payments in the last 12 months.
                            </td>
                          </tr>
                        ) : (
                          payments.slice(0, 20).map((p) => (
                            <tr key={String(p.id ?? p.createdAt)} className="border-t border-zinc-800/30">
                              <td className="px-2 py-1.5">
                                {p.amountMoney &&
                                typeof p.amountMoney === 'object' &&
                                'amount' in p.amountMoney
                                  ? formatMoney(Number(p.amountMoney.amount) / 100)
                                  : '—'}
                              </td>
                              <td className="px-2 py-1.5">{String(p.status ?? '—')}</td>
                              <td className="px-2 py-1.5">
                                {typeof p.createdAt === 'string' ? p.createdAt.slice(0, 10) : '—'}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      <label className={`block text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>
        Contract notes (CRM)
        <textarea
          defaultValue={billing?.contractNotes ?? ''}
          rows={2}
          className={`${appInputClass(isDark)} mt-1 w-full resize-y min-h-[60px]`}
          onBlur={(e) => {
            const v = e.target.value.trim();
            if (v !== (billing?.contractNotes ?? '')) void saveContractNotes(v);
          }}
        />
      </label>

      {pickDialogOpen && (
        <div
          className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-4 bg-black/60"
          role="dialog"
          aria-modal="true"
        >
          <div className={`w-full max-w-md rounded-xl p-4 space-y-3 min-w-0 ${appPanelClass(isDark)}`}>
            <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
              Choose Square customer
            </p>
            <ul className="space-y-2 max-h-60 overflow-y-auto min-w-0">
              {linkCandidates.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    disabled={linkBusy}
                    onClick={() => {
                      setPickDialogOpen(false);
                      void linkSquare(m.id);
                    }}
                    className={`w-full text-left rounded-lg px-3 py-2 text-xs ${
                      isDark
                        ? 'border border-zinc-700 hover:bg-zinc-800 text-zinc-200'
                        : 'border border-zinc-200 hover:bg-zinc-50 text-zinc-800'
                    }`}
                  >
                    <span className="block font-semibold truncate">
                      {[m.givenName, m.familyName].filter(Boolean).join(' ') || m.id}
                    </span>
                    <span className="block text-zinc-500 truncate">{m.emailAddress ?? m.id}</span>
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => setPickDialogOpen(false)}
              className="text-xs text-zinc-500 underline"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientSquareBillingPanel;
