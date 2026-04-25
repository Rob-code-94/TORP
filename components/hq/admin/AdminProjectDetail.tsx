import React, { useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import {
  getActivityByProject,
  getAssetsByProject,
  getExpensesByProject,
  getInvoicesByProject,
  getPlannerByProject,
  getProposalByProject,
  getProjectById,
  getShootsByProject,
} from '../../../data/adminMock';
import {
  assetStatusClass,
  columnLabel,
  formatStage,
  invoiceStatusClass,
  proposalStatusClass,
  stageClass,
  typeLabel,
} from './adminFormat';

type Tab = 'overview' | 'brief' | 'planner' | 'schedule' | 'assets' | 'financials' | 'activity';

const AdminProjectDetail: React.FC = () => {
  const { projectId } = useParams();
  const [tab, setTab] = useState<Tab>('overview');

  const project = projectId ? getProjectById(projectId) : undefined;

  const planner = useMemo(() => (projectId ? getPlannerByProject(projectId) : []), [projectId]);
  const shoots = useMemo(() => (projectId ? getShootsByProject(projectId) : []), [projectId]);
  const assets = useMemo(() => (projectId ? getAssetsByProject(projectId) : []), [projectId]);
  const invoices = useMemo(() => (projectId ? getInvoicesByProject(projectId) : []), [projectId]);
  const proposal = projectId ? getProposalByProject(projectId) : undefined;
  const expenses = useMemo(() => (projectId ? getExpensesByProject(projectId) : []), [projectId]);
  const activity = useMemo(() => (projectId ? getActivityByProject(projectId) : []), [projectId]);

  if (!projectId || !project) {
    return <Navigate to="/hq/admin/projects" replace />;
  }

  const openTotal = invoices.reduce((s, i) => s + (i.amount - i.amountPaid), 0);
  const expenseTotal = expenses.reduce((s, e) => s + e.amount, 0);

  const tabBtn = (id: Tab, label: string) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wide border transition-colors ${
        tab === id
          ? 'bg-white text-black border-white'
          : 'border-zinc-800 text-zinc-500 hover:text-zinc-200 hover:border-zinc-600'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="max-w-6xl min-w-0 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            to="/hq/admin/projects"
            className="inline-flex items-center gap-2 text-xs text-zinc-500 hover:text-white mb-2"
          >
            <ArrowLeft size={14} />
            All projects
          </Link>
          <h2 className="text-2xl font-bold text-white tracking-tight">{project.title}</h2>
          <p className="text-sm text-zinc-500 mt-1">
            {project.clientName} · {project.packageLabel}
          </p>
        </div>
        <div className="flex flex-col sm:items-end gap-2 sm:text-right text-xs text-zinc-500 min-w-0">
          <span className={`self-end text-[10px] uppercase font-bold tracking-wide px-2 py-0.5 rounded ${stageClass(project.stage)}`}>
            {formatStage(project.stage)}
          </span>
          <p className="break-words">
            Due <span className="text-zinc-300 font-mono">{project.dueDate}</span> · Owner{' '}
            <span className="text-zinc-300">{project.ownerName}</span>
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabBtn('overview', 'Overview')}
        {tabBtn('brief', 'Brief')}
        {tabBtn('planner', 'Planner')}
        {tabBtn('schedule', 'Schedule')}
        {tabBtn('assets', 'Assets')}
        {tabBtn('financials', 'Financials')}
        {tabBtn('activity', 'Activity')}
      </div>

      {tab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-zinc-300">
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">Summary</h3>
            <p className="leading-relaxed text-zinc-200">{project.summary}</p>
            <p className="mt-3 text-zinc-500">
              Next: <span className="text-white">{project.nextMilestone}</span>
            </p>
          </div>
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">Deliverables</h3>
            <ul className="list-disc list-inside text-zinc-200 space-y-1">
              {project.deliverables.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {tab === 'brief' && (
        <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-5 space-y-4 text-sm text-zinc-200">
          <div>
            <h3 className="text-xs font-bold uppercase text-zinc-500 mb-1">Brief</h3>
            <p className="leading-relaxed">{project.brief}</p>
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase text-zinc-500 mb-1">Goals</h3>
            <p className="leading-relaxed">{project.goals}</p>
          </div>
          <div className="text-xs text-zinc-500">
            <p>
              <span className="text-zinc-400">Contact</span> {project.contactEmail}
            </p>
            {project.location && (
              <p className="mt-1">
                <span className="text-zinc-400">Location</span> {project.location}
              </p>
            )}
          </div>
        </div>
      )}

      {tab === 'planner' && (
        <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl overflow-x-auto min-w-0">
          {planner.length === 0 ? (
            <p className="p-4 text-sm text-zinc-500">No planner items.</p>
          ) : (
            <table className="w-full text-sm min-w-[720px]">
              <thead className="text-xs text-zinc-500 uppercase border-b border-zinc-800 bg-zinc-950/60">
                <tr>
                  <th className="text-left px-3 py-2">Task</th>
                  <th className="text-left px-3 py-2">Type</th>
                  <th className="text-left px-3 py-2">Column</th>
                  <th className="text-left px-3 py-2">Assignee</th>
                  <th className="text-left px-3 py-2">Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80">
                {planner.map((t) => (
                  <tr key={t.id} className="hover:bg-zinc-900/30">
                    <td className="px-3 py-2.5 text-white">
                      {t.title}
                      {t.done && <span className="ml-2 text-xs text-zinc-500">(done)</span>}
                    </td>
                    <td className="px-3 py-2.5 text-zinc-400">{typeLabel(t.type)}</td>
                    <td className="px-3 py-2.5 text-zinc-500">{columnLabel(t.column)}</td>
                    <td className="px-3 py-2.5 text-zinc-300">{t.assigneeName}</td>
                    <td className="px-3 py-2.5 text-zinc-500 font-mono text-xs">{t.dueDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'schedule' && (
        <div className="space-y-3">
          {shoots.length === 0 ? (
            <p className="text-sm text-zinc-500">No shoot days on this project yet.</p>
          ) : (
            shoots.map((s) => (
              <div
                key={s.id}
                className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4 flex flex-col sm:flex-row sm:justify-between gap-2"
              >
                <div>
                  <p className="text-white font-medium">{s.title}</p>
                  <p className="text-sm text-zinc-500">
                    {s.date} @ {s.callTime} — {s.location}
                  </p>
                  <p className="text-xs text-zinc-600 mt-1">Crew: {s.crew.join(', ')}</p>
                </div>
                <p className="text-xs text-zinc-500 max-w-xs">{s.gearSummary}</p>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'assets' && (
        <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl divide-y divide-zinc-800/80">
          {assets.length === 0 ? (
            <p className="p-4 text-sm text-zinc-500">No assets linked (mock).</p>
          ) : (
            assets.map((a) => (
              <div
                key={a.id}
                className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
              >
                <div>
                  <p className="text-white text-sm font-medium">
                    {a.label}{' '}
                    <span className="text-zinc-500 font-mono text-xs">v{a.version}</span>
                  </p>
                  <p className="text-xs text-zinc-500">
                    {a.type.toUpperCase()} — {a.commentCount} comment(s) —{' '}
                    {a.clientVisible ? 'Client visible' : 'Internal only'}
                  </p>
                </div>
                <span
                  className={`self-start text-[10px] uppercase font-bold px-2 py-0.5 rounded ${assetStatusClass(a.status)}`}
                >
                  {a.status}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'financials' && (
        <div className="space-y-6">
          {proposal && (
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4">
              <h3 className="text-sm font-bold text-white mb-2">Proposal & contract (mock)</h3>
              <p className="text-sm text-zinc-400 mb-2">
                Total: <span className="text-white font-mono">${proposal.total.toLocaleString()}</span> — deposit {proposal.depositPercent}%
              </p>
              <ul className="text-sm text-zinc-300 list-disc list-inside mb-2">
                {proposal.lineItems.map((li) => (
                  <li key={li.label}>
                    {li.label} — ${li.amount.toLocaleString()}
                  </li>
                ))}
              </ul>
              {proposal.lastEvent && (
                <p className="text-xs text-zinc-500">{proposal.lastEvent}</p>
              )}
              <span
                className={`mt-2 inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${proposalStatusClass(proposal.contractStatus)}`}
              >
                {proposal.contractStatus}
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4">
              <h3 className="text-xs font-bold uppercase text-zinc-500 mb-2">Budget (project)</h3>
              <p className="text-2xl font-bold text-white">${project.budget.toLocaleString()}</p>
            </div>
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4">
              <h3 className="text-xs font-bold uppercase text-zinc-500 mb-2">Open balance (invoices)</h3>
              <p className="text-2xl font-bold text-white">${openTotal.toLocaleString()}</p>
            </div>
          </div>

          <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl overflow-x-auto">
            <table className="w-full text-sm min-w-[500px]">
              <thead className="text-xs text-zinc-500 uppercase border-b border-zinc-800">
                <tr>
                  <th className="text-left px-3 py-2">Invoice</th>
                  <th className="text-right px-3 py-2">Amount</th>
                  <th className="text-left px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80">
                {invoices.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-3 py-3 text-zinc-500 text-center">
                      No project invoices
                    </td>
                  </tr>
                )}
                {invoices.map((inv) => (
                  <tr key={inv.id} className="text-zinc-200">
                    <td className="px-3 py-2.5 font-mono text-zinc-300">{inv.id}</td>
                    <td className="px-3 py-2.5 text-right">
                      ${inv.amount.toLocaleString()}
                      <div className="text-[10px] text-zinc-500">Paid: ${inv.amountPaid.toLocaleString()}</div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${invoiceStatusClass(inv.status)}`}
                      >
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <h3 className="text-sm font-bold text-zinc-400 mb-2">Expenses (mock)</h3>
            <ul className="text-sm text-zinc-300 space-y-1">
              {expenses.length === 0 ? (
                <li className="text-zinc-500">None</li>
              ) : (
                expenses.map((e) => (
                  <li key={e.id} className="flex justify-between gap-4">
                    <span>
                      {e.label}{' '}
                      <span className="text-zinc-500">({e.category})</span>
                    </span>
                    <span className="font-mono">-${e.amount.toLocaleString()}</span>
                  </li>
                ))
              )}
            </ul>
            {expenseTotal > 0 && (
              <p className="text-xs text-zinc-500 mt-2">
                Rough P&amp;L note: budget - expenses - (mock) internal hours not subtracted
              </p>
            )}
          </div>
        </div>
      )}

      {tab === 'activity' && (
        <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl divide-y divide-zinc-800/80">
          {activity.length === 0 ? (
            <p className="p-4 text-sm text-zinc-500">No log entries for this project.</p>
          ) : (
            activity.map((a) => (
              <div key={a.id} className="px-4 py-2.5 text-sm">
                <p className="text-zinc-500 text-xs">{new Date(a.createdAt).toLocaleString()}</p>
                <p className="text-zinc-200">
                  {a.actorName} <span className="text-zinc-500">— {a.entityType}</span> {a.entityLabel} — {a.action}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default AdminProjectDetail;
