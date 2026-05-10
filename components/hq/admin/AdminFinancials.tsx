import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getHqProjectDirectory } from '../../../data/hqSyncDirectory';
import { getFinanceRepository } from '../../../data/financeRepository';
import { setInvoiceLockStatus } from '../../../data/financeApi';
import { useAuth } from '../../../lib/auth';
import { useAdminTheme } from '../../../lib/adminTheme';
import {
  appInputClass,
  appKpiLinkClass,
  appLinkMutedClass,
  appPanelClass,
  rechartsAxisStroke,
  rechartsTooltipProps,
} from '../../../lib/appThemeClasses';
import type { AdminInvoice, AdminInvoiceStatus, AdminProject } from '../../../types';
import AdminFormDrawer from './AdminFormDrawer';
import { formatAdminDate, invoiceStatusClassForTheme, proposalStatusClassForTheme } from './adminFormat';
import { useHqOrgTick } from '../HqFirestoreProvider';

const INVOICE_STATUS_FILTERS: Array<{ value: 'all' | AdminInvoiceStatus; label: string }> = [
  { value: 'all', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'partial', label: 'Partial' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'void', label: 'Void' },
];

const AdminFinancials: React.FC = () => {
  const { theme } = useAdminTheme();
  const isDark = theme === 'dark';
  const { user } = useAuth();
  const canOverrideLock = user?.role === 'ADMIN';
  const [statusFilter, setStatusFilter] = useState<'all' | AdminInvoiceStatus>('all');
  const [projectFilter, setProjectFilter] = useState<'all' | string>('all');
  const [dueFrom, setDueFrom] = useState('');
  const [dueTo, setDueTo] = useState('');

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [newProjectId, setNewProjectId] = useState('');
  const [newClientName, setNewClientName] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newIssued, setNewIssued] = useState(() => new Date().toISOString().slice(0, 10));
  const [newDue, setNewDue] = useState(() => new Date().toISOString().slice(0, 10));
  const [drawerError, setDrawerError] = useState<string | null>(null);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [editInvoiceId, setEditInvoiceId] = useState<string | null>(null);
  const [editProjectId, setEditProjectId] = useState('');
  const [editClientName, setEditClientName] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editAmountPaid, setEditAmountPaid] = useState('');
  const [editIssuedDate, setEditIssuedDate] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editStatus, setEditStatus] = useState<AdminInvoiceStatus>('draft');
  const [editAttachmentInput, setEditAttachmentInput] = useState('');
  const [editAttachmentIds, setEditAttachmentIds] = useState<string[]>([]);
  const [editDrawerError, setEditDrawerError] = useState<string | null>(null);
  const [financeStatus, setFinanceStatus] = useState<'loading' | 'error' | 'success'>('loading');
  const [financeError, setFinanceError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);
  const hqTick = useHqOrgTick();
  const projects = useMemo(() => getHqProjectDirectory(), [hqTick]);

  const financeRepo = useMemo(() => getFinanceRepository(), []);
  const invoices = useMemo(() => {
    try {
      return financeRepo.listInvoices();
    } catch {
      return [];
    }
  }, [financeRepo, reloadTick]);
  const proposals = useMemo(() => {
    try {
      return financeRepo.listProposals();
    } catch {
      return [];
    }
  }, [financeRepo, reloadTick]);
  const metrics = useMemo(() => {
    try {
      return financeRepo.getMetrics();
    } catch {
      return {
        openArTotal: 0,
        outstandingInvoiceCount: 0,
        overdueInvoiceCount: 0,
        overdueInvoices: [],
        revenueYtd: 0,
        monthlyRevenue: [],
      };
    }
  }, [financeRepo, reloadTick]);

  useEffect(() => {
    try {
      financeRepo.listInvoices();
      setFinanceStatus('success');
      setFinanceError(null);
    } catch (error) {
      setFinanceStatus('error');
      setFinanceError(error instanceof Error ? error.message : 'Could not load financial records.');
    }
  }, [financeRepo, reloadTick]);

  useEffect(() => {
    setNewProjectId((cur) => cur || projects[0]?.id || '');
  }, [projects]);

  const projectsById = useMemo(() => {
    const m = new Map<string, AdminProject>();
    for (const p of projects) m.set(p.id, p);
    return m;
  }, [projects]);

  const openCreateDrawer = () => {
    if (projects.length === 0) {
      setDrawerError('Create a project first before creating invoices.');
      setDrawerOpen(false);
      return;
    }
    const p = projectsById.get(newProjectId) ?? projects[0];
    setNewClientName(p?.clientName ?? '');
    setNewAmount('');
    setNewIssued(new Date().toISOString().slice(0, 10));
    setNewDue(new Date().toISOString().slice(0, 10));
    setDrawerError(null);
    setDrawerOpen(true);
  };

  const outstanding = useMemo(
    () => invoices.filter((i) => i.status !== 'paid' && i.status !== 'void'),
    [invoices]
  );
  const openTotal = useMemo(() => outstanding.reduce((s, i) => s + (i.amount - i.amountPaid), 0), [outstanding]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((i) => {
      if (statusFilter !== 'all' && i.status !== statusFilter) return false;
      if (projectFilter !== 'all' && i.projectId !== projectFilter) return false;
      if (dueFrom && i.dueDate < dueFrom) return false;
      if (dueTo && i.dueDate > dueTo) return false;
      return true;
    });
  }, [statusFilter, projectFilter, dueFrom, dueTo, invoices]);

  const bump = () => {
    setReloadTick((n) => n + 1);
  };

  const onMarkSent = (id: string) => {
    const r = financeRepo.updateInvoice(id, { status: 'sent' });
    if (r.ok) bump();
  };

  const onMarkPaid = (id: string) => {
    const item = invoices.find((i) => i.id === id);
    if (!item) return;
    const r = financeRepo.updateInvoice(id, { status: 'paid', amountPaid: item.amount, amount: item.amount });
    if (r.ok) bump();
  };

  const saveNewInvoice = () => {
    setDrawerError(null);
    if (!newProjectId) {
      setDrawerError('Project is required.');
      return;
    }
    const project = projectsById.get(newProjectId);
    const amount = Number(newAmount || '0');
    try {
      financeRepo.createInvoice(
        {
          projectId: newProjectId,
          clientName: (newClientName.trim() || project?.clientName || '').trim(),
          amount: amount,
          amountPaid: 0,
          status: 'draft',
          issuedDate: newIssued,
          dueDate: newDue,
        }
      );
      setDrawerOpen(false);
      bump();
    } catch (e) {
      setDrawerError(e instanceof Error ? e.message : 'Could not create invoice.');
    }
  };

  const openEditInvoice = (invoice: AdminInvoice) => {
    setEditInvoiceId(invoice.id);
    setEditProjectId(invoice.projectId);
    setEditClientName(invoice.clientName);
    setEditAmount(String(invoice.amount));
    setEditAmountPaid(String(invoice.amountPaid));
    setEditIssuedDate(invoice.issuedDate);
    setEditDueDate(invoice.dueDate);
    setEditStatus(invoice.status);
    setEditAttachmentIds(invoice.attachmentAssetIds || []);
    setEditAttachmentInput('');
    setEditDrawerError(null);
    setEditDrawerOpen(true);
  };

  const saveEditedInvoice = () => {
    if (!editInvoiceId) return;
    setEditDrawerError(null);
    try {
      const existing = invoices.find((invoice) => invoice.id === editInvoiceId);
      if (existing?.lockStatus === 'locked' && !canOverrideLock) {
        setEditDrawerError('This invoice is locked. Only an admin can unlock and edit it.');
        return;
      }
      const result = financeRepo.updateInvoice(editInvoiceId, {
        projectId: editProjectId,
        clientName: editClientName.trim(),
        amount: Number(editAmount || '0'),
        amountPaid: Number(editAmountPaid || '0'),
        issuedDate: editIssuedDate,
        dueDate: editDueDate,
        status: editStatus,
        attachmentAssetIds: editAttachmentIds,
      });
      if (!result.ok) {
        setEditDrawerError('Invoice could not be updated.');
        return;
      }
      setEditDrawerOpen(false);
      bump();
    } catch (error) {
      setEditDrawerError(error instanceof Error ? error.message : 'Could not update invoice.');
    }
  };

  const toggleInvoiceLock = (invoiceId: string, lockStatus: 'locked' | 'unlocked') => {
    const result = setInvoiceLockStatus(invoiceId, lockStatus, user?.email || user?.displayName || 'admin');
    if (!result.ok) return;
    bump();
  };

  return (
    <div className="max-w-6xl min-w-0 space-y-6">
      <div data-tour="financials-header">
        <p className="text-xs font-mono uppercase text-zinc-500">Financials</p>
        <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
          Invoices, proposals, cash
        </h2>
        <p className={`text-sm mt-1 ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>
          Filters apply to the invoice list. Summary cards use all open invoices.
        </p>
        {financeStatus === 'loading' && (
          <p className={`text-xs mt-2 ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>Loading financial records...</p>
        )}
        {financeStatus === 'error' && (
          <p className="text-xs mt-2 text-rose-400">{financeError || 'Could not load financial records.'}</p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm min-w-0" data-tour="financials-kpis">
        <div className={`rounded-xl p-5 min-w-0 ${appKpiLinkClass(isDark, false)}`}>
          <p className="text-zinc-500 text-xs uppercase font-bold">Open AR</p>
          <p className={`text-3xl font-bold mt-1 ${isDark ? 'text-white' : 'text-zinc-900'}`}>
            ${openTotal.toLocaleString()}
          </p>
        </div>
        <div className={`rounded-xl p-5 min-w-0 ${appKpiLinkClass(isDark, false)}`}>
          <p className="text-zinc-500 text-xs uppercase font-bold">Active projects</p>
          <p className={`text-3xl font-bold mt-1 ${isDark ? 'text-white' : 'text-zinc-900'}`}>
            {projects.filter((p) => p.status === 'active').length}
          </p>
        </div>
      </div>

      <div className={`rounded-xl p-4 h-80 min-w-0 ${appPanelClass(isDark)}`}>
        <h3 className={`text-sm font-semibold mb-2 ${isDark ? 'text-white' : 'text-zinc-900'}`}>
          Revenue (actual)
        </h3>
        <ResponsiveContainer width="100%" height="88%">
          <AreaChart data={metrics.monthlyRevenue}>
            <defs>
              <linearGradient id="fRev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#d4d4d8" stopOpacity={0.1} />
                <stop offset="95%" stopColor="#d4d4d8" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="name"
              stroke={rechartsAxisStroke(isDark)}
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke={rechartsAxisStroke(isDark)}
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `$${v / 1000}k`}
            />
            <Tooltip {...rechartsTooltipProps(isDark)} />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke={isDark ? '#fafafa' : '#3f3f46'}
              strokeWidth={1.5}
              fill="url(#fRev)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="min-w-0" data-tour="financials-proposals">
        <h3 className={`text-sm font-bold mb-2 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>Proposals</h3>
        <div className="space-y-2">
          {proposals.map((p) => (
            <div
              key={p.id}
              className={`rounded-lg px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 min-w-0 ${appPanelClass(
                isDark
              )}`}
            >
              <div className="min-w-0">
                <p className={`font-medium text-sm truncate ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                  {p.clientName} — {projects.find((x) => x.id === p.projectId)?.title}
                </p>
                <p className="text-xs text-zinc-500">Total: ${p.total.toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${proposalStatusClassForTheme(
                    p.contractStatus,
                    theme
                  )}`}
                >
                  {p.contractStatus}
                </span>
                <Link
                  to={`/hq/admin/projects/${p.projectId}`}
                  className={`text-xs whitespace-nowrap ${appLinkMutedClass(isDark)}`}
                >
                  Open project
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="min-w-0">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-2">
          <div>
            <h3 className={`text-sm font-bold ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>Invoices</h3>
            <p className={`text-xs mt-1 ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>
              Click an invoice row to open and edit it.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreateDrawer}
            disabled={projects.length === 0}
            className="w-full sm:w-auto rounded-lg bg-white text-zinc-900 px-3 py-2 text-xs font-semibold hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            New invoice
          </button>
        </div>

        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end min-w-0" data-tour="financials-filters">
          <label className="flex flex-col gap-1 text-xs text-zinc-500 min-w-0 sm:min-w-[140px]">
            Status
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | AdminInvoiceStatus)}
              className={
                isDark
                  ? 'rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-200'
                  : 'rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900'
              }
            >
              {INVOICE_STATUS_FILTERS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-zinc-500 min-w-0 sm:min-w-[180px]">
            Project
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value as typeof projectFilter)}
              className={
                isDark
                  ? 'rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-200'
                  : 'rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900'
              }
            >
              <option value="all">All projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-zinc-500 min-w-0 sm:min-w-[140px]">
            Due from
            <input
              type="date"
              value={dueFrom}
              onChange={(e) => setDueFrom(e.target.value)}
              className={
                isDark
                  ? 'rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-200'
                  : 'rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900'
              }
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-zinc-500 min-w-0 sm:min-w-[140px]">
            Due to
            <input
              type="date"
              value={dueTo}
              onChange={(e) => setDueTo(e.target.value)}
              className={
                isDark
                  ? 'rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-200'
                  : 'rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900'
              }
            />
          </label>
          {(statusFilter !== 'all' || projectFilter !== 'all' || dueFrom || dueTo) && (
            <button
              type="button"
              onClick={() => {
                setStatusFilter('all');
                setProjectFilter('all');
                setDueFrom('');
                setDueTo('');
              }}
              className={`text-xs underline sm:mb-2 ${appLinkMutedClass(isDark)}`}
            >
              Clear filters
            </button>
          )}
        </div>

        <div className={`rounded-xl overflow-x-auto min-w-0 ${appPanelClass(isDark)}`} data-tour="financials-invoices">
          <table className="w-full text-sm min-w-[800px]">
            <thead
              className={`text-xs text-zinc-500 uppercase border-b ${
                isDark ? 'border-zinc-800' : 'border-zinc-200'
              }`}
            >
              <tr>
                <th className="text-left px-3 py-2">Id</th>
                <th className="text-left px-3 py-2">Client / project</th>
                <th className="text-right px-3 py-2">Open</th>
                <th className="text-left px-3 py-2">Due</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-left px-3 py-2">Lock</th>
                <th className="text-left px-3 py-2">Actions</th>
                <th className="text-left px-3 py-2" />
              </tr>
            </thead>
            <tbody className={isDark ? 'divide-y divide-zinc-800/80' : 'divide-y divide-zinc-200'}>
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-4 text-sm text-zinc-500">
                    No invoices match the current filters.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((i) => {
                  const canMarkSent = i.status === 'draft';
                  const canMarkPaid = i.status !== 'paid' && i.status !== 'void';
                  return (
                    <tr
                      key={i.id}
                      className={`cursor-pointer ${isDark ? 'hover:bg-zinc-900/20' : 'hover:bg-zinc-100/80'}`}
                      onClick={() => openEditInvoice(i)}
                    >
                      <td
                        className={`px-3 py-2.5 font-mono ${isDark ? 'text-zinc-300' : 'text-zinc-600'}`}
                      >
                        {i.id}
                      </td>
                      <td
                        className={`px-3 py-2.5 min-w-0 max-w-xs ${
                          isDark ? 'text-zinc-200' : 'text-zinc-800'
                        }`}
                      >
                        <span className="break-words">{i.clientName}</span>
                        <span className="text-zinc-500 text-xs"> · {i.projectId}</span>
                      </td>
                      <td
                        className={`px-3 py-2.5 text-right ${
                          isDark ? 'text-zinc-200' : 'text-zinc-800'
                        }`}
                      >
                        ${(i.amount - i.amountPaid).toLocaleString()}
                      </td>
                      <td className="px-3 py-2.5 text-zinc-500 font-mono text-xs whitespace-nowrap">
                        {formatAdminDate(i.dueDate)}
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${invoiceStatusClassForTheme(
                            i.status,
                            theme
                          )}`}
                        >
                          {i.status}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                            i.lockStatus === 'locked'
                              ? isDark
                                ? 'bg-rose-950 text-rose-300'
                                : 'bg-rose-100 text-rose-800'
                              : isDark
                                ? 'bg-zinc-800 text-zinc-300'
                                : 'bg-zinc-100 text-zinc-700'
                          }`}
                        >
                          {i.lockStatus === 'locked' ? 'Locked' : 'Unlocked'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            disabled={!canMarkSent}
                            onClick={(event) => {
                              event.stopPropagation();
                              onMarkSent(i.id);
                            }}
                            className={
                              isDark
                                ? 'rounded border border-zinc-600 bg-zinc-900 px-2 py-0.5 text-[11px] text-zinc-200 hover:border-zinc-500 disabled:opacity-40'
                                : 'rounded border border-zinc-300 bg-white px-2 py-0.5 text-[11px] text-zinc-800 hover:border-zinc-400 disabled:opacity-40'
                            }
                          >
                            Mark sent
                          </button>
                          <button
                            type="button"
                            disabled={!canMarkPaid}
                            onClick={(event) => {
                              event.stopPropagation();
                              onMarkPaid(i.id);
                            }}
                            className={
                              isDark
                                ? 'rounded border border-zinc-600 bg-zinc-900 px-2 py-0.5 text-[11px] text-zinc-200 hover:border-zinc-500 disabled:opacity-40'
                                : 'rounded border border-zinc-300 bg-white px-2 py-0.5 text-[11px] text-zinc-800 hover:border-zinc-400 disabled:opacity-40'
                            }
                          >
                            Mark paid
                          </button>
                          <button
                            type="button"
                            disabled={!canOverrideLock}
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleInvoiceLock(i.id, i.lockStatus === 'locked' ? 'unlocked' : 'locked');
                            }}
                            className={
                              isDark
                                ? 'rounded border border-zinc-600 bg-zinc-900 px-2 py-0.5 text-[11px] text-zinc-200 hover:border-zinc-500 disabled:opacity-40'
                                : 'rounded border border-zinc-300 bg-white px-2 py-0.5 text-[11px] text-zinc-800 hover:border-zinc-400 disabled:opacity-40'
                            }
                          >
                            {i.lockStatus === 'locked' ? 'Unlock' : 'Lock'}
                          </button>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right whitespace-nowrap">
                        <Link
                          to={`/hq/admin/projects/${i.projectId}`}
                          onClick={(event) => event.stopPropagation()}
                          className={`text-xs ${appLinkMutedClass(isDark)}`}
                        >
                          Project
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AdminFormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="New invoice"
        subtitle="Creates a draft on the project you select."
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={saveNewInvoice}
              className="rounded-md border border-zinc-600 bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-900"
            >
              Create draft
            </button>
          </div>
        }
      >
        {drawerError && <p className="text-sm text-rose-400 mb-3">{drawerError}</p>}
        <div className="space-y-3 text-sm min-w-0">
          {invoices.find((invoice) => invoice.id === editInvoiceId)?.lockStatus === 'locked' && (
            <p className="text-xs text-rose-300">
              This invoice is locked. {!canOverrideLock ? 'Only admin can unlock it.' : 'Unlock to edit protected fields.'}
            </p>
          )}
          <label className="block text-xs text-zinc-500">
            Project
            <select
              value={newProjectId}
              onChange={(e) => {
                const id = e.target.value;
                setNewProjectId(id);
                const p = projectsById.get(id);
                if (p) setNewClientName(p.clientName);
              }}
              className={`mt-1 ${appInputClass(isDark)}`}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} ({p.id})
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-zinc-500">
            Client
            <input
              value={newClientName}
              onChange={(e) => setNewClientName(e.target.value)}
              className={`mt-1 ${appInputClass(isDark)}`}
            />
          </label>
          <label className="block text-xs text-zinc-500">
            Amount (USD)
            <input
              type="number"
              min={0}
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
              className={`mt-1 ${appInputClass(isDark)}`}
            />
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block text-xs text-zinc-500">
              Issued
              <input
                type="date"
                value={newIssued}
                onChange={(e) => setNewIssued(e.target.value)}
                className={`mt-1 ${appInputClass(isDark)}`}
              />
            </label>
            <label className="block text-xs text-zinc-500">
              Due
              <input
                type="date"
                value={newDue}
                onChange={(e) => setNewDue(e.target.value)}
                className={`mt-1 ${appInputClass(isDark)}`}
              />
            </label>
          </div>
        </div>
      </AdminFormDrawer>

      <AdminFormDrawer
        open={editDrawerOpen}
        onClose={() => setEditDrawerOpen(false)}
        title="Edit invoice"
        subtitle={editInvoiceId ? `Invoice ${editInvoiceId}` : 'Update invoice fields and status.'}
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditDrawerOpen(false)}
              className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={saveEditedInvoice}
              className="rounded-md border border-zinc-600 bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-900"
            >
              Save invoice
            </button>
          </div>
        }
      >
        {editDrawerError && <p className="text-sm text-rose-400 mb-3">{editDrawerError}</p>}
        <div className="space-y-3 text-sm min-w-0">
          <label className="block text-xs text-zinc-500">
            Project
            <select
              value={editProjectId}
              onChange={(e) => setEditProjectId(e.target.value)}
              className={`mt-1 ${appInputClass(isDark)}`}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} ({p.id})
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-zinc-500">
            Client
            <input
              value={editClientName}
              onChange={(e) => setEditClientName(e.target.value)}
              className={`mt-1 ${appInputClass(isDark)}`}
            />
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block text-xs text-zinc-500">
              Amount (USD)
              <input
                type="number"
                min={0}
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                className={`mt-1 ${appInputClass(isDark)}`}
              />
            </label>
            <label className="block text-xs text-zinc-500">
              Amount paid (USD)
              <input
                type="number"
                min={0}
                value={editAmountPaid}
                onChange={(e) => setEditAmountPaid(e.target.value)}
                className={`mt-1 ${appInputClass(isDark)}`}
              />
            </label>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block text-xs text-zinc-500">
              Issued
              <input
                type="date"
                value={editIssuedDate}
                onChange={(e) => setEditIssuedDate(e.target.value)}
                className={`mt-1 ${appInputClass(isDark)}`}
              />
            </label>
            <label className="block text-xs text-zinc-500">
              Due
              <input
                type="date"
                value={editDueDate}
                onChange={(e) => setEditDueDate(e.target.value)}
                className={`mt-1 ${appInputClass(isDark)}`}
              />
            </label>
          </div>
          <label className="block text-xs text-zinc-500">
            Status
            <select
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value as AdminInvoiceStatus)}
              className={`mt-1 ${appInputClass(isDark)}`}
            >
              {INVOICE_STATUS_FILTERS.filter((item) => item.value !== 'all').map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <div className="rounded-md border border-zinc-700/70 p-2 min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-zinc-500 mb-2">Attachments</p>
            <div className="flex flex-col sm:flex-row gap-2 min-w-0">
              <input
                value={editAttachmentInput}
                onChange={(e) => setEditAttachmentInput(e.target.value)}
                placeholder="Attachment asset or document ID"
                disabled={invoices.find((invoice) => invoice.id === editInvoiceId)?.lockStatus === 'locked' && !canOverrideLock}
                className={`${appInputClass(isDark)} min-w-0`}
              />
              <button
                type="button"
                onClick={() => {
                  const value = editAttachmentInput.trim();
                  if (!value) return;
                  if (!editAttachmentIds.includes(value)) {
                    setEditAttachmentIds((current) => [...current, value]);
                  }
                  setEditAttachmentInput('');
                }}
                disabled={invoices.find((invoice) => invoice.id === editInvoiceId)?.lockStatus === 'locked' && !canOverrideLock}
                className="rounded-md border border-zinc-700 px-3 py-2 text-xs font-bold uppercase tracking-wide text-zinc-200 disabled:opacity-50"
              >
                Add
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {editAttachmentIds.length === 0 ? (
                <p className="text-xs text-zinc-500">No attachments.</p>
              ) : (
                editAttachmentIds.map((attachmentId) => (
                  <button
                    key={attachmentId}
                    type="button"
                    onClick={() =>
                      setEditAttachmentIds((current) => current.filter((id) => id !== attachmentId))
                    }
                    disabled={invoices.find((invoice) => invoice.id === editInvoiceId)?.lockStatus === 'locked' && !canOverrideLock}
                    className="rounded border border-zinc-700 px-2 py-0.5 text-[11px] text-zinc-300 disabled:opacity-50"
                  >
                    {attachmentId} ×
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </AdminFormDrawer>
    </div>
  );
};

export default AdminFinancials;
