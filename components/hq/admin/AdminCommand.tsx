import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Banknote,
  Calendar,
  CalendarPlus,
  CheckCircle,
  Film,
  Plus,
  TrendingUp,
  Video,
  DollarSign,
  FileText,
  ClipboardPlus,
  UserPlus,
} from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  createPlannerTask,
  createShoot,
  getCommandStats,
  MOCK_ADMIN_PROJECTS,
  MOCK_ACTIVITY,
  MOCK_ASSETS,
  MOCK_CREW,
  MOCK_INVOICES_ADMIN,
  MOCK_PLANNER,
  MOCK_SHOOTS_ADMIN,
} from '../../../data/adminMock';
import { createClient } from '../../../data/adminProjectsApi';
import { useAdminTheme } from '../../../lib/adminTheme';
import { useAuth } from '../../../lib/auth';
import { hqUserGreetingName } from '../../../lib/hqUserDisplay';
import { hasProjectCapability } from '../../../lib/projectPermissions';
import type { AdminProject, PlannerItemPriority } from '../../../types';
import { columnLabel, formatAdminDate, formatAdminDateTime } from './adminFormat';
import AdminProjectWizard from './AdminProjectWizard';
import AdminFormDrawer from './AdminFormDrawer';
import ClientProfileForm, { EMPTY_CLIENT_PROFILE_DRAFT, type ClientProfileDraft } from './ClientProfileForm';

const revenueData = [
  { name: 'Jan', revenue: 40000 },
  { name: 'Feb', revenue: 30000 },
  { name: 'Mar', revenue: 55000 },
  { name: 'Apr', revenue: 48000 },
  { name: 'May', revenue: 70000 },
  { name: 'Jun', revenue: 62000 },
];

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function toYmd(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function startOfWeekSun(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - x.getDay());
  return x;
}

