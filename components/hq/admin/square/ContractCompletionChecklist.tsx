import React from 'react';
import { ExternalLink } from 'lucide-react';
import { SQUARE_CONTRACTS_DASHBOARD_URL } from '../../../../lib/square/contracts';
import { buildBillingCompletionChecklist } from '../../../../lib/square/billing-summary';
import { appPanelClass } from '../../../../lib/appThemeClasses';
import type { AdminInvoice, AdminProposal, ClientProfile } from '../../../../types';

interface ContractCompletionChecklistProps {
  isDark: boolean;
  proposal?: AdminProposal;
  client?: ClientProfile;
  torpInvoices: AdminInvoice[];
  canWriteSquare: boolean;
}

const ContractCompletionChecklist: React.FC<ContractCompletionChecklistProps> = ({
  isDark,
  proposal,
  client,
  torpInvoices,
  canWriteSquare,
}) => {
  const items = buildBillingCompletionChecklist({
    proposalStatus: proposal?.contractStatus,
    contractSigned: client?.billing?.contractSigned,
    billing: client?.billing,
    torpInvoices,
  });

  const allDone = items.every((i) => i.done);

  return (
    <div className={`rounded-xl p-4 space-y-3 min-w-0 ${appPanelClass(isDark)}`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between min-w-0">
        <div>
          <h3 className="text-sm font-bold text-white">Billing completion</h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            {allDone ? 'All tracked items complete.' : 'Outstanding items need attention.'}
          </p>
        </div>
        {canWriteSquare && (
          <a
            href={SQUARE_CONTRACTS_DASHBOARD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 rounded-md border border-zinc-600 px-3 py-1.5 text-xs font-semibold text-zinc-200 shrink-0"
          >
            Square Contracts
            <ExternalLink size={12} />
          </a>
        )}
      </div>
      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item.id}
            className={`flex items-start gap-2 text-sm rounded-lg px-3 py-2 ${
              item.done
                ? 'bg-emerald-950/40 border border-emerald-900/50 text-emerald-100'
                : 'bg-zinc-900/40 border border-zinc-800 text-zinc-300'
            }`}
          >
            <span
              className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center text-[10px] font-bold shrink-0 ${
                item.done ? 'border-emerald-500 bg-emerald-600 text-white' : 'border-zinc-600'
              }`}
              aria-hidden
            >
              {item.done ? '✓' : ''}
            </span>
            <span className="min-w-0">
              <span className="font-medium">{item.label}</span>
              {item.detail && <span className="block text-xs text-zinc-500 mt-0.5">{item.detail}</span>}
            </span>
          </li>
        ))}
      </ul>
      {canWriteSquare && (
        <p className="text-[11px] text-zinc-500">
          Square Contracts are created in the Square Dashboard — attach to invoices there until Square exposes a
          create API.
        </p>
      )}
    </div>
  );
};

export default ContractCompletionChecklist;
