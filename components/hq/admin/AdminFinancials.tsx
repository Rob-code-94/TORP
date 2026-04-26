import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  createInvoice,
  MOCK_INVOICES_ADMIN,
  MOCK_ADMIN_PROJECTS,
  MOCK_PROPOSALS,
  updateInvoice,
} from '../../../data/adminMock';
import { useAuth } from '../../../lib/auth';
import { useAdminTheme } from '../../../lib/adminTheme';
import type { AdminInvoiceStatus, AdminProject } from '../../../types';
import AdminFormDrawer from './AdminFormDrawer';
import { formatAdminDate, invoiceStatusClassForTheme, proposalStatusClassForTheme } from './adminFormat';

const chart = [
  { name: 'Jan', revenue: 40000 },
  { name: 'Feb', revenue: 30000 },
  { name: 'Mar', revenue: 55000 },
  { name: 'Apr', revenue: 48000 },
  { name: 'May', revenue: 70000 },
  { name: 'Jun', revenue: 62000 },
];

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
  const actorName = user?.displayName?.trim() || user?.email || 'HQ';

  const [refresh, setRefresh] = useState(0);
  const [statusFilter, setStatusFilter] = useState<'all' | AdminInvoiceStatus>('all');
  const [projectFilter, setProjectFilter] = useState<'all' | string>('all');
  const [dueFrom, setDueFrom] = useState('');
  const [dueTo, setDueTo] = useState('');

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [newProjectId, setNewProjectId] = useState(MOCK_ADMIN_PROJECTS[0]?.id ?? 'p1');
  const [newClientName, setNewClientName] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newIssued, setNewIssued] = useState(() => new Date().toISOString().slice(0, 10));
  const [newDue, setNewDue] = useState(() => new Date().toISOString().slice(0, 10));
  const [drawerError, setDrawerError] = useState<string | null>(null);

  const projectsById = useMemo(() => {
    const m = new Map<string, AdminProject>();
    for (const p of MOCK_ADMIN_PROJECTS) m.set(p.id, p);
    return m;
  }, []);

  const openCreateDrawer = () => {
    const p = projectsById.get(newProjectId) ?? MOCK_ADMIN_PROJECTS[0];
    setNewClientName(p?.clientName ?? '');
    setNewAmount('');
    setNewIssued(new Date().toISOString().slice(0, 10));
    setNewDue(new Date().toISOString().slice(0, 10));
    setDrawerError(null);
    setDrawerOpen(true);
  };

  const outstanding = useMemo(
    () => MOCK_INVOICES_ADMIN.filter((i) => i.status !== 'paid' && i.status !== 'void'),
    [refresh]
  );
  const openTotal = useMemo(
    () => outstanding.reduce((s, i) => s + (i.amount - i.amountPaid), 0),
    [outstanding]
  );

  const filteredInvoices = useMemo(() => {
    return MOCK_INVOICES_ADMIN.filter((i) => {
      if (statusFilter !== 'all' && i.status !== statusFilter) return false;
      if (projectFilter !== 'all' && i.projectId !== projectFilter) return false;
      if (dueFrom && i.dueDate < dueFrom) return false;
      if (dueTo && i.dueDate > dueTo) return false;
      return true;
    });
  }, [statusFilter, projectFilter, dueFrom, dueTo, refresh]);

  const bump = () => setRefresh((n) => n + 1);

  const onMarkSent = (id: string) => {
    const r = updateInvoice(id, { status: 'sent' }, actorName);
    if (r.ok) bump();
  };

  const onMarkPaid = (id: string) => {
    const item = MOCK_INVOICES_ADMIN.find((i) => i.id === id);
    if (!item) return;
    const r = updateInvoice(
      id,
      { status: 'paid', amountPaid: item.amount, amount: item.amount },
      actorName
    );
    if (r.ok) bump();
  };

  const saveNewInvoice = () => {
    setDrawerError(null);
    const project = projectsById.get(newProjectId);
    const amount = Number(newAmount || '0');
    try {
      createInvoice(
        {
          projectId: newProjectId,
          clientName: (newClientName.trim() || project?.clientName || '').trim(),
          amount: amount,
          amountPaid: 0,
          status: 'draft',
          issuedDate: newIssued,
          dueDate: newDue,
        },
        actorName
      );
      setDrawerOpen(false);
      bump();
    } catch (e) {
      setDrawerError(e instanceof Error ? e.message : 'Could not create invoice.');
    }
  };

  return (
    <div className="max-w-6xl min-w-0 space-y-6">
      <div>
        <p className="text-xs font-mono uppercase text-zinc-500">Financials</p>
        <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
          Invoices, proposals, cash
        </h2>
        <p className="text-sm text-zinc-500 mt-1">Filters apply to the invoice list. Summary cards use all open invoices.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm min-w-0">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 min-w-0">
          <p className="text-zinc-500 text-xs uppercase font-bold">Open AR</p>
          <p className="text-3xl font-bold text-white mt-1">${openTotal.toLocaleString()}</p>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 min-w-0">
          <p className="text-zinc-500 text-xs uppercase font-bold">Active projects</p>
          <p className="text-3xl font-bold text-white mt-1">
            {MOCK_ADMIN_PROJECTS.filter((p) => p.status === 'active').length}
          </p>
        </div>
      </div>

      <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4 h-80 min-w-0">
        <h3 className="text-sm font-semibold text-white mb-2">Revenue (sample series)</h3>
        <ResponsiveContainer width="100%" height="88%">
          <AreaChart data={chart}>
            <defs>
              <linearGradient id="fRev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#d4d4d8" stopOpacity={0.1} />
                <stop offset="95%" stopColor="#d4d4d8" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="name" stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis
              stroke="#52525b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `$${v / 1000}k`}
            />
            <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#fff' }} />
            <Area type="monotone" dataKey="revenue" stroke="#fafafa" strokeWidth={1.5} fill="url(#fRev)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="min-w-0">
        <h3 className="text-sm font-bold text-zinc-400 mb-2">Proposals</h3>
        <div className="space-y-2">
          {MOCK_PROPOSALS.map((p) => (
            <div
              key={p.id}
              className="bg-zinc-900/30 border border-zinc-800 rounded-lg px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 min-w-0"
            >
              <div className="min-w-0">
                <p className="text-white font-medium text-sm truncate">
                  {p.clientName} — {MOCK_ADMIN_PROJECTS.find((x) => x.id === p.projectId)?.title}
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
                  className="text-xs text-zinc-500 hover:text-white whitespace-nowrap"
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
          <h3 className="text-sm font-bold text-zinc-400">Invoices</h3>
          <button
            type="button"
            onClick={openCreateDrawer}
            className="w-full sm:w-auto rounded-lg bg-white text-zinc-900 px-3 py-2 text-xs font-semibold hover:bg-zinc-200"
          >
            New invoice
          </button>
        </div>

        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end min-w-0">
          <label className="flex flex-col gap-1 text-xs text-zinc-500 min-w-0 sm:min-w-[140px]">
            Status
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | AdminInvoiceStatus)}
              className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-200"
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
              className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-200"
            >
              <option value="all">All projects</option>
              {MOCK_ADMIN_PROJECTS.map((p) => (
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
              className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-200"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-zinc-500 min-w-0 sm:min-w-[140px]">
            Due to
            <input
              type="date"
              value={dueTo}
              onChange={(e) => setDueTo(e.target.value)}
              className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-200"
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
              className="text-xs text-zinc-500 hover:text-zinc-200 underline sm:mb-2"
            >
              Clear filters
            </button>
          )}
        </div>

        <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl overflow-x-auto min-w-0">
          <table className="w-full text-sm min-w-[800px]">
            <thead className="text-xs text-zinc-500 uppercase border-b border-zinc-800">
              <tr>
                <th className="text-left px-3 py-2">Id</th>
                <th className="text-left px-3 py-2">Client / project</th>
                <th className="text-right px-3 py-2">Open</th>
                <th className="text-left px-3 py-2">Due</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-left px-3 py-2">Actions</th>
                <th className="text-left px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-4 text-sm text-zinc-500">
                    No invoices match the current filters.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((i) => {
                  const canMarkSent = i.status === 'draft';
                  const canMarkPaid = i.status !== 'paid' && i.status !== 'void';
                  return (
                    <tr key={i.id} className="hover:bg-zinc-900/20">
                      <td className="px-3 py-2.5 font-mono text-zinc-300">{i.id}</td>
                      <td className="px-3 py-2.5 text-zinc-200 min-w-0 max-w-xs">
                        <span className="break-words">{i.clientName}</span>
                        <span className="text-zinc-500 text-xs"> · {i.projectId}</span>
                      </td>
                      <td className="px-3 py-2.5 text-right text-zinc-200">
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
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            disabled={!canMarkSent}
                            onClick={() => onMarkSent(i.id)}
                            className="rounded border border-zinc-600 bg-zinc-900 px-2 py-0.5 text-[11px] text-zinc-200 hover:border-zinc-500 disabled:opacity-40"
                          >
                            Mark sent
                          </button>
                          <button
                            type="button"
                            disabled={!canMarkPaid}
                            onClick={() => onMarkPaid(i.id)}
                            className="rounded border border-zinc-600 bg-zinc-900 px-2 py-0.5 text-[11px] text-zinc-200 hover:border-zinc-500 disabled:opacity-40"
                          >
                            Mark paid
                          </button>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right whitespace-nowrap">
                        <Link
                          to={`/hq/admin/projects/${i.projectId}`}
                          className="text-xs text-zinc-500 hover:text-white"
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
              className="mt-1 w-full min-w-0 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100"
            >
              {MOCK_ADMIN_PROJECTS.map((p) => (
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
              className="mt-1 w-full min-w-0 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100"
            />
          </label>
          <label className="block text-xs text-zinc-500">
            Amount (USD)
            <input
              type="number"
              min={0}
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
              className="mt-1 w-full min-w-0 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100"
            />
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block text-xs text-zinc-500">
              Issued
              <input
                type="date"
                value={newIssued}
                onChange={(e) => setNewIssued(e.target.value)}
                className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100"
              />
            </label>
            <label className="block text-xs text-zinc-500">
              Due
              <input
                type="date"
                value={newDue}
                onChange={(e) => setNewDue(e.target.value)}
                className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100"
              />
            </label>
          </div>
        </div>
      </AdminFormDrawer>
    </div>
  );
};

export default AdminFinancials;
