import React, { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import {
  createProposal,
  updateProposal,
} from '../../../../data/financeApi';
import { SQUARE_CONTRACTS_DASHBOARD_URL } from '../../../../lib/square/contracts';
import { proposalIsComplete } from '../../../../lib/square/billing-summary';
import { appInputClass, appPanelClass } from '../../../../lib/appThemeClasses';
import type { AdminProposal, ProposalContractStatus } from '../../../../types';
import { proposalStatusClassForTheme } from '../adminFormat';

type LineRow = { label: string; amount: string };

interface ProjectProposalPanelProps {
  isDark: boolean;
  theme: 'dark' | 'light';
  projectId: string;
  clientName: string;
  proposal?: AdminProposal;
  canEdit: boolean;
  onUpdated: () => void;
}

const ProjectProposalPanel: React.FC<ProjectProposalPanelProps> = ({
  isDark,
  theme,
  projectId,
  clientName,
  proposal,
  canEdit,
  onUpdated,
}) => {
  const [editing, setEditing] = useState(false);
  const [lines, setLines] = useState<LineRow[]>(
    proposal?.lineItems.map((li) => ({ label: li.label, amount: String(li.amount) })) ?? [
      { label: 'Production services', amount: '' },
    ],
  );
  const [depositPercent, setDepositPercent] = useState(String(proposal?.depositPercent ?? 50));
  const [error, setError] = useState<string | null>(null);

  const setStatus = (contractStatus: ProposalContractStatus, lastEvent: string) => {
    if (!proposal) return;
    try {
      const patch: Partial<AdminProposal> = {
        contractStatus,
        lastEvent,
      };
      if (contractStatus === 'signed') {
        patch.signedAt = new Date().toISOString();
      }
      if (contractStatus === 'sent') {
        patch.viewedAt = undefined;
      }
      updateProposal(proposal.id, patch);
      onUpdated();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update proposal');
    }
  };

  const saveProposal = () => {
    const lineItems = lines
      .map((li) => ({ label: li.label.trim(), amount: Number(li.amount) }))
      .filter((li) => li.label && Number.isFinite(li.amount) && li.amount >= 0);
    if (!lineItems.length) {
      setError('Add at least one line item.');
      return;
    }
    const total = lineItems.reduce((s, li) => s + li.amount, 0);
    const dep = Number(depositPercent);
    try {
      if (proposal) {
        updateProposal(proposal.id, {
          lineItems,
          total,
          depositPercent: Number.isFinite(dep) ? dep : proposal.depositPercent,
          lastEvent: 'Updated in TORP',
        });
      } else {
        createProposal({
          projectId,
          clientName,
          contractStatus: 'draft',
          lineItems,
          total,
          depositPercent: Number.isFinite(dep) ? dep : 50,
          lastEvent: 'Created in TORP',
        });
      }
      setEditing(false);
      onUpdated();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save proposal');
    }
  };

  if (!proposal && !canEdit) {
    return null;
  }

  return (
    <div className={`rounded-xl p-4 min-w-0 space-y-3 ${appPanelClass(isDark)}`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between min-w-0">
        <h3 className="text-sm font-bold text-white">Proposal & contract</h3>
        {canEdit && (
          <div className="flex flex-wrap gap-2 shrink-0">
            {!proposal && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="rounded-md border border-zinc-600 px-2.5 py-1 text-xs text-zinc-100"
              >
                Create proposal
              </button>
            )}
            {proposal && !editing && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="rounded-md border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300"
              >
                Edit
              </button>
            )}
            <a
              href={SQUARE_CONTRACTS_DASHBOARD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-md border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300"
            >
              Square Contracts
              <ExternalLink size={12} />
            </a>
          </div>
        )}
      </div>

      {error && <p className="text-xs text-rose-400">{error}</p>}

      {editing && canEdit && (
        <div className="space-y-2">
          {lines.map((row, idx) => (
            <div key={idx} className="flex flex-col gap-2 sm:flex-row min-w-0">
              <input
                value={row.label}
                onChange={(e) => {
                  const next = [...lines];
                  next[idx] = { ...next[idx]!, label: e.target.value };
                  setLines(next);
                }}
                placeholder="Line item"
                className={`${appInputClass(isDark)} flex-1`}
              />
              <input
                value={row.amount}
                onChange={(e) => {
                  const next = [...lines];
                  next[idx] = { ...next[idx]!, amount: e.target.value.replace(/[^\d.]/g, '') };
                  setLines(next);
                }}
                placeholder="Amount"
                className={`${appInputClass(isDark)} w-full sm:w-28`}
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() => setLines((p) => [...p, { label: '', amount: '' }])}
            className="text-xs text-zinc-500 underline"
          >
            Add line
          </button>
          <label className="block text-xs text-zinc-500">
            Deposit %
            <input
              value={depositPercent}
              onChange={(e) => setDepositPercent(e.target.value.replace(/[^\d]/g, ''))}
              className={`${appInputClass(isDark)} mt-1 w-24`}
            />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setError(null);
              }}
              className="rounded-md border border-zinc-700 px-3 py-1 text-xs text-zinc-400"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={saveProposal}
              className="rounded-md border border-zinc-500 px-3 py-1 text-xs text-white"
            >
              Save proposal
            </button>
          </div>
        </div>
      )}

      {proposal && !editing && (
        <>
          <p className="text-sm text-zinc-400">
            Total: <span className="text-white font-mono">${proposal.total.toLocaleString()}</span> — deposit{' '}
            {proposal.depositPercent}%
          </p>
          <ul className="text-sm text-zinc-300 list-disc list-inside">
            {proposal.lineItems.map((li) => (
              <li key={li.label}>
                {li.label} — ${li.amount.toLocaleString()}
              </li>
            ))}
          </ul>
          {proposal.lastEvent && <p className="text-xs text-zinc-500">{proposal.lastEvent}</p>}
          <span
            className={`inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${proposalStatusClassForTheme(
              proposal.contractStatus,
              theme,
            )}`}
          >
            {proposalIsComplete(proposal.contractStatus) ? 'Completed' : proposal.contractStatus}
          </span>
          {canEdit && (
            <div className="flex flex-wrap gap-2 pt-1">
              {proposal.contractStatus === 'draft' && (
                <button
                  type="button"
                  onClick={() => setStatus('sent', 'Marked sent')}
                  className="rounded-md border border-zinc-700 px-2.5 py-1 text-xs text-zinc-200"
                >
                  Mark sent
                </button>
              )}
              {proposal.contractStatus !== 'signed' && proposal.contractStatus !== 'declined' && (
                <button
                  type="button"
                  onClick={() => setStatus('signed', 'Marked signed')}
                  className="rounded-md border border-emerald-800 px-2.5 py-1 text-xs text-emerald-200"
                >
                  Mark signed
                </button>
              )}
              {proposal.contractStatus !== 'declined' && (
                <button
                  type="button"
                  onClick={() => setStatus('declined', 'Marked declined')}
                  className="rounded-md border border-zinc-800 px-2.5 py-1 text-xs text-zinc-500"
                >
                  Mark declined
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ProjectProposalPanel;
