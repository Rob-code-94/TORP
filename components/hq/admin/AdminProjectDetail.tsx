import React, { useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import {
  PROJECT_STAGE_ORDER,
  getBlockersByProject,
  getChangeOrdersByProject,
  getDeliverablesByProject,
  getDependenciesByProject,
  getActivityByProject,
  getAssetsByProject,
  getExpensesByProject,
  getInvoicesByProject,
  getPlannerByProject,
  getProposalByProject,
  getProjectById,
  getRisksByProject,
  getShootsByProject,
  requestChangeOrder,
  transitionProjectStage,
} from '../../../data/adminMock';
import { useAuth } from '../../../lib/auth';
import { useAdminTheme } from '../../../lib/adminTheme';
import { hasProjectCapability } from '../../../lib/projectPermissions';
import type { ProjectStage } from '../../../types';
import {
  assetStatusClassForTheme,
  columnLabel,
  formatAdminDate,
  formatAdminDateTime,
  formatStage,
  invoiceStatusClassForTheme,
  proposalStatusClassForTheme,
  stageClassForTheme,
  typeLabel,
} from './adminFormat';

type Tab = 'overview' | 'brief' | 'planner' | 'schedule' | 'assets' | 'deliverables' | 'controls' | 'financials' | 'activity';
type LoadState = 'loading' | 'empty' | 'error' | 'success';
type ActivityFilter = 'all' | 'alerts' | 'mentions' | 'unread';

const AdminProjectDetail: React.FC = () => {
  const { user } = useAuth();
  const { theme } = useAdminTheme();
  const isDark = theme === 'dark';
  const { projectId } = useParams();
  const [tab, setTab] = useState<Tab>('overview');
  const [tabState, setTabState] = useState<Record<Tab, LoadState>>({
    overview: 'success',
    brief: 'success',
    planner: 'success',
    schedule: 'success',
    assets: 'success',
    deliverables: 'success',
    controls: 'success',
    financials: 'success',
    activity: 'success',
  });
  const [stageMessage, setStageMessage] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>('all');
  const [watching, setWatching] = useState(false);
  const [readIds, setReadIds] = useState<string[]>([]);

  const project = projectId ? getProjectById(projectId) : undefined;

  const planner = useMemo(() => (projectId ? getPlannerByProject(projectId) : []), [projectId]);
  const shoots = useMemo(() => (projectId ? getShootsByProject(projectId) : []), [projectId]);
  const assets = useMemo(() => (projectId ? getAssetsByProject(projectId) : []), [projectId]);
  const invoices = useMemo(() => (projectId ? getInvoicesByProject(projectId) : []), [projectId]);
  const proposal = projectId ? getProposalByProject(projectId) : undefined;
  const expenses = useMemo(() => (projectId ? getExpensesByProject(projectId) : []), [projectId]);
  const activity = useMemo(() => (projectId ? getActivityByProject(projectId) : []), [projectId, refreshTick]);
  const deliverables = useMemo(() => (projectId ? getDeliverablesByProject(projectId) : []), [projectId]);
  const risks = useMemo(() => (projectId ? getRisksByProject(projectId) : []), [projectId]);
  const blockers = useMemo(() => (projectId ? getBlockersByProject(projectId) : []), [projectId]);
  const dependencies = useMemo(() => (projectId ? getDependenciesByProject(projectId) : []), [projectId]);
  const changeOrders = useMemo(() => (projectId ? getChangeOrdersByProject(projectId) : []), [projectId, refreshTick]);
  const filteredActivity = useMemo(() => {
    if (activityFilter === 'all') return activity;
    if (activityFilter === 'unread') return activity.filter((item) => !readIds.includes(item.id));
    if (activityFilter === 'mentions') {
      const name = user?.displayName?.toLowerCase() ?? '';
      return activity.filter((item) => name && item.action.toLowerCase().includes(name));
    }
    return activity.filter((item) => {
      const s = item.action.toLowerCase();
      return s.includes('risk') || s.includes('blocker') || s.includes('overdue') || s.includes('change order');
    });
  }, [activity, activityFilter, readIds, user?.displayName]);

  if (!projectId || !project) {
    return <Navigate to="/hq/admin/projects" replace />;
  }

  const openTotal = invoices.reduce((s, i) => s + (i.amount - i.amountPaid), 0);
  const expenseTotal = expenses.reduce((s, e) => s + e.amount, 0);
  const canMoveStage = hasProjectCapability(user?.role, 'project.stage.move');
  const canApproveFinance = hasProjectCapability(user?.role, 'project.financial.approve');
  const canRequestChangeOrder = hasProjectCapability(user?.role, 'project.changeOrder.request');

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

  const withState = (id: Tab, hasData: boolean, content: React.ReactNode) => {
    const state = tabState[id];
    if (state === 'loading') return <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 text-sm text-zinc-500">Loading {id}…</div>;
    if (state === 'error') return <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-4 text-sm text-red-200">Could not load {id}. Try again.</div>;
    if (state === 'empty' || !hasData) return <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 text-sm text-zinc-500">No {id} data yet.</div>;
    return <>{content}</>;
  };

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
          <h2 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>{project.title}</h2>
          <p className="text-sm text-zinc-500 mt-1">
            {project.clientName} · {project.packageLabel}
          </p>
        </div>
        <div className="flex flex-col sm:items-end gap-2 sm:text-right text-xs text-zinc-500 min-w-0">
          <span className={`self-end text-[10px] uppercase font-bold tracking-wide px-2 py-0.5 rounded ${stageClassForTheme(project.stage, theme)}`}>
            {formatStage(project.stage)}
          </span>
          <p className="break-words">
            Due <span className="text-zinc-300 font-mono">{formatAdminDate(project.dueDate)}</span> · Owner{' '}
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
        {tabBtn('deliverables', 'Deliverables')}
        {tabBtn('controls', 'Controls')}
        {tabBtn('financials', 'Financials')}
        {tabBtn('activity', 'Activity')}
      </div>

      <div className="sticky top-0 z-10 rounded-xl border border-zinc-800 bg-zinc-950/90 backdrop-blur px-3 py-3 sm:px-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs text-zinc-500 uppercase tracking-widest">Project context</p>
            <p className="text-sm text-zinc-300 truncate">Owner {project.ownerName} · Due {formatAdminDate(project.dueDate)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={project.stage}
              onChange={(e) => {
                if (!canMoveStage) return;
                const nextStage = e.target.value as ProjectStage;
                const result = transitionProjectStage(project.id, nextStage, user?.displayName || 'System');
                setStageMessage(result.ok ? `Stage updated to ${formatStage(nextStage)}.` : result.error || 'Unable to update stage.');
                if (result.ok) setRefreshTick((value) => value + 1);
              }}
              disabled={!canMoveStage}
              className="rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-100 disabled:opacity-50"
            >
              {PROJECT_STAGE_ORDER.map((item) => (
                <option key={item} value={item}>
                  {formatStage(item)}
                </option>
              ))}
            </select>
            {!canMoveStage && <span className="text-[11px] text-zinc-500 self-center">Stage updates are restricted for this role</span>}
          </div>
        </div>
        {stageMessage && <p className="mt-2 text-xs text-zinc-400">{stageMessage}</p>}
      </div>

      {tab === 'overview' && withState('overview', true, (
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
      ))}

      {tab === 'brief' && withState('brief', true, (
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
      ))}

      {tab === 'planner' && withState('planner', planner.length > 0, (
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
                    <td className="px-3 py-2.5 text-zinc-500 font-mono text-xs">{formatAdminDate(t.dueDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ))}

      {tab === 'schedule' && withState('schedule', shoots.length > 0, (
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
                    {formatAdminDate(s.date)} @ {s.callTime} — {s.location}
                  </p>
                  <p className="text-xs text-zinc-600 mt-1">Crew: {s.crew.join(', ')}</p>
                </div>
                <p className="text-xs text-zinc-500 max-w-xs">{s.gearSummary}</p>
              </div>
            ))
          )}
        </div>
      ))}

      {tab === 'assets' && withState('assets', assets.length > 0, (
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
                  className={`self-start text-[10px] uppercase font-bold px-2 py-0.5 rounded ${assetStatusClassForTheme(a.status, theme)}`}
                >
                  {a.status}
                </span>
              </div>
            ))
          )}
        </div>
      ))}

      {tab === 'deliverables' && withState('deliverables', deliverables.length > 0, (
        <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl divide-y divide-zinc-800/80">
          {deliverables.length === 0 ? (
            <p className="p-4 text-sm text-zinc-500">No deliverables yet.</p>
          ) : (
            deliverables.map((d) => (
              <div key={d.id} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="text-sm text-white font-medium">{d.label}</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    Owner {d.ownerName} · Due {formatAdminDate(d.dueDate)} · {d.required ? 'Required' : 'Optional'}
                  </p>
                </div>
                <span className="text-[10px] uppercase rounded border border-zinc-700 px-2 py-0.5 text-zinc-200 self-start">{d.status.replaceAll('_', ' ')}</span>
              </div>
            ))
          )}
        </div>
      ))}

      {tab === 'controls' && withState('controls', risks.length + blockers.length + dependencies.length > 0, (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
            <h3 className="text-xs uppercase tracking-widest text-zinc-500 font-bold mb-3">Risks</h3>
            {risks.length === 0 ? (
              <p className="text-sm text-zinc-500">No risks logged.</p>
            ) : (
              <div className="space-y-2">
                {risks.map((r) => (
                  <div key={r.id} className="rounded-lg border border-zinc-800 p-2.5">
                    <p className="text-sm text-zinc-200">{r.label}</p>
                    <p className="text-xs text-zinc-500 mt-1">
                      {r.severity} · {r.status} · {r.ownerName}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
            <h3 className="text-xs uppercase tracking-widest text-zinc-500 font-bold mb-3">Blockers</h3>
            {blockers.length === 0 ? (
              <p className="text-sm text-zinc-500">No blockers.</p>
            ) : (
              <ul className="space-y-2">
                {blockers.map((b) => (
                  <li key={b.id} className="rounded-lg border border-zinc-800 p-2.5 text-sm text-zinc-200">
                    {b.label}
                    <p className="text-xs text-zinc-500 mt-1">
                      {b.status} · {b.ownerName}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
            <h3 className="text-xs uppercase tracking-widest text-zinc-500 font-bold mb-3">Dependencies</h3>
            {dependencies.length === 0 ? (
              <p className="text-sm text-zinc-500">No dependencies logged.</p>
            ) : (
              <ul className="space-y-2">
                {dependencies.map((d) => (
                  <li key={d.id} className="rounded-lg border border-zinc-800 p-2.5 text-sm text-zinc-200">
                    {d.label}
                    <p className="text-xs text-zinc-500 mt-1">{d.status}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ))}

      {tab === 'financials' && withState('financials', invoices.length + expenses.length + changeOrders.length > 0, (
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
                className={`mt-2 inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${proposalStatusClassForTheme(proposal.contractStatus, theme)}`}
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
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4 sm:col-span-2">
              <h3 className="text-xs font-bold uppercase text-zinc-500 mb-2">Change Orders</h3>
              {changeOrders.length === 0 ? (
                <p className="text-sm text-zinc-500">No change orders.</p>
              ) : (
                <ul className="space-y-1.5">
                  {changeOrders.map((co) => (
                    <li key={co.id} className="flex items-center justify-between text-sm">
                      <span className="text-zinc-200">{co.title}</span>
                      <span className="text-zinc-400">${co.amount.toLocaleString()} · {co.status}</span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={!canRequestChangeOrder}
                  onClick={() => {
                    if (!projectId) return;
                    const title = window.prompt('Change order title');
                    if (!title?.trim()) return;
                    const amountRaw = window.prompt('Amount', '0');
                    const amount = Number(amountRaw || '0');
                    requestChangeOrder(projectId, title.trim(), Number.isFinite(amount) ? amount : 0, user?.displayName || 'System');
                    setRefreshTick((value) => value + 1);
                  }}
                  className="rounded-md border border-zinc-700 px-2.5 py-1 text-xs text-zinc-100 disabled:opacity-50"
                >
                  Request change order
                </button>
                {!canApproveFinance && (
                  <p className="text-xs text-zinc-500 self-center">Approval actions are Admin-only.</p>
                )}
              </div>
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
                        className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${invoiceStatusClassForTheme(inv.status, theme)}`}
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
      ))}

      {tab === 'activity' && withState('activity', activity.length > 0, (
        <div className="space-y-3">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-3 flex flex-wrap gap-2 items-center">
            {(['all', 'alerts', 'mentions', 'unread'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setActivityFilter(f)}
                className={`rounded-md border px-2.5 py-1 text-xs uppercase ${activityFilter === f ? 'border-white bg-white text-black' : 'border-zinc-700 text-zinc-200'}`}
              >
                {f}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setWatching((v) => !v)}
              className={`ml-auto rounded-md border px-2.5 py-1 text-xs ${watching ? 'border-emerald-700 text-emerald-300' : 'border-zinc-700 text-zinc-300'}`}
            >
              {watching ? 'Watching' : 'Watch'}
            </button>
          </div>

          <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl divide-y divide-zinc-800/80">
            {filteredActivity.length === 0 ? (
            <p className="p-4 text-sm text-zinc-500">No log entries for this project.</p>
          ) : (
            filteredActivity.map((a) => (
              <div key={a.id} className="px-4 py-2.5 text-sm">
                <p className="text-zinc-500 text-xs">{formatAdminDateTime(a.createdAt)}</p>
                <p className="text-zinc-200">
                  {a.actorName} <span className="text-zinc-500">— {a.entityType}</span> {a.entityLabel} — {a.action}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    setReadIds((current) =>
                      current.includes(a.id) ? current.filter((id) => id !== a.id) : [...current, a.id]
                    )
                  }
                  className="mt-1 text-[11px] text-zinc-500 underline"
                >
                  {readIds.includes(a.id) ? 'Mark unread' : 'Mark read'}
                </button>
              </div>
            ))
          )}
          </div>
        </div>
      ))}

      <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2">
        <p className="text-xs text-zinc-500">
          Tab state ({tab}):{' '}
          <button type="button" className="underline" onClick={() => setTabState((current) => ({ ...current, [tab]: 'loading' }))}>
            loading
          </button>{' '}
          ·{' '}
          <button type="button" className="underline" onClick={() => setTabState((current) => ({ ...current, [tab]: 'empty' }))}>
            empty
          </button>{' '}
          ·{' '}
          <button type="button" className="underline" onClick={() => setTabState((current) => ({ ...current, [tab]: 'error' }))}>
            error
          </button>{' '}
          ·{' '}
          <button type="button" className="underline" onClick={() => setTabState((current) => ({ ...current, [tab]: 'success' }))}>
            success
          </button>{' '}
          (current: {tabState[tab]})
        </p>
      </div>
    </div>
  );
};

export default AdminProjectDetail;