const AdminCommand: React.FC = () => {
  const { user } = useAuth();
  const { theme } = useAdminTheme();
  const navigate = useNavigate();
  const isDark = theme === 'dark';
  const [refreshTick, setRefreshTick] = useState(0);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<{ tone: 'ok' | 'error'; message: string } | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [clientOpen, setClientOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [shootOpen, setShootOpen] = useState(false);

  const activeProjects = useMemo(
    () => MOCK_ADMIN_PROJECTS.filter((p) => p.status === 'active'),
    [refreshTick]
  );
  const defaultProject = activeProjects[0];
  const canCreateProject = hasProjectCapability(user?.role, 'project.create');
  const canQuickClient = user?.role === 'ADMIN';
  const canQuickTaskShoot = hasProjectCapability(user?.role, 'project.create');

  const [clientDraft, setClientDraft] = useState<ClientProfileDraft>(EMPTY_CLIENT_PROFILE_DRAFT);
  const [taskDraft, setTaskDraft] = useState(() => {
    const project = defaultProject;
    return {
      projectId: project?.id || '',
      title: '',
      dueDate: new Date().toISOString().slice(0, 10),
      priority: 'medium' as PlannerItemPriority,
      assigneeCrewId: project?.ownerCrewId || '',
    };
  });
  const [shootDraft, setShootDraft] = useState(() => {
    const project = defaultProject;
    return {
      projectId: project?.id || '',
      title: '',
      date: new Date().toISOString().slice(0, 10),
      callTime: '08:00',
      location: '',
      description: '',
    };
  });

  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), 250);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!taskDraft.projectId && defaultProject?.id) {
      setTaskDraft((current) => ({
        ...current,
        projectId: defaultProject.id,
        assigneeCrewId: defaultProject.ownerCrewId,
      }));
    }
    if (!shootDraft.projectId && defaultProject?.id) {
      setShootDraft((current) => ({
        ...current,
        projectId: defaultProject.id,
      }));
    }
  }, [defaultProject?.id]);

  useEffect(() => {
    if (!status) return;
    const timer = window.setTimeout(() => setStatus(null), 3000);
    return () => window.clearTimeout(timer);
  }, [status]);

  const stats = getCommandStats();

  const urgent = useMemo(
    () => MOCK_PLANNER.filter((t) => !t.done && t.priority === 'urgent').slice(0, 4),
    [refreshTick]
  );

  const nextShoots = useMemo(
    () => [...MOCK_SHOOTS_ADMIN].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3),
    [refreshTick]
  );

  const pendingAssets = useMemo(
    () => MOCK_ASSETS.filter((a) => a.status === 'client_review'),
    [refreshTick]
  );

  const overdue = useMemo(() => MOCK_INVOICES_ADMIN.filter((i) => i.status === 'overdue'), [refreshTick]);

  const weekData = useMemo(() => {
    const start = startOfWeekSun(new Date());
    const byDate = new Map<string, typeof MOCK_PLANNER>();
    for (let i = 0; i < 7; i++) {
      const key = toYmd(addDays(start, i));
      byDate.set(key, []);
    }
    for (const item of MOCK_PLANNER) {
      if (byDate.has(item.dueDate)) {
        byDate.get(item.dueDate)!.push(item);
      }
    }
    return Array.from({ length: 7 }, (_, idx) => {
      const date = addDays(start, idx);
      const ymd = toYmd(date);
      return {
        ymd,
        short: WEEKDAY_SHORT[date.getDay()],
        day: date.getDate(),
        items: byDate.get(ymd) || [],
      };
    });
  }, [refreshTick]);

  const submitQuickClient = () => {
    const result = createClient(clientDraft);
    if (!result.ok) {
      setStatus({ tone: 'error', message: 'error' in result ? result.error : 'Could not create client.' });
      return;
    }
    setClientDraft(EMPTY_CLIENT_PROFILE_DRAFT);
    setClientOpen(false);
    setRefreshTick((v) => v + 1);
    setStatus({ tone: 'ok', message: 'Client added.' });
  };

  const projectById = (projectId: string): AdminProject | undefined =>
    MOCK_ADMIN_PROJECTS.find((project) => project.id === projectId);

  const submitQuickTask = () => {
    if (!taskDraft.projectId) {
      setStatus({ tone: 'error', message: 'Select a project to add a task.' });
      return;
    }
    const project = projectById(taskDraft.projectId);
    if (!project) {
      setStatus({ tone: 'error', message: 'Project not found.' });
      return;
    }
    if (!taskDraft.title.trim()) {
      setStatus({ tone: 'error', message: 'Task title is required.' });
      return;
    }
    try {
      createPlannerTask(
        {
          projectId: project.id,
          projectTitle: project.title,
          clientName: project.clientName,
          type: 'admin',
          title: taskDraft.title.trim(),
          column: 'queue',
          priority: taskDraft.priority,
          dueDate: taskDraft.dueDate,
          assigneeCrewIds: [taskDraft.assigneeCrewId || project.ownerCrewId],
          assigneeCrewId: taskDraft.assigneeCrewId || project.ownerCrewId,
          assigneeName:
            MOCK_CREW.find((crew) => crew.id === (taskDraft.assigneeCrewId || project.ownerCrewId))
              ?.displayName || project.ownerName,
          done: false,
          notes: '',
          description: '',
        },
        user?.displayName || 'Admin'
      );
      setTaskDraft((current) => ({ ...current, title: '' }));
      setTaskOpen(false);
      setRefreshTick((v) => v + 1);
      setStatus({ tone: 'ok', message: 'Task added to planner.' });
    } catch (error) {
      setStatus({ tone: 'error', message: error instanceof Error ? error.message : 'Could not add task.' });
    }
  };

  const submitQuickShoot = () => {
    if (!shootDraft.projectId) {
      setStatus({ tone: 'error', message: 'Select a project to add a shoot.' });
      return;
    }
    const project = projectById(shootDraft.projectId);
    if (!project) {
      setStatus({ tone: 'error', message: 'Project not found.' });
      return;
    }
    if (!shootDraft.title.trim()) {
      setStatus({ tone: 'error', message: 'Shoot title is required.' });
      return;
    }
    try {
      createShoot(
        {
          projectId: project.id,
          projectTitle: project.title,
          title: shootDraft.title.trim(),
          date: shootDraft.date,
          callTime: shootDraft.callTime,
          location: shootDraft.location.trim() || 'TBD',
          description: shootDraft.description.trim(),
          gearSummary: '',
          crew: [project.ownerCrewId],
        },
        user?.displayName || 'Admin'
      );
      setShootDraft((current) => ({ ...current, title: '', location: '', description: '' }));
      setShootOpen(false);
      setRefreshTick((v) => v + 1);
      setStatus({ tone: 'ok', message: 'Shoot created.' });
    } catch (error) {
      setStatus({ tone: 'error', message: error instanceof Error ? error.message : 'Could not create shoot.' });
    }
  };

  return (
    <div className="space-y-8 max-w-7xl min-w-0">
      <p className={`text-sm min-w-0 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
        Hello, {hqUserGreetingName(user ?? null)}
      </p>
      <div>
        <p className="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-1">Command center</p>
        <h2 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>What needs attention</h2>
        <p className="text-sm text-zinc-500 mt-1">Operational view — same data will power Crew in read-only / filtered form.</p>
      </div>

      {status && (
        <div
          className={[
            'rounded-xl border px-4 py-2.5 text-sm',
            status.tone === 'ok'
              ? 'border-emerald-900/40 bg-emerald-950/20 text-emerald-200'
              : 'border-red-900/40 bg-red-950/20 text-red-200',
          ].join(' ')}
          role="status"
          aria-live="polite"
        >
          {status.message}
        </div>
      )}

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 sm:p-5 min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-white">Quick actions</h3>
          {!canQuickTaskShoot && (
            <p className="text-xs text-zinc-500">Project manager permissions are limited for quick create actions.</p>
          )}
        </div>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mt-3">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="h-11 rounded-lg border border-zinc-800 bg-zinc-900/60 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mt-3 min-w-0">
            <button
              type="button"
              onClick={() => setTaskOpen(true)}
              disabled={!canQuickTaskShoot || activeProjects.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-xs font-bold uppercase tracking-wide text-zinc-100 disabled:text-zinc-500 disabled:border-zinc-800 disabled:cursor-not-allowed hover:bg-zinc-800/60"
            >
              <ClipboardPlus size={14} />
              Add quick task
            </button>
            <button
              type="button"
              onClick={() => setShootOpen(true)}
              disabled={!canQuickTaskShoot || activeProjects.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-xs font-bold uppercase tracking-wide text-zinc-100 disabled:text-zinc-500 disabled:border-zinc-800 disabled:cursor-not-allowed hover:bg-zinc-800/60"
            >
              <CalendarPlus size={14} />
              Add quick shoot
            </button>
            <button
              type="button"
              onClick={() => setClientOpen(true)}
              disabled={!canQuickClient}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-xs font-bold uppercase tracking-wide text-zinc-100 disabled:text-zinc-500 disabled:border-zinc-800 disabled:cursor-not-allowed hover:bg-zinc-800/60"
            >
              <UserPlus size={14} />
              Add client
            </button>
            <button
              type="button"
              onClick={() => setWizardOpen(true)}
              disabled={!canCreateProject}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-bold uppercase tracking-wide text-black disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed hover:bg-zinc-200"
            >
              <Plus size={14} />
              Add project
            </button>
          </div>
        )}
        {activeProjects.length === 0 && (
          <p className="text-xs text-amber-300 mt-2">No active projects found. Create a project first to enable quick task and quick shoot.</p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Link to="/hq/admin/financials" className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-xl hover:border-zinc-700 transition-colors">
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
        </Link>

        <Link to="/hq/admin/projects" className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-xl hover:border-zinc-700 transition-colors">
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
        </Link>

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

        <Link to="/hq/admin/projects?stage=post" className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-xl hover:border-zinc-700 transition-colors">
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
        </Link>
      </div>

      <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4 sm:p-5 min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Calendar size={16} className="text-zinc-400" /> This week
          </h3>
          <Link to="/hq/admin/planner?view=calendar&mode=week" className="text-xs text-zinc-500 hover:text-white">
            Open full planner
          </Link>
        </div>
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 mt-3">
            {Array.from({ length: 7 }).map((_, idx) => (
              <div key={idx} className="h-20 rounded-lg border border-zinc-800 bg-zinc-900/60 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-lg border border-zinc-800">
            <div className="grid grid-cols-7 min-w-[720px] divide-x divide-zinc-800/80">
              {weekData.map((day) => (
                <button
                  key={day.ymd}
                  type="button"
                  onClick={() => navigate(`/hq/admin/planner?view=calendar&mode=day&date=${day.ymd}`)}
                  className="text-left p-2.5 hover:bg-zinc-800/40 transition-colors min-h-[96px]"
                >
                  <p className="text-[10px] uppercase text-zinc-500 font-bold">
                    {day.short} <span className="text-zinc-400">{day.day}</span>
                  </p>
                  <div className="mt-1 space-y-1">
                    {day.items.slice(0, 2).map((item) => (
                      <p key={item.id} className="text-[10px] text-zinc-300 truncate" title={item.title}>
                        {item.title}
                      </p>
                    ))}
                    {day.items.length === 0 && <p className="text-[10px] text-zinc-600">No items</p>}
                    {day.items.length > 2 && <p className="text-[10px] text-zinc-500">+{day.items.length - 2} more</p>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
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
                    <Link to={`/hq/admin/projects/${t.projectId}`} className="min-w-0 hover:text-white">
                      <span className="text-white font-medium">{t.title}</span>
                      <span className="text-zinc-500"> · {t.projectTitle}</span>
                    </Link>
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
                    <Link to="/hq/admin/financials" className="hover:underline">
                      {i.id} — {i.clientName} — ${(i.amount - i.amountPaid).toLocaleString()} open
                    </Link>
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
                  <Link to={`/hq/admin/projects/${s.projectId}`} className="text-white font-medium hover:underline">{s.projectTitle}</Link>
                  <p className="text-zinc-500 text-xs">
                    {formatAdminDate(s.date)} @ {s.callTime} — {s.location}
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
                  <Link to={`/hq/admin/projects/${a.projectId}`} className="hover:text-white">
                    {a.label}{' '}
                  </Link>
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
        <h3 className="text-sm font-semibold text-zinc-400 mb-2">Recent activity feed</h3>
        <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl divide-y divide-zinc-800/80 max-h-56 overflow-y-auto">
          {MOCK_ACTIVITY.map((a) => (
            <Link key={a.id} to={`/hq/admin/projects/${a.projectId}`} className="block px-4 py-2.5 text-sm hover:bg-zinc-900/40">
              <span className="text-zinc-500 text-xs">
                {formatAdminDateTime(a.createdAt)}
              </span>
              <span className="text-zinc-300">
                {a.actorName} — {a.action}
                <span className="text-zinc-500"> — {a.projectTitle}</span>
              </span>
            </Link>
          ))}
        </div>
      </div>

      <AdminProjectWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onCreated={() => {
          setWizardOpen(false);
          setRefreshTick((value) => value + 1);
          setStatus({ tone: 'ok', message: 'Project created.' });
        }}
      />

      <AdminFormDrawer
        open={clientOpen}
        onClose={() => setClientOpen(false)}
        title="Quick Add Client"
        subtitle="Create a client profile for project setup"
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setClientOpen(false)} className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300">
              Cancel
            </button>
            <button type="button" onClick={submitQuickClient} className="rounded-md bg-white px-3 py-1.5 text-xs font-bold text-black hover:bg-zinc-200">
              Save Client
            </button>
          </div>
        }
      >
        <ClientProfileForm value={clientDraft} onChange={setClientDraft} />
      </AdminFormDrawer>

      <AdminFormDrawer
        open={taskOpen}
        onClose={() => setTaskOpen(false)}
        title="Add quick task"
        subtitle="Create a planner task from command center"
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setTaskOpen(false)} className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300">
              Cancel
            </button>
            <button type="button" onClick={submitQuickTask} className="rounded-md bg-white px-3 py-1.5 text-xs font-bold text-black hover:bg-zinc-200">
              Save Task
            </button>
          </div>
        }
      >
        <div className="space-y-2">
          <select
            value={taskDraft.projectId}
            onChange={(e) =>
              setTaskDraft((current) => {
                const nextProject = MOCK_ADMIN_PROJECTS.find((project) => project.id === e.target.value);
                return {
                  ...current,
                  projectId: e.target.value,
                  assigneeCrewId: nextProject?.ownerCrewId || '',
                };
              })
            }
            className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
          >
            <option value="">Select project</option>
            {activeProjects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.title}
              </option>
            ))}
          </select>
          <input value={taskDraft.title} onChange={(e) => setTaskDraft((v) => ({ ...v, title: e.target.value }))} placeholder="Task title" className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input type="date" value={taskDraft.dueDate} onChange={(e) => setTaskDraft((v) => ({ ...v, dueDate: e.target.value }))} className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100" />
            <select value={taskDraft.priority} onChange={(e) => setTaskDraft((v) => ({ ...v, priority: e.target.value as PlannerItemPriority }))} className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>
      </AdminFormDrawer>

      <AdminFormDrawer
        open={shootOpen}
        onClose={() => setShootOpen(false)}
        title="Add quick shoot"
        subtitle="Create a shoot event from command center"
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShootOpen(false)} className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300">
              Cancel
            </button>
            <button type="button" onClick={submitQuickShoot} className="rounded-md bg-white px-3 py-1.5 text-xs font-bold text-black hover:bg-zinc-200">
              Save Shoot
            </button>
          </div>
        }
      >
        <div className="space-y-2">
          <select
            value={shootDraft.projectId}
            onChange={(e) => setShootDraft((v) => ({ ...v, projectId: e.target.value }))}
            className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
          >
            <option value="">Select project</option>
            {activeProjects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.title}
              </option>
            ))}
          </select>
          <input value={shootDraft.title} onChange={(e) => setShootDraft((v) => ({ ...v, title: e.target.value }))} placeholder="Shoot title" className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input type="date" value={shootDraft.date} onChange={(e) => setShootDraft((v) => ({ ...v, date: e.target.value }))} className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100" />
            <input type="time" value={shootDraft.callTime} onChange={(e) => setShootDraft((v) => ({ ...v, callTime: e.target.value }))} className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100" />
          </div>
          <input value={shootDraft.location} onChange={(e) => setShootDraft((v) => ({ ...v, location: e.target.value }))} placeholder="Location" className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100" />
          <textarea value={shootDraft.description} onChange={(e) => setShootDraft((v) => ({ ...v, description: e.target.value }))} placeholder="Description (optional)" rows={3} className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100" />
        </div>
      </AdminFormDrawer>
    </div>
  );
};

export default AdminCommand;
