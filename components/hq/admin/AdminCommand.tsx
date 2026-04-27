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
  MOCK_STORAGE_OPS_EVENTS,
  createPlannerTask,
  createShoot,
  MOCK_ADMIN_PROJECTS,
  MOCK_ACTIVITY,
  MOCK_ASSETS,
  MOCK_CREW,
  MOCK_PLANNER,
  MOCK_SHOOTS_ADMIN,
  retryStorageOperation,
  revokeStorageOpsLink,
  recordStorageOpsEvent,
} from '../../../data/adminMock';
import { createClient } from '../../../data/adminProjectsApi';
import { getFinanceDashboardMetrics } from '../../../data/financeApi';
import { useAdminTheme } from '../../../lib/adminTheme';
import { useAuth } from '../../../lib/auth';
import { hasHqFeatureAccess } from '../../../lib/hqAccess';
import { hqUserGreetingName } from '../../../lib/hqUserDisplay';
import type { AdminProject, PlannerItemPriority } from '../../../types';
import {
  appErrorBannerClass,
  appIconWellClass,
  appInputClass,
  appKpiLinkClass,
  appKpiValueClass,
  appLinkMutedClass,
  appOutlineButtonClass,
  appPanelClass,
  appSuccessBannerClass,
  rechartsAxisStroke,
  rechartsTooltipProps,
} from '../../../lib/appThemeClasses';
import { columnLabel, formatAdminDate, formatAdminDateTime } from './adminFormat';
import AdminProjectWizard from './AdminProjectWizard';
import AdminFormDrawer from './AdminFormDrawer';
import ClientProfileForm, { EMPTY_CLIENT_PROFILE_DRAFT, type ClientProfileDraft } from './ClientProfileForm';

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
  const canCreateProject = hasHqFeatureAccess(user, 'quick.addProject');
  const canQuickClient = hasHqFeatureAccess(user, 'quick.addClient');
  const canQuickTaskShoot = hasHqFeatureAccess(user, 'quick.addTaskShoot');
  const canFinancialsPage = hasHqFeatureAccess(user, 'page.financials');

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

  const financeMetrics = useMemo(() => getFinanceDashboardMetrics(), [refreshTick]);
  const stats = useMemo(
    () => ({
      activeProjects: MOCK_ADMIN_PROJECTS.filter((project) => project.status === 'active').length,
      revenueYtd: financeMetrics.revenueYtd,
      outstanding: financeMetrics.openArTotal,
      pendingApprovals: MOCK_ASSETS.filter((asset) => asset.status === 'client_review').length,
      urgentTasks: MOCK_PLANNER.filter((task) => !task.done && task.priority === 'urgent').length,
    }),
    [financeMetrics, refreshTick]
  );

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

  const overdue = useMemo(() => financeMetrics.overdueInvoices, [financeMetrics]);
  const storageOpsEvents = useMemo(() => MOCK_STORAGE_OPS_EVENTS.slice(0, 8), [refreshTick]);
  const quotaSnapshot = useMemo(
    () => ({
      projectsGb: 412,
      deliverablesGb: 96,
      plannerGb: 8,
      financeGb: 24,
      crewGb: 11,
    }),
    []
  );

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

  const onRetryStorageEvent = (eventId: string) => {
    const result = retryStorageOperation(eventId, user?.displayName || user?.email || 'Admin');
    if (!result.ok) {
      setStatus({ tone: 'error', message: result.error || 'Could not retry storage operation.' });
      return;
    }
    setRefreshTick((value) => value + 1);
    setStatus({ tone: 'ok', message: 'Retry queued and logged.' });
  };

  const onRevokeStorageLink = (eventId: string) => {
    const result = revokeStorageOpsLink(eventId, user?.displayName || user?.email || 'Admin');
    if (!result.ok) {
      setStatus({ tone: 'error', message: result.error || 'Could not revoke link.' });
      return;
    }
    recordStorageOpsEvent({
      eventType: 'link_revoked',
      actorName: user?.displayName || user?.email || 'Admin',
      tenantId: 'torp-default',
      details: `Manual revoke from command center for ${eventId}`,
    });
    setRefreshTick((value) => value + 1);
    setStatus({ tone: 'ok', message: 'Link revoke action logged.' });
  };

  return (
    <div className="space-y-8 max-w-7xl min-w-0">
      <p className={`text-sm min-w-0 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
        Hello, {hqUserGreetingName(user ?? null)}
      </p>
      <div>
        <p className={`text-xs font-mono uppercase tracking-widest mb-1 ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>
          Command center
        </p>
        <h2 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>What needs attention</h2>
        <p className={`text-sm mt-1 ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>
          Operational view — same data will power Crew in read-only / filtered form.
        </p>
      </div>

      {status && (
        <div
          className={['rounded-xl px-4 py-2.5 text-sm', status.tone === 'ok' ? appSuccessBannerClass(isDark) : appErrorBannerClass(isDark)].join(' ')}
          role="status"
          aria-live="polite"
        >
          {status.message}
        </div>
      )}

      <div className={`rounded-xl p-4 sm:p-5 min-w-0 ${appPanelClass(isDark)}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-zinc-900'}`}>Quick actions</h3>
          {(!canQuickTaskShoot || !canQuickClient || !canCreateProject) && (
            <p className="text-xs text-zinc-500">Some quick actions are disabled by your crew feature access.</p>
          )}
        </div>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mt-3">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div
                key={idx}
                className={`h-11 rounded-lg border animate-pulse ${
                  isDark ? 'border-zinc-800 bg-zinc-900/60' : 'border-zinc-200 bg-zinc-100'
                }`}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mt-3 min-w-0">
            <button
              type="button"
              onClick={() => setTaskOpen(true)}
              disabled={!canQuickTaskShoot || activeProjects.length === 0}
              className={appOutlineButtonClass(isDark)}
            >
              <ClipboardPlus size={14} />
              Add quick task
            </button>
            <button
              type="button"
              onClick={() => setShootOpen(true)}
              disabled={!canQuickTaskShoot || activeProjects.length === 0}
              className={appOutlineButtonClass(isDark)}
            >
              <CalendarPlus size={14} />
              Add quick shoot
            </button>
            <button
              type="button"
              onClick={() => setClientOpen(true)}
              disabled={!canQuickClient}
              className={appOutlineButtonClass(isDark)}
            >
              <UserPlus size={14} />
              Add client
            </button>
            <button
              type="button"
              onClick={() => setWizardOpen(true)}
              disabled={!canCreateProject}
              className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wide disabled:cursor-not-allowed ${
                isDark
                  ? 'bg-white text-black disabled:bg-zinc-800 disabled:text-zinc-500 hover:bg-zinc-200'
                  : 'bg-zinc-900 text-white hover:bg-zinc-800 disabled:bg-zinc-200 disabled:text-zinc-500'
              }`}
            >
              <Plus size={14} />
              Add project
            </button>
          </div>
        )}
        {activeProjects.length === 0 && (
          <p className={`text-xs mt-2 ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>
            No active projects found. Create a project first to enable quick task and quick shoot.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {canFinancialsPage ? (
          <Link to="/hq/admin/financials" className={`p-5 rounded-xl transition-colors block ${appKpiLinkClass(isDark)}`}>
            <div className="flex items-start justify-between">
              <div>
                <p className={`text-xs mb-1 ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>Revenue (YTD)</p>
                <p className={appKpiValueClass(isDark)}>${(stats.revenueYtd / 1000).toFixed(0)}k</p>
              </div>
              <div className={appIconWellClass(isDark)}>
                <DollarSign size={20} />
              </div>
            </div>
            <div className={`mt-3 flex items-center text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>
              <TrendingUp size={12} className={`mr-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`} /> Live aggregate
            </div>
          </Link>
        ) : (
          <div className={`p-5 rounded-xl opacity-60 ${appKpiLinkClass(isDark, false)}`}>
            <div className="flex items-start justify-between">
              <div>
                <p className={`text-xs mb-1 ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>Revenue (YTD)</p>
                <p className={appKpiValueClass(isDark)}>${(stats.revenueYtd / 1000).toFixed(0)}k</p>
              </div>
              <div className={appIconWellClass(isDark)}>
                <DollarSign size={20} />
              </div>
            </div>
            <p className={`mt-3 text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>Financials access disabled by admin.</p>
          </div>
        )}

        <Link to="/hq/admin/projects" className={`p-5 rounded-xl block ${appKpiLinkClass(isDark)}`}>
          <div className="flex items-start justify-between">
            <div>
              <p className={`text-xs mb-1 ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>Active projects</p>
              <p className={appKpiValueClass(isDark)}>{stats.activeProjects}</p>
            </div>
            <div className={appIconWellClass(isDark)}>
              <Film size={20} />
            </div>
          </div>
          <p className={`mt-3 text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>Pipelines: prod + post in flight</p>
        </Link>

        <div className={`p-5 rounded-xl ${appKpiLinkClass(isDark, false)}`}>
          <div className="flex items-start justify-between">
            <div>
              <p className={`text-xs mb-1 ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>Outstanding (open invoices)</p>
              <p className={appKpiValueClass(isDark)}>${stats.outstanding.toLocaleString()}</p>
            </div>
            <div
              className={
                isDark
                  ? 'p-2 bg-zinc-800/80 rounded-lg text-amber-500/90'
                  : 'p-2 bg-amber-50 rounded-lg text-amber-700 border border-amber-200/80'
              }
            >
              <FileText size={20} />
            </div>
          </div>
          <Link to="/hq/admin/financials" className={`mt-3 text-xs inline-flex items-center gap-1 ${appLinkMutedClass(isDark)}`}>
            Open financials
          </Link>
        </div>

        <Link to="/hq/admin/projects?stage=post" className={`p-5 rounded-xl block ${appKpiLinkClass(isDark)}`}>
          <div className="flex items-start justify-between">
            <div>
              <p className={`text-xs mb-1 ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>Approvals in review</p>
              <p className={appKpiValueClass(isDark)}>{stats.pendingApprovals}</p>
            </div>
            <div className={appIconWellClass(isDark)}>
              <Video size={20} />
            </div>
          </div>
          <p className={`mt-3 text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>Client-visible cuts / stills</p>
        </Link>
      </div>

      <div className={`rounded-xl p-4 sm:p-5 min-w-0 ${isDark ? 'bg-zinc-900/40 border border-zinc-800' : 'bg-white border border-zinc-200'}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className={`text-sm font-semibold flex items-center gap-2 ${isDark ? 'text-white' : 'text-zinc-900'}`}>
            <Calendar size={16} className={isDark ? 'text-zinc-400' : 'text-zinc-500'} /> This week
          </h3>
          <Link to="/hq/admin/planner?view=calendar&mode=week" className={`text-xs ${appLinkMutedClass(isDark)}`}>
            Open full planner
          </Link>
        </div>
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 mt-3">
            {Array.from({ length: 7 }).map((_, idx) => (
              <div
                key={idx}
                className={`h-20 rounded-lg border animate-pulse ${
                  isDark ? 'border-zinc-800 bg-zinc-900/60' : 'border-zinc-200 bg-zinc-100'
                }`}
              />
            ))}
          </div>
        ) : (
          <div
            className={`mt-3 overflow-x-auto rounded-lg border min-w-0 ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}
          >
            <div className={`grid grid-cols-7 min-w-[720px] ${isDark ? 'divide-x divide-zinc-800/80' : 'divide-x divide-zinc-200'}`}>
              {weekData.map((day) => (
                <button
                  key={day.ymd}
                  type="button"
                  onClick={() => navigate(`/hq/admin/planner?view=calendar&mode=day&date=${day.ymd}`)}
                  className={`text-left p-2.5 transition-colors min-h-[96px] ${
                    isDark ? 'hover:bg-zinc-800/40' : 'hover:bg-zinc-100'
                  }`}
                >
                  <p className={`text-[10px] uppercase font-bold ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>
                    {day.short} <span className={isDark ? 'text-zinc-400' : 'text-zinc-500'}>{day.day}</span>
                  </p>
                  <div className="mt-1 space-y-1">
                    {day.items.slice(0, 2).map((item) => (
                      <p
                        key={item.id}
                        className={`text-[10px] truncate ${isDark ? 'text-zinc-300' : 'text-zinc-800'}`}
                        title={item.title}
                      >
                        {item.title}
                      </p>
                    ))}
                    {day.items.length === 0 && (
                      <p className={`text-[10px] ${isDark ? 'text-zinc-600' : 'text-zinc-500'}`}>No items</p>
                    )}
                    {day.items.length > 2 && (
                      <p className={`text-[10px] ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
                        +{day.items.length - 2} more
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div
          className={`rounded-xl p-5 h-72 ${isDark ? 'bg-zinc-900/40 border border-zinc-800' : 'bg-white border border-zinc-200'}`}
        >
          <h3 className={`text-sm font-semibold mb-4 ${isDark ? 'text-white' : 'text-zinc-900'}`}>
            Revenue trajectory
          </h3>
          <ResponsiveContainer width="100%" height="85%">
            <AreaChart data={financeMetrics.monthlyRevenue}>
              <defs>
                <linearGradient id="cRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#e4e4e7" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#e4e4e7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="name" stroke={rechartsAxisStroke(isDark)} fontSize={11} tickLine={false} axisLine={false} />
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
                stroke={isDark ? '#fafafa' : '#27272a'}
                strokeWidth={1.5}
                fillOpacity={1}
                fill="url(#cRev)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-4">
          <div className={`rounded-xl p-4 ${isDark ? 'bg-zinc-900/40 border border-zinc-800' : 'bg-white border border-zinc-200'}`}>
            <h3 className={`text-sm font-semibold flex items-center gap-2 ${isDark ? 'text-white' : 'text-zinc-900'}`}>
              <AlertTriangle size={16} className="text-amber-500" /> Urgent tasks
            </h3>
            {urgent.length === 0 ? (
              <p className={`text-sm mt-2 ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>No urgent open items.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {urgent.map((t) => (
                  <li
                    key={t.id}
                    className={`flex items-start justify-between gap-2 text-sm border-b last:border-0 pb-2 last:pb-0 ${
                      isDark ? 'border-zinc-800/80' : 'border-zinc-200'
                    }`}
                  >
                    <Link
                      to={`/hq/admin/projects/${t.projectId}`}
                      className={`min-w-0 ${isDark ? 'hover:text-white' : 'hover:text-zinc-700'}`}
                    >
                      <span className={`font-medium ${isDark ? 'text-white' : 'text-zinc-900'}`}>{t.title}</span>
                      <span className={isDark ? 'text-zinc-500' : 'text-zinc-600'}> · {t.projectTitle}</span>
                    </Link>
                    <span className={`shrink-0 text-[10px] uppercase ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
                      {columnLabel(t.column)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Link to="/hq/admin/planner" className={`text-xs mt-2 inline-block ${appLinkMutedClass(isDark)}`}>
              View planner
            </Link>
          </div>
          {overdue.length > 0 && (
            <div
              className={
                isDark
                  ? 'bg-red-950/20 border border-red-900/40 rounded-xl p-4'
                  : 'bg-red-50 border border-red-200 rounded-xl p-4'
              }
            >
              <h3 className={`text-sm font-semibold flex items-center gap-2 ${isDark ? 'text-red-200' : 'text-red-800'}`}>
                <Banknote size={16} /> Overdue or aging
              </h3>
              <ul className={`mt-2 text-sm ${isDark ? 'text-red-100/90' : 'text-red-800'}`}>
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
        <div className={`rounded-xl p-4 ${isDark ? 'bg-zinc-900/40 border border-zinc-800' : 'bg-white border border-zinc-200'}`}>
          <h3 className={`text-sm font-semibold flex items-center gap-2 ${isDark ? 'text-white' : 'text-zinc-900'}`}>
            <Calendar size={16} className={isDark ? 'text-zinc-400' : 'text-zinc-500'} /> Upcoming schedule (shoots)
          </h3>
          <ul className="mt-3 space-y-3 text-sm">
            {nextShoots.map((s) => (
              <li
                key={s.id}
                className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 border-b pb-3 last:border-0 last:pb-0 ${
                  isDark ? 'border-zinc-800/80' : 'border-zinc-200'
                }`}
              >
                <div>
                  <Link
                    to={`/hq/admin/projects/${s.projectId}`}
                    className={`font-medium hover:underline ${isDark ? 'text-white' : 'text-zinc-900'}`}
                  >
                    {s.projectTitle}
                  </Link>
                  <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>
                    {formatAdminDate(s.date)} @ {s.callTime} — {s.location}
                  </p>
                </div>
                <Link
                  to={`/hq/admin/projects/${s.projectId}`}
                  className={`text-xs ${appLinkMutedClass(isDark)}`}
                >
                  Open project
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className={`rounded-xl p-4 ${isDark ? 'bg-zinc-900/40 border border-zinc-800' : 'bg-white border border-zinc-200'}`}>
          <h3 className={`text-sm font-semibold flex items-center gap-2 ${isDark ? 'text-white' : 'text-zinc-900'}`}>
            <CheckCircle size={16} className={isDark ? 'text-zinc-400' : 'text-zinc-500'} /> Pending client approvals
          </h3>
          {pendingAssets.length === 0 ? (
            <p className={`text-sm mt-2 ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>Nothing in client review.</p>
          ) : (
            <ul className={`mt-3 space-y-2 text-sm ${isDark ? 'text-zinc-300' : 'text-zinc-800'}`}>
              {pendingAssets.map((a) => (
                <li key={a.id}>
                  <Link
                    to={`/hq/admin/projects/${a.projectId}`}
                    className={isDark ? 'hover:text-white' : 'hover:text-zinc-600'}
                  >
                    {a.label}{' '}
                  </Link>
                  <span className={isDark ? 'text-zinc-500' : 'text-zinc-600'}>
                    (v{a.version})
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div>
        <h3 className={`text-sm font-semibold mb-2 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>Recent activity feed</h3>
        <div
          className={`rounded-xl max-h-56 overflow-y-auto ${
            isDark
              ? 'bg-zinc-900/30 border border-zinc-800 divide-y divide-zinc-800/80'
              : 'bg-white border border-zinc-200 divide-y divide-zinc-200'
          }`}
        >
          {MOCK_ACTIVITY.map((a) => (
            <Link
              key={a.id}
              to={`/hq/admin/projects/${a.projectId}`}
              className={`block px-4 py-2.5 text-sm ${
                isDark ? 'hover:bg-zinc-900/40' : 'hover:bg-zinc-50'
              }`}
            >
              <span className={`text-xs block ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>
                {formatAdminDateTime(a.createdAt)}
              </span>
              <span className={isDark ? 'text-zinc-300' : 'text-zinc-800'}>
                {a.actorName} — {a.action}
                <span className={isDark ? 'text-zinc-500' : 'text-zinc-600'}> — {a.projectTitle}</span>
              </span>
            </Link>
          ))}
        </div>
      </div>

      <div className={`rounded-xl p-4 min-w-0 ${appPanelClass(isDark)}`}>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
          <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-zinc-900'}`}>Storage ops lite</h3>
          <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>
            Quota snapshot and recent storage events.
          </p>
        </div>
        <div className="mt-3 grid grid-cols-2 md:grid-cols-5 gap-2 min-w-0">
          <div className={`rounded-md p-2 ${isDark ? 'bg-zinc-950/70' : 'bg-zinc-100'}`}>
            <p className="text-[10px] uppercase text-zinc-500">Projects</p>
            <p className={`text-sm font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{quotaSnapshot.projectsGb} GB</p>
          </div>
          <div className={`rounded-md p-2 ${isDark ? 'bg-zinc-950/70' : 'bg-zinc-100'}`}>
            <p className="text-[10px] uppercase text-zinc-500">Deliverables</p>
            <p className={`text-sm font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{quotaSnapshot.deliverablesGb} GB</p>
          </div>
          <div className={`rounded-md p-2 ${isDark ? 'bg-zinc-950/70' : 'bg-zinc-100'}`}>
            <p className="text-[10px] uppercase text-zinc-500">Planner</p>
            <p className={`text-sm font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{quotaSnapshot.plannerGb} GB</p>
          </div>
          <div className={`rounded-md p-2 ${isDark ? 'bg-zinc-950/70' : 'bg-zinc-100'}`}>
            <p className="text-[10px] uppercase text-zinc-500">Finance</p>
            <p className={`text-sm font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{quotaSnapshot.financeGb} GB</p>
          </div>
          <div className={`rounded-md p-2 ${isDark ? 'bg-zinc-950/70' : 'bg-zinc-100'}`}>
            <p className="text-[10px] uppercase text-zinc-500">Crew</p>
            <p className={`text-sm font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{quotaSnapshot.crewGb} GB</p>
          </div>
        </div>
        <div className={`mt-3 rounded-lg overflow-x-auto ${isDark ? 'border border-zinc-800' : 'border border-zinc-200'}`}>
          <table className="w-full min-w-[760px] text-xs">
            <thead className={isDark ? 'bg-zinc-950/60 text-zinc-500' : 'bg-zinc-100 text-zinc-600'}>
              <tr>
                <th className="text-left px-2 py-1.5">Type</th>
                <th className="text-left px-2 py-1.5">Asset</th>
                <th className="text-left px-2 py-1.5">Details</th>
                <th className="text-left px-2 py-1.5">Timestamp</th>
                <th className="text-left px-2 py-1.5">Actions</th>
              </tr>
            </thead>
            <tbody className={isDark ? 'divide-y divide-zinc-800/80' : 'divide-y divide-zinc-200'}>
              {storageOpsEvents.map((event) => (
                <tr key={event.id}>
                  <td className="px-2 py-1.5">{event.eventType}</td>
                  <td className="px-2 py-1.5">{event.assetId || '—'}</td>
                  <td className="px-2 py-1.5">{event.details || event.errorCode || '—'}</td>
                  <td className="px-2 py-1.5">{formatAdminDateTime(event.timestamp)}</td>
                  <td className="px-2 py-1.5">
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => onRetryStorageEvent(event.id)}
                        className="rounded border border-zinc-700 px-1.5 py-0.5"
                      >
                        Retry
                      </button>
                      <button
                        type="button"
                        onClick={() => onRevokeStorageLink(event.id)}
                        className="rounded border border-red-800/70 px-1.5 py-0.5 text-red-300"
                      >
                        Revoke
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
            <button
              type="button"
              onClick={() => setClientOpen(false)}
              className={`rounded-md border px-3 py-1.5 text-xs ${
                isDark ? 'border-zinc-700 text-zinc-300' : 'border-zinc-300 text-zinc-700'
              }`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submitQuickClient}
              className={`rounded-md px-3 py-1.5 text-xs font-bold ${
                isDark ? 'bg-white text-black hover:bg-zinc-200' : 'bg-zinc-900 text-white hover:bg-zinc-800'
              }`}
            >
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
            <button
              type="button"
              onClick={() => setTaskOpen(false)}
              className={`rounded-md border px-3 py-1.5 text-xs ${
                isDark ? 'border-zinc-700 text-zinc-300' : 'border-zinc-300 text-zinc-700'
              }`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submitQuickTask}
              className={`rounded-md px-3 py-1.5 text-xs font-bold ${
                isDark ? 'bg-white text-black hover:bg-zinc-200' : 'bg-zinc-900 text-white hover:bg-zinc-800'
              }`}
            >
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
            className={appInputClass(isDark)}
          >
            <option value="">Select project</option>
            {activeProjects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.title}
              </option>
            ))}
          </select>
          <input
            value={taskDraft.title}
            onChange={(e) => setTaskDraft((v) => ({ ...v, title: e.target.value }))}
            placeholder="Task title"
            className={appInputClass(isDark)}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="date"
              value={taskDraft.dueDate}
              onChange={(e) => setTaskDraft((v) => ({ ...v, dueDate: e.target.value }))}
              className={appInputClass(isDark)}
            />
            <select
              value={taskDraft.priority}
              onChange={(e) => setTaskDraft((v) => ({ ...v, priority: e.target.value as PlannerItemPriority }))}
              className={appInputClass(isDark)}
            >
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
            <button
              type="button"
              onClick={() => setShootOpen(false)}
              className={`rounded-md border px-3 py-1.5 text-xs ${
                isDark ? 'border-zinc-700 text-zinc-300' : 'border-zinc-300 text-zinc-700'
              }`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submitQuickShoot}
              className={`rounded-md px-3 py-1.5 text-xs font-bold ${
                isDark ? 'bg-white text-black hover:bg-zinc-200' : 'bg-zinc-900 text-white hover:bg-zinc-800'
              }`}
            >
              Save Shoot
            </button>
          </div>
        }
      >
        <div className="space-y-2">
          <select
            value={shootDraft.projectId}
            onChange={(e) => setShootDraft((v) => ({ ...v, projectId: e.target.value }))}
            className={appInputClass(isDark)}
          >
            <option value="">Select project</option>
            {activeProjects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.title}
              </option>
            ))}
          </select>
          <input
            value={shootDraft.title}
            onChange={(e) => setShootDraft((v) => ({ ...v, title: e.target.value }))}
            placeholder="Shoot title"
            className={appInputClass(isDark)}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="date"
              value={shootDraft.date}
              onChange={(e) => setShootDraft((v) => ({ ...v, date: e.target.value }))}
              className={appInputClass(isDark)}
            />
            <input
              type="time"
              value={shootDraft.callTime}
              onChange={(e) => setShootDraft((v) => ({ ...v, callTime: e.target.value }))}
              className={appInputClass(isDark)}
            />
          </div>
          <input
            value={shootDraft.location}
            onChange={(e) => setShootDraft((v) => ({ ...v, location: e.target.value }))}
            placeholder="Location"
            className={appInputClass(isDark)}
          />
          <textarea
            value={shootDraft.description}
            onChange={(e) => setShootDraft((v) => ({ ...v, description: e.target.value }))}
            placeholder="Description (optional)"
            rows={3}
            className={appInputClass(isDark)}
          />
        </div>
      </AdminFormDrawer>
    </div>
  );
};

export default AdminCommand;
