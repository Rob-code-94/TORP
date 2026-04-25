import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Banknote, Calendar, CheckCircle, Film, TrendingUp, Video, DollarSign, FileText } from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  getCommandStats,
  MOCK_ACTIVITY,
  MOCK_ASSETS,
  MOCK_INVOICES_ADMIN,
  MOCK_PLANNER,
  MOCK_SHOOTS_ADMIN,
} from '../../../data/adminMock';
import { columnLabel } from './adminFormat';

const revenueData = [
  { name: 'Jan', revenue: 40000 },
  { name: 'Feb', revenue: 30000 },
  { name: 'Mar', revenue: 55000 },
  { name: 'Apr', revenue: 48000 },
  { name: 'May', revenue: 70000 },
  { name: 'Jun', revenue: 62000 },
];

const AdminCommand: React.FC = () => {
  const stats = getCommandStats();

  const urgent = useMemo(
    () => MOCK_PLANNER.filter((t) => !t.done && t.priority === 'urgent').slice(0, 4),
    []
  );

  const nextShoots = useMemo(
    () => [...MOCK_SHOOTS_ADMIN].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3),
    []
  );

  const pendingAssets = useMemo(
    () => MOCK_ASSETS.filter((a) => a.status === 'client_review'),
    []
  );

  const overdue = useMemo(() => MOCK_INVOICES_ADMIN.filter((i) => i.status === 'overdue'), []);

  return (
    <div className="space-y-8 max-w-7xl">
      <div>
        <p className="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-1">Command center</p>
        <h2 className="text-2xl font-bold text-white tracking-tight">What needs attention</h2>
        <p className="text-sm text-zinc-500 mt-1">Operational view — same data will power Crew in read-only / filtered form.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-xl">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-zinc-500 mb-1">Revenue (YTD, demo)</p>
              <p className="text-2xl font-bold text-white">${(stats.revenueYtd / 1000).toFixed(0)}k</p>
            </div>
            <div className="p-2 bg-zinc-800/80 rounded-lg text-zinc-300">
              <DollarSign size={20} />
            </div>
          </div>
          <div className="mt-3 flex items-center text-xs text-zinc-500">
            <TrendingUp size={12} className="mr-1 text-zinc-400" /> Demo aggregate
          </div>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-xl">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-zinc-500 mb-1">Active projects</p>
              <p className="text-2xl font-bold text-white">{stats.activeProjects}</p>
            </div>
            <div className="p-2 bg-zinc-800/80 rounded-lg text-zinc-300">
              <Film size={20} />
            </div>
          </div>
          <p className="mt-3 text-xs text-zinc-500">Pipelines: prod + post in flight</p>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-xl">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-zinc-500 mb-1">Outstanding (open invoices)</p>
              <p className="text-2xl font-bold text-white">
                ${stats.outstanding.toLocaleString()}
              </p>
            </div>
            <div className="p-2 bg-zinc-800/80 rounded-lg text-amber-500/90">
              <FileText size={20} />
            </div>
          </div>
          <Link
            to="/hq/admin/financials"
            className="mt-3 text-xs text-zinc-500 hover:text-white inline-flex items-center gap-1"
          >
            Open financials
          </Link>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-xl">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-zinc-500 mb-1">Approvals in review</p>
              <p className="text-2xl font-bold text-white">{stats.pendingApprovals}</p>
            </div>
            <div className="p-2 bg-zinc-800/80 rounded-lg text-zinc-300">
              <Video size={20} />
            </div>
          </div>
          <p className="mt-3 text-xs text-zinc-500">Client-visible cuts / stills</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-5 h-72">
          <h3 className="text-sm font-semibold text-white mb-4">Revenue trajectory (demo)</h3>
          <ResponsiveContainer width="100%" height="85%">
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="cRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#e4e4e7" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#e4e4e7" stopOpacity={0} />
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
              <Tooltip
                contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#fff' }}
                itemStyle={{ color: '#fff' }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#fafafa"
                strokeWidth={1.5}
                fillOpacity={1}
                fill="url(#cRev)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-4">
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-500" /> Urgent tasks
            </h3>
            {urgent.length === 0 ? (
              <p className="text-sm text-zinc-500 mt-2">No urgent open items.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {urgent.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-start justify-between gap-2 text-sm border-b border-zinc-800/80 last:border-0 pb-2 last:pb-0"
                  >
                    <div>
                      <span className="text-white font-medium">{t.title}</span>
                      <span className="text-zinc-500"> · {t.projectTitle}</span>
                    </div>
                    <span className="shrink-0 text-[10px] uppercase text-zinc-500">{columnLabel(t.column)}</span>
                  </li>
                ))}
              </ul>
            )}
            <Link to="/hq/admin/planner" className="text-xs text-zinc-500 hover:text-white mt-2 inline-block">
              View planner
            </Link>
          </div>
          {overdue.length > 0 && (
            <div className="bg-red-950/20 border border-red-900/40 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-red-200 flex items-center gap-2">
                <Banknote size={16} /> Overdue or aging
              </h3>
              <ul className="mt-2 text-sm text-red-100/90">
                {overdue.map((i) => (
                  <li key={i.id} className="py-1">
                    {i.id} — {i.clientName} — ${(i.amount - i.amountPaid).toLocaleString()} open
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Calendar size={16} className="text-zinc-400" /> Upcoming schedule (shoots)
          </h3>
          <ul className="mt-3 space-y-3 text-sm">
            {nextShoots.map((s) => (
              <li key={s.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 border-b border-zinc-800/80 pb-3 last:border-0 last:pb-0">
                <div>
                  <p className="text-white font-medium">{s.projectTitle}</p>
                  <p className="text-zinc-500 text-xs">
                    {s.date} @ {s.callTime} — {s.location}
                  </p>
                </div>
                <Link
                  to={`/hq/admin/projects/${s.projectId}`}
                  className="text-xs text-zinc-500 hover:text-white"
                >
                  Open project
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <CheckCircle size={16} className="text-zinc-400" /> Pending client approvals
          </h3>
          {pendingAssets.length === 0 ? (
            <p className="text-sm text-zinc-500 mt-2">Nothing in client review.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm text-zinc-300">
              {pendingAssets.map((a) => (
                <li key={a.id}>
                  {a.label}{' '}
                  <span className="text-zinc-500">
                    (v{a.version})
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-zinc-400 mb-2">Activity</h3>
        <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl divide-y divide-zinc-800/80 max-h-56 overflow-y-auto">
          {MOCK_ACTIVITY.map((a) => (
            <div key={a.id} className="px-4 py-2.5 text-sm flex flex-wrap items-baseline gap-2">
              <span className="text-zinc-500 text-xs">
                {new Date(a.createdAt).toLocaleString()}
              </span>
              <span className="text-zinc-300">
                {a.actorName} — {a.action}
                <span className="text-zinc-500"> — {a.projectTitle}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminCommand;
