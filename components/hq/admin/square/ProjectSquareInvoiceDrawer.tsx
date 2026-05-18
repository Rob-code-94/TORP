import React, { useMemo, useState } from 'react';
import { squareApiFetch } from '../../../../lib/square/browser-fetch';
import { appInputClass } from '../../../../lib/appThemeClasses';
import type { AdminProposal, ClientProfile } from '../../../../types';
import AdminFormDrawer from '../AdminFormDrawer';
import SquareInvoiceActions from './SquareInvoiceActions';

type LineRow = { label: string; amount: string };

interface ProjectSquareInvoiceDrawerProps {
  open: boolean;
  onClose: () => void;
  isDark: boolean;
  client: ClientProfile;
  projectId: string;
  projectTitle: string;
  proposal?: AdminProposal;
  onDone?: () => void;
}

const ProjectSquareInvoiceDrawer: React.FC<ProjectSquareInvoiceDrawerProps> = ({
  open,
  onClose,
  isDark,
  client,
  projectId,
  projectTitle,
  proposal,
  onDone,
}) => {
  const defaultLines = useMemo<LineRow[]>(() => {
    if (proposal?.lineItems?.length) {
      return proposal.lineItems.map((li) => ({
        label: li.label,
        amount: String(li.amount),
      }));
    }
    return [{ label: `${projectTitle} — services`, amount: proposal?.total ? String(proposal.total) : '' }];
  }, [proposal, projectTitle]);

  const [lines, setLines] = useState<LineRow[]>(defaultLines);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().slice(0, 10);
  });
  const [memo, setMemo] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<{
    squareInvoiceId: string;
    version?: number;
    hqInvoiceId?: string | null;
    publicUrl?: string | null;
    status?: string;
  } | null>(null);

  React.useEffect(() => {
    if (open) {
      setLines(defaultLines);
      setDraft(null);
      setError(null);
    }
  }, [open, defaultLines]);

  const parsedLines = lines
    .map((li) => ({ label: li.label.trim(), amount: Number(li.amount) }))
    .filter((li) => li.label && Number.isFinite(li.amount) && li.amount > 0);

  const createDraft = async () => {
    if (!parsedLines.length) {
      setError('Add at least one line item with a positive amount.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await squareApiFetch('/api/square/invoices/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: client.id,
          projectId,
          lineItems: parsedLines,
          dueDate,
          memo: memo.trim() || undefined,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        squareInvoiceId?: string;
        version?: number;
        hqInvoiceId?: string | null;
        publicUrl?: string | null;
        status?: string;
      };
      if (!res.ok) {
        setError(data.error ?? 'Create failed');
        return;
      }
      setDraft({
        squareInvoiceId: data.squareInvoiceId!,
        version: data.version,
        hqInvoiceId: data.hqInvoiceId,
        publicUrl: data.publicUrl,
        status: data.status,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create failed');
    }
    setBusy(false);
  };

  const publish = async () => {
    if (!draft?.squareInvoiceId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await squareApiFetch('/api/square/invoices/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: client.id,
          projectId,
          squareInvoiceId: draft.squareInvoiceId,
          version: draft.version,
          hqInvoiceId: draft.hqInvoiceId ?? undefined,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        publicUrl?: string | null;
        status?: string;
        hqInvoiceId?: string | null;
      };
      if (!res.ok) {
        setError(data.error ?? 'Publish failed');
        return;
      }
      setDraft((prev) =>
        prev
          ? {
              ...prev,
              publicUrl: data.publicUrl ?? prev.publicUrl,
              status: data.status ?? prev.status,
              hqInvoiceId: data.hqInvoiceId ?? prev.hqInvoiceId,
            }
          : prev,
      );
      onDone?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Publish failed');
    }
    setBusy(false);
  };

  return (
    <AdminFormDrawer
      open={open}
      onClose={onClose}
      title="Square invoice"
      footer={
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end min-w-0">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300"
          >
            Close
          </button>
          {!draft && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void createDraft()}
              className="rounded-md border border-zinc-500 bg-zinc-100/10 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              {busy ? 'Creating…' : 'Create draft'}
            </button>
          )}
          {draft && !draft.publicUrl && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void publish()}
              className="rounded-md border border-zinc-500 bg-zinc-100/10 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              {busy ? 'Publishing…' : 'Publish & get link'}
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-4 min-w-0">
        <p className="text-xs text-zinc-500">
          Creates a Square invoice for {client.company || client.name}. After publish, share the hosted
          payment link. Attach contracts in Square Dashboard if needed.
        </p>

        {!draft && (
          <>
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase text-zinc-500">Line items</p>
              {lines.map((row, idx) => (
                <div key={idx} className="flex flex-col gap-2 sm:flex-row min-w-0">
                  <input
                    value={row.label}
                    onChange={(e) => {
                      const next = [...lines];
                      next[idx] = { ...next[idx]!, label: e.target.value };
                      setLines(next);
                    }}
                    placeholder="Description"
                    className={`${appInputClass(isDark)} flex-1 min-w-0`}
                  />
                  <input
                    value={row.amount}
                    onChange={(e) => {
                      const next = [...lines];
                      next[idx] = {
                        ...next[idx]!,
                        amount: e.target.value.replace(/[^\d.]/g, ''),
                      };
                      setLines(next);
                    }}
                    placeholder="Amount"
                    className={`${appInputClass(isDark)} w-full sm:w-28`}
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={() => setLines((prev) => [...prev, { label: '', amount: '' }])}
                className="text-xs text-zinc-400 underline"
              >
                Add line
              </button>
            </div>
            <label className="block text-xs text-zinc-500">
              Due date
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className={`${appInputClass(isDark)} mt-1 w-full`}
              />
            </label>
            <label className="block text-xs text-zinc-500">
              Memo (optional)
              <textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                rows={2}
                className={`${appInputClass(isDark)} mt-1 w-full resize-y`}
              />
            </label>
          </>
        )}

        {draft && (
          <div className="space-y-3 rounded-lg border border-zinc-800 p-3">
            <p className="text-sm text-zinc-300">
              Draft created · status <span className="font-mono text-white">{draft.status ?? 'DRAFT'}</span>
            </p>
            {draft.publicUrl ? (
              <SquareInvoiceActions
                isDark={isDark}
                invoiceUrl={draft.publicUrl}
                squareInvoiceId={draft.squareInvoiceId}
              />
            ) : (
              <p className="text-xs text-zinc-500">Publish to generate the hosted payment link.</p>
            )}
          </div>
        )}

        {error && <p className="text-xs text-rose-400">{error}</p>}
      </div>
    </AdminFormDrawer>
  );
};

export default ProjectSquareInvoiceDrawer;
