import React, { useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import {
  MOCK_CREW,
  PROJECT_STAGE_ORDER,
  assignCrewToProject,
  createBlocker,
  createDeliverable,
  createDependency,
  createExpense,
  createInvoice,
  createPlannerTask,
  createProjectAsset,
  createRisk,
  createShoot,
  createMeeting,
  deleteDeliverable,
  deleteMeeting,
  deletePlannerTask,
  deleteProjectAsset,
  deleteShoot,
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
  getMeetingsByProject,
  plannerStatusFromItem,
  plannerStatusToLegacy,
  projectAssignableCrew,
  removeCrewFromProject,
  requestChangeOrder,
  transitionProjectStage,
  updateBlocker,
  updateDeliverable,
  updateDependency,
  updateInvoice,
  updatePlannerTask,
  updateProjectAsset,
  updateRisk,
  updateShoot,
  updateMeeting,
} from '../../../data/adminMock';
import { saveProjectNarrative } from '../../../data/adminProjectsApi';
import { useAuth } from '../../../lib/auth';
import { useAdminTheme } from '../../../lib/adminTheme';
import { hasProjectCapability } from '../../../lib/projectPermissions';
import type { AdminInvoiceStatus, DeliverableStatus, PlannerTaskStatus, ProjectAssetStatus, ProjectStage } from '../../../types';
import {
  assetStatusClassForTheme,
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
type ScheduleFormType = 'shoot' | 'meeting';

const AdminProjectDetail: React.FC = () => {
  const { user } = useAuth();
  const { theme } = useAdminTheme();
  const isDark = theme === 'dark';
  const { projectId } = useParams();
  const [tab, setTab] = useState<Tab>('overview');
  const tabState: Record<Tab, LoadState> = {
    overview: 'success',
    brief: 'success',
    planner: 'success',
    schedule: 'success',
    assets: 'success',
    deliverables: 'success',
    controls: 'success',
    financials: 'success',
    activity: 'success',
  };
  const [stageMessage, setStageMessage] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>('all');
  const [watching, setWatching] = useState(false);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [newPlannerTitle, setNewPlannerTitle] = useState('');
  const [newShootTitle, setNewShootTitle] = useState('');
  const [newShootDate, setNewShootDate] = useState('');
  const [newShootLocation, setNewShootLocation] = useState('');
  const [newShootDescription, setNewShootDescription] = useState('');
  const [newMeetingTitle, setNewMeetingTitle] = useState('');
  const [newMeetingDate, setNewMeetingDate] = useState('');
  const [newMeetingTime, setNewMeetingTime] = useState('10:00');
  const [newMeetingLocation, setNewMeetingLocation] = useState('');
  const [newMeetingDescription, setNewMeetingDescription] = useState('');
  const [newAssetLabel, setNewAssetLabel] = useState('');
  const [newDeliverableLabel, setNewDeliverableLabel] = useState('');
  const [newRiskLabel, setNewRiskLabel] = useState('');
  const [newBlockerLabel, setNewBlockerLabel] = useState('');
  const [newDependencyLabel, setNewDependencyLabel] = useState('');
  const [newExpenseLabel, setNewExpenseLabel] = useState('');
  const [newExpenseAmount, setNewExpenseAmount] = useState('0');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackTone, setFeedbackTone] = useState<'ok' | 'error'>('ok');
  const [isEditingNarrative, setIsEditingNarrative] = useState(false);
  const [summaryDraft, setSummaryDraft] = useState('');
  const [briefDraft, setBriefDraft] = useState('');
  const [goalsDraft, setGoalsDraft] = useState('');
  const [milestoneDraft, setMilestoneDraft] = useState('');
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [taskDraft, setTaskDraft] = useState({
    title: '',
    description: '',
    referenceLink: '',
    dueDate: '',
    assigneeCrewId: '',
  });
  const [openSchedule, setOpenSchedule] = useState<{ kind: ScheduleFormType; id: string } | null>(null);
  const [scheduleDraft, setScheduleDraft] = useState({
    title: '',
    date: '',
    time: '',
    location: '',
    description: '',
    participants: [] as string[],
  });

  const project = projectId ? getProjectById(projectId) : undefined;

  const planner = useMemo(() => (projectId ? getPlannerByProject(projectId) : []), [projectId, refreshTick]);
  const shoots = useMemo(() => (projectId ? getShootsByProject(projectId) : []), [projectId, refreshTick]);
  const meetings = useMemo(() => (projectId ? getMeetingsByProject(projectId) : []), [projectId, refreshTick]);
  const assets = useMemo(() => (projectId ? getAssetsByProject(projectId) : []), [projectId, refreshTick]);
  const invoices = useMemo(() => (projectId ? getInvoicesByProject(projectId) : []), [projectId, refreshTick]);
  const proposal = projectId ? getProposalByProject(projectId) : undefined;
  const expenses = useMemo(() => (projectId ? getExpensesByProject(projectId) : []), [projectId, refreshTick]);
  const activity = useMemo(() => (projectId ? getActivityByProject(projectId) : []), [projectId, refreshTick]);
  const deliverables = useMemo(() => (projectId ? getDeliverablesByProject(projectId) : []), [projectId, refreshTick]);
  const risks = useMemo(() => (projectId ? getRisksByProject(projectId) : []), [projectId, refreshTick]);
  const blockers = useMemo(() => (projectId ? getBlockersByProject(projectId) : []), [projectId, refreshTick]);
  const dependencies = useMemo(() => (projectId ? getDependenciesByProject(projectId) : []), [projectId, refreshTick]);
  const changeOrders = useMemo(() => (projectId ? getChangeOrdersByProject(projectId) : []), [projectId, refreshTick]);
  const assignableCrew = useMemo(() => projectAssignableCrew(project.id), [project.id, refreshTick]);
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
  const actorName = user?.displayName || 'System';

  const setMessage = (message: string, tone: 'ok' | 'error' = 'ok') => {
    setFeedback(message);
    setFeedbackTone(tone);
  };

  const beginNarrativeEdit = () => {
    setSummaryDraft(project.summary);
    setBriefDraft(project.brief);
    setGoalsDraft(project.goals);
    setMilestoneDraft(project.nextMilestone);
    setIsEditingNarrative(true);
  };

  const autoSuggestNarrative = () => {
    const pendingDeliverables = deliverables.filter((item) => item.status !== 'approved' && item.status !== 'delivered').length;
    const openRisks = risks.filter((item) => item.status !== 'resolved').length;
    setSummaryDraft(
      `${project.title} is in ${formatStage(project.stage)} with ${pendingDeliverables} pending deliverable${pendingDeliverables === 1 ? '' : 's'} and ${openRisks} open risk${openRisks === 1 ? '' : 's'}.`
    );
    setBriefDraft(project.brief || `Focus on ${project.clientName} brand priorities while protecting timeline and delivery quality.`);
    setGoalsDraft(project.goals || `Complete required deliverables, hold schedule, and close project with clean approvals.`);
    setMilestoneDraft(project.nextMilestone || `Next internal checkpoint by ${formatAdminDate(project.dueDate)}.`);
    setMessage('Auto-suggest draft is ready. Review and save when ready.');
  };

  const openTaskEditor = (taskId: string) => {
    const task = planner.find((item) => item.id === taskId);
    if (!task) return;
    setOpenTaskId(taskId);
    setTaskDraft({
      title: task.title,
      description: task.description || task.notes || '',
      referenceLink: task.referenceLink || '',
      dueDate: task.dueDate,
      assigneeCrewId: task.assigneeCrewId,
    });
  };

  const openScheduleEditor = (kind: ScheduleFormType, id: string) => {
    if (kind === 'shoot') {
      const shoot = shoots.find((item) => item.id === id);
      if (!shoot) return;
      setScheduleDraft({
        title: shoot.title,
        date: shoot.date,
        time: shoot.callTime,
        location: shoot.location,
        description: shoot.description || shoot.gearSummary,
        participants: shoot.crew,
      });
    } else {
      const meeting = meetings.find((item) => item.id === id);
      if (!meeting) return;
      setScheduleDraft({
        title: meeting.title,
        date: meeting.date,
        time: meeting.startTime,
        location: meeting.location,
        description: meeting.description || '',
        participants: meeting.participants,
      });
    }
    setOpenSchedule({ kind, id });
  };

  const toggleParticipant = (name: string) => {
    setScheduleDraft((current) => ({
      ...current,
      participants: current.participants.includes(name)
        ? current.participants.filter((item) => item !== name)
        : [...current.participants, name],
    }));
  };

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
    const tabName = id[0].toUpperCase() + id.slice(1);
    if (state === 'loading') return <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 text-sm text-zinc-500">{tabName} is loading...</div>;
    if (state === 'error') return <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-4 text-sm text-red-200">We could not load this section right now. Please try again.</div>;
    if (state === 'empty' || !hasData) return <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 text-sm text-zinc-500">Nothing here yet. Add the first item to get started.</div>;
    return <>{content}</>;
  };

  return (
    <div className="max-w-6xl min-w-0 space-y-6">
      <div className="sticky top-0 z-20 rounded-xl border border-zinc-800 bg-zinc-950/95 backdrop-blur px-3 py-3 sm:px-4">
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

      {feedback && (
        <div
          className={`rounded-xl border px-3 py-2 text-xs ${
            feedbackTone === 'ok' ? 'border-emerald-900/60 bg-emerald-950/20 text-emerald-200' : 'border-red-900/60 bg-red-950/20 text-red-200'
          }`}
        >
          {feedback}
        </div>
      )}

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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-zinc-300 min-w-0">
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4">
            <div className="flex items-center justify-between gap-2 mb-2">
              <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Summary</h3>
              {!isEditingNarrative && (
                <button type="button" onClick={beginNarrativeEdit} className="text-[11px] underline text-zinc-400">
                  Edit
                </button>
              )}
            </div>
            <p className="leading-relaxed text-zinc-200">{isEditingNarrative ? summaryDraft : project.summary}</p>
            <p className="mt-3 text-zinc-500">
              Next: <span className="text-white">{isEditingNarrative ? milestoneDraft : project.nextMilestone}</span>
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
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4 md:col-span-2">
            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">Team on this project</h3>
            <p className="text-xs text-zinc-500 mb-2">
              Owner: <span className="text-zinc-300">{project.ownerName}</span>
            </p>
            <div className="flex flex-wrap gap-2 mb-3">
              {(project.assignedCrewIds || []).map((crewId) => {
                const crew = MOCK_CREW.find((c) => c.id === crewId);
                return (
                  <button
                    key={crewId}
                    type="button"
                    onClick={() => {
                      removeCrewFromProject(project.id, crewId, actorName);
                      setRefreshTick((value) => value + 1);
                    }}
                    className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-200"
                  >
                    {crew?.displayName || crewId} ×
                  </button>
                );
              })}
              {(project.assignedCrewIds || []).length === 0 && <p className="text-sm text-zinc-500">No assigned contributors yet.</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              {MOCK_CREW.filter((crew) => !(project.assignedCrewIds || []).includes(crew.id)).map((crew) => (
                <button
                  key={crew.id}
                  type="button"
                  onClick={() => {
                    assignCrewToProject(project.id, crew.id, actorName);
                    setRefreshTick((value) => value + 1);
                  }}
                  className="rounded-md border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300"
                >
                  Add {crew.displayName}
                </button>
              ))}
            </div>
          </div>
          {isEditingNarrative && (
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4 md:col-span-2 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Narrative Draft</h3>
                <button type="button" onClick={autoSuggestNarrative} className="text-[11px] underline text-zinc-400">
                  Auto-suggest draft
                </button>
              </div>
              <textarea value={summaryDraft} onChange={(e) => setSummaryDraft(e.target.value)} rows={3} className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100" />
              <textarea value={milestoneDraft} onChange={(e) => setMilestoneDraft(e.target.value)} rows={2} className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100" />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const result = saveProjectNarrative(
                      project.id,
                      { summary: summaryDraft, brief: briefDraft || project.brief, goals: goalsDraft || project.goals, nextMilestone: milestoneDraft },
                      actorName
                    );
                    if (!result.ok) {
                      setMessage(result.error || 'Could not save narrative.', 'error');
                      return;
                    }
                    setIsEditingNarrative(false);
                    setRefreshTick((value) => value + 1);
                    setMessage('Summary and milestone updated.');
                  }}
                  className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-100"
                >
                  Save
                </button>
                <button type="button" onClick={() => setIsEditingNarrative(false)} className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {tab === 'brief' && withState('brief', true, (
        <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-5 space-y-4 text-sm text-zinc-200">
          <div>
            <div className="flex items-center justify-between gap-2 mb-1">
              <h3 className="text-xs font-bold uppercase text-zinc-500">Brief</h3>
              {!isEditingNarrative && (
                <button type="button" onClick={beginNarrativeEdit} className="text-[11px] underline text-zinc-400">
                  Edit
                </button>
              )}
            </div>
            {isEditingNarrative ? (
              <textarea value={briefDraft} onChange={(e) => setBriefDraft(e.target.value)} rows={4} className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100" />
            ) : (
              <p className="leading-relaxed">{project.brief}</p>
            )}
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase text-zinc-500 mb-1">Goals</h3>
            {isEditingNarrative ? (
              <textarea value={goalsDraft} onChange={(e) => setGoalsDraft(e.target.value)} rows={3} className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100" />
            ) : (
              <p className="leading-relaxed">{project.goals}</p>
            )}
          </div>
          {isEditingNarrative && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  const result = saveProjectNarrative(
                    project.id,
                    { summary: summaryDraft || project.summary, brief: briefDraft, goals: goalsDraft, nextMilestone: milestoneDraft || project.nextMilestone },
                    actorName
                  );
                  if (!result.ok) {
                    setMessage(result.error || 'Could not save brief.', 'error');
                    return;
                  }
                  setIsEditingNarrative(false);
                  setRefreshTick((value) => value + 1);
                  setMessage('Brief and goals updated.');
                }}
                className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-100"
              >
                Save
              </button>
              <button type="button" onClick={() => setIsEditingNarrative(false)} className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400">
                Cancel
              </button>
            </div>
          )}
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

      {tab === 'planner' && withState('planner', true, (
        <div className="space-y-3">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-3 flex flex-col sm:flex-row gap-2">
            <input
              value={newPlannerTitle}
              onChange={(e) => setNewPlannerTitle(e.target.value)}
              placeholder="Add workstream task"
              className="flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
            />
            <button
              type="button"
              onClick={() => {
                try {
                  if (!newPlannerTitle.trim()) {
                    setMessage('Task title is required.', 'error');
                    return;
                  }
                  createPlannerTask({
                    projectId: project.id,
                    projectTitle: project.title,
                    clientName: project.clientName,
                    title: newPlannerTitle.trim(),
                    type: 'admin',
                    column: 'queue',
                    priority: 'medium',
                    assigneeCrewId: project.ownerCrewId,
                    assigneeName: project.ownerName,
                    dueDate: new Date().toISOString().slice(0, 10),
                    done: false,
                    status: 'todo',
                    notes: '',
                  }, actorName);
                  setNewPlannerTitle('');
                  setRefreshTick((value) => value + 1);
                  setMessage('Task added to planner.');
                } catch (error) {
                  setMessage(error instanceof Error ? error.message : 'Could not add task.', 'error');
                }
              }}
              className="rounded-md border border-zinc-700 px-3 py-2 text-xs text-zinc-100"
            >
              Add Task
            </button>
          </div>
          <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl overflow-x-auto min-w-0">
            {planner.length === 0 ? (
              <p className="p-4 text-sm text-zinc-500">No planner tasks yet. Add the first work item above.</p>
            ) : (
              <table className="w-full text-sm min-w-[920px]">
              <thead className="text-xs text-zinc-500 uppercase border-b border-zinc-800 bg-zinc-950/60">
                <tr>
                  <th className="text-left px-3 py-2">Task</th>
                  <th className="text-left px-3 py-2">Type</th>
                  <th className="text-left px-3 py-2">Status</th>
                  <th className="text-left px-3 py-2">Assignee</th>
                  <th className="text-left px-3 py-2">Due</th>
                  <th className="text-left px-3 py-2">Actions</th>
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
                    <td className="px-3 py-2.5 text-zinc-500">
                      <select
                        value={plannerStatusFromItem(t)}
                        onChange={(e) => {
                          const next = e.target.value as PlannerTaskStatus;
                          const mapped = plannerStatusToLegacy(next);
                          updatePlannerTask(t.id, { status: next, column: mapped.column, done: mapped.done }, actorName);
                          setRefreshTick((value) => value + 1);
                          setMessage(`Task moved to ${next.replace('_', ' ')}.`);
                        }}
                        className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-100"
                      >
                        <option value="todo">To Do</option>
                        <option value="in_progress">In Progress</option>
                        <option value="client_review">Client Review</option>
                        <option value="done">Done</option>
                      </select>
                    </td>
                    <td className="px-3 py-2.5 text-zinc-300">{t.assigneeName}</td>
                    <td className="px-3 py-2.5 text-zinc-500 font-mono text-xs">{formatAdminDate(t.dueDate)}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            openTaskEditor(t.id);
                          }}
                          className="text-[11px] underline text-zinc-400"
                        >
                          Open
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            deletePlannerTask(t.id, actorName);
                            setRefreshTick((value) => value + 1);
                          }}
                          className="text-[11px] underline text-red-300"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
            )}
          </div>
          {openTaskId && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-zinc-100">Task details</h4>
                <button type="button" onClick={() => setOpenTaskId(null)} className="text-[11px] underline text-zinc-400">
                  Close
                </button>
              </div>
              <input
                value={taskDraft.title}
                onChange={(e) => setTaskDraft((current) => ({ ...current, title: e.target.value }))}
                className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                placeholder="Task title"
              />
              <textarea
                value={taskDraft.description}
                onChange={(e) => setTaskDraft((current) => ({ ...current, description: e.target.value }))}
                rows={3}
                className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                placeholder="Description"
              />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  value={taskDraft.referenceLink}
                  onChange={(e) => setTaskDraft((current) => ({ ...current, referenceLink: e.target.value }))}
                  className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 sm:col-span-2"
                  placeholder="Reference link"
                />
                <input
                  type="date"
                  value={taskDraft.dueDate}
                  onChange={(e) => setTaskDraft((current) => ({ ...current, dueDate: e.target.value }))}
                  className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                />
              </div>
              <select
                value={taskDraft.assigneeCrewId}
                onChange={(e) => setTaskDraft((current) => ({ ...current, assigneeCrewId: e.target.value }))}
                className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
              >
                {assignableCrew.map((crew) => (
                  <option key={crew.id} value={crew.id}>
                    {crew.displayName}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const selected = assignableCrew.find((crew) => crew.id === taskDraft.assigneeCrewId);
                    try {
                      updatePlannerTask(
                        openTaskId,
                        {
                          title: taskDraft.title,
                          dueDate: taskDraft.dueDate,
                          assigneeCrewId: taskDraft.assigneeCrewId,
                          assigneeName: selected?.displayName || taskDraft.assigneeCrewId,
                          description: taskDraft.description,
                          notes: taskDraft.description,
                          referenceLink: taskDraft.referenceLink,
                        },
                        actorName
                      );
                      setOpenTaskId(null);
                      setRefreshTick((value) => value + 1);
                      setMessage('Task updated.');
                    } catch (error) {
                      setMessage(error instanceof Error ? error.message : 'Could not update task.', 'error');
                    }
                  }}
                  className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-100"
                >
                  Save task
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {tab === 'schedule' && withState('schedule', true, (
        <div className="space-y-3">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-3 grid grid-cols-1 sm:grid-cols-4 gap-2">
            <input
              value={newShootTitle}
              onChange={(e) => setNewShootTitle(e.target.value)}
              placeholder="Shoot title"
              className="rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-2 text-sm text-zinc-100"
            />
            <input
              type="date"
              value={newShootDate}
              onChange={(e) => setNewShootDate(e.target.value)}
              className="rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-2 text-sm text-zinc-100"
            />
            <input
              value={newShootLocation}
              onChange={(e) => setNewShootLocation(e.target.value)}
              placeholder="Location"
              className="rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-2 text-sm text-zinc-100"
            />
            <button
              type="button"
              onClick={() => {
                try {
                  if (!newShootTitle.trim() || !newShootDate) {
                    setMessage('Shoot title and date are required.', 'error');
                    return;
                  }
                  createShoot({
                    projectId: project.id,
                    projectTitle: project.title,
                    title: newShootTitle.trim(),
                    date: newShootDate,
                    callTime: '08:00',
                    location: newShootLocation.trim() || 'TBD',
                    crew: [project.ownerName],
                    gearSummary: newShootDescription.trim() || 'Camera + lighting package',
                    description: newShootDescription.trim(),
                  }, actorName);
                  setNewShootTitle('');
                  setNewShootDate('');
                  setNewShootLocation('');
                  setNewShootDescription('');
                  setRefreshTick((value) => value + 1);
                  setMessage('Shoot day added.');
                } catch (error) {
                  setMessage(error instanceof Error ? error.message : 'Could not add shoot day.', 'error');
                }
              }}
              className="rounded-md border border-zinc-700 px-3 py-2 text-xs text-zinc-100"
            >
              Add Shoot Day
            </button>
            <input
              value={newShootDescription}
              onChange={(e) => setNewShootDescription(e.target.value)}
              placeholder="Shoot description/context"
              className="rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-2 text-sm text-zinc-100 sm:col-span-4"
            />
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-3 grid grid-cols-1 sm:grid-cols-5 gap-2">
            <input value={newMeetingTitle} onChange={(e) => setNewMeetingTitle(e.target.value)} placeholder="Meeting title" className="rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-2 text-sm text-zinc-100" />
            <input type="date" value={newMeetingDate} onChange={(e) => setNewMeetingDate(e.target.value)} className="rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-2 text-sm text-zinc-100" />
            <input type="time" value={newMeetingTime} onChange={(e) => setNewMeetingTime(e.target.value)} className="rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-2 text-sm text-zinc-100" />
            <input value={newMeetingLocation} onChange={(e) => setNewMeetingLocation(e.target.value)} placeholder="Meeting location/link" className="rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-2 text-sm text-zinc-100" />
            <button
              type="button"
              onClick={() => {
                try {
                  if (!newMeetingTitle.trim() || !newMeetingDate) {
                    setMessage('Meeting title and date are required.', 'error');
                    return;
                  }
                  createMeeting({
                    projectId: project.id,
                    projectTitle: project.title,
                    title: newMeetingTitle.trim(),
                    date: newMeetingDate,
                    startTime: newMeetingTime,
                    location: newMeetingLocation.trim() || 'TBD',
                    participants: [project.ownerName],
                    description: newMeetingDescription.trim(),
                  }, actorName);
                  setNewMeetingTitle('');
                  setNewMeetingDate('');
                  setNewMeetingTime('10:00');
                  setNewMeetingLocation('');
                  setNewMeetingDescription('');
                  setRefreshTick((value) => value + 1);
                  setMessage('Meeting added.');
                } catch (error) {
                  setMessage(error instanceof Error ? error.message : 'Could not add meeting.', 'error');
                }
              }}
              className="rounded-md border border-zinc-700 px-3 py-2 text-xs text-zinc-100"
            >
              Add Meeting
            </button>
            <input value={newMeetingDescription} onChange={(e) => setNewMeetingDescription(e.target.value)} placeholder="Meeting agenda/context" className="rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-2 text-sm text-zinc-100 sm:col-span-5" />
          </div>
          {shoots.length === 0 && meetings.length === 0 ? (
            <p className="text-sm text-zinc-500">No schedule items on this project yet.</p>
          ) : (
            <>
            {shoots.map((s) => (
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
                  {s.description && <p className="text-xs text-zinc-500 mt-1">{s.description}</p>}
                </div>
                <p className="text-xs text-zinc-500 max-w-xs">{s.gearSummary}</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      openScheduleEditor('shoot', s.id);
                    }}
                    className="text-[11px] underline text-zinc-400"
                  >
                    Open
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      deleteShoot(s.id, actorName);
                      setRefreshTick((value) => value + 1);
                    }}
                    className="text-[11px] underline text-red-300"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {meetings.map((m) => (
              <div key={m.id} className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4 flex flex-col sm:flex-row sm:justify-between gap-2">
                <div>
                  <p className="text-white font-medium">{m.title} <span className="text-[11px] text-zinc-400">(Meeting)</span></p>
                  <p className="text-sm text-zinc-500">{formatAdminDate(m.date)} @ {m.startTime} — {m.location}</p>
                  <p className="text-xs text-zinc-600 mt-1">Participants: {m.participants.join(', ')}</p>
                  {m.description && <p className="text-xs text-zinc-500 mt-1">{m.description}</p>}
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => openScheduleEditor('meeting', m.id)} className="text-[11px] underline text-zinc-400">Open</button>
                  <button
                    type="button"
                    onClick={() => {
                      deleteMeeting(m.id, actorName);
                      setRefreshTick((value) => value + 1);
                    }}
                    className="text-[11px] underline text-red-300"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
            </>
          )}
          {openSchedule && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-zinc-100">{openSchedule.kind === 'shoot' ? 'Edit shoot' : 'Edit meeting'}</h4>
                <button type="button" onClick={() => setOpenSchedule(null)} className="text-[11px] underline text-zinc-400">Close</button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input value={scheduleDraft.title} onChange={(e) => setScheduleDraft((current) => ({ ...current, title: e.target.value }))} className="rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-2 text-sm text-zinc-100" placeholder="Title" />
                <input type="date" value={scheduleDraft.date} onChange={(e) => setScheduleDraft((current) => ({ ...current, date: e.target.value }))} className="rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-2 text-sm text-zinc-100" />
                <input type="time" value={scheduleDraft.time} onChange={(e) => setScheduleDraft((current) => ({ ...current, time: e.target.value }))} className="rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-2 text-sm text-zinc-100" />
                <input value={scheduleDraft.location} onChange={(e) => setScheduleDraft((current) => ({ ...current, location: e.target.value }))} className="rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-2 text-sm text-zinc-100" placeholder="Location/Link" />
              </div>
              <textarea value={scheduleDraft.description} onChange={(e) => setScheduleDraft((current) => ({ ...current, description: e.target.value }))} rows={3} className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-2 text-sm text-zinc-100" placeholder="Description/context" />
              <div className="flex flex-wrap gap-2">
                {assignableCrew.map((crew) => (
                  <button
                    key={crew.id}
                    type="button"
                    onClick={() => toggleParticipant(crew.displayName)}
                    className={`rounded-full border px-2.5 py-1 text-xs ${scheduleDraft.participants.includes(crew.displayName) ? 'border-white bg-white text-black' : 'border-zinc-700 text-zinc-300'}`}
                  >
                    {crew.displayName}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  try {
                    if (openSchedule.kind === 'shoot') {
                      updateShoot(
                        openSchedule.id,
                        {
                          title: scheduleDraft.title,
                          date: scheduleDraft.date,
                          callTime: scheduleDraft.time,
                          location: scheduleDraft.location,
                          gearSummary: scheduleDraft.description,
                          description: scheduleDraft.description,
                          crew: scheduleDraft.participants,
                        },
                        actorName
                      );
                    } else {
                      updateMeeting(
                        openSchedule.id,
                        {
                          title: scheduleDraft.title,
                          date: scheduleDraft.date,
                          startTime: scheduleDraft.time,
                          location: scheduleDraft.location,
                          description: scheduleDraft.description,
                          participants: scheduleDraft.participants,
                        },
                        actorName
                      );
                    }
                    setOpenSchedule(null);
                    setRefreshTick((value) => value + 1);
                    setMessage(`${openSchedule.kind === 'shoot' ? 'Shoot' : 'Meeting'} updated.`);
                  } catch (error) {
                    setMessage(error instanceof Error ? error.message : 'Could not update schedule item.', 'error');
                  }
                }}
                className="rounded-md border border-zinc-700 px-3 py-2 text-xs text-zinc-100"
              >
                Save {openSchedule.kind}
              </button>
            </div>
          )}
        </div>
      ))}

      {tab === 'assets' && withState('assets', true, (
        <div className="space-y-3">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-3 flex flex-col sm:flex-row gap-2">
            <input
              value={newAssetLabel}
              onChange={(e) => setNewAssetLabel(e.target.value)}
              placeholder="New asset label"
              className="flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
            />
            <button
              type="button"
              onClick={() => {
                try {
                  if (!newAssetLabel.trim()) {
                    setMessage('Asset label is required.', 'error');
                    return;
                  }
                  const status: ProjectAssetStatus = 'internal';
                  createProjectAsset({
                    projectId: project.id,
                    label: newAssetLabel.trim(),
                    type: 'video',
                    status,
                    clientVisible: false,
                    version: 'v0.1',
                  }, actorName);
                  setNewAssetLabel('');
                  setRefreshTick((value) => value + 1);
                  setMessage('Asset added.');
                } catch (error) {
                  setMessage(error instanceof Error ? error.message : 'Could not add asset.', 'error');
                }
              }}
              className="rounded-md border border-zinc-700 px-3 py-2 text-xs text-zinc-100"
            >
              Add Asset
            </button>
          </div>
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
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      updateProjectAsset(a.id, { clientVisible: !a.clientVisible }, actorName);
                      setRefreshTick((value) => value + 1);
                    }}
                    className="text-[11px] underline text-zinc-400"
                  >
                    {a.clientVisible ? 'Set internal' : 'Set client-visible'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      deleteProjectAsset(a.id, actorName);
                      setRefreshTick((value) => value + 1);
                    }}
                    className="text-[11px] underline text-red-300"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
          </div>
          <p className="text-xs text-zinc-500">
            Deferred in this mock pass: binary upload/storage pipeline. Asset records are metadata-only for now.
          </p>
        </div>
      ))}

      {tab === 'deliverables' && withState('deliverables', true, (
        <div className="space-y-3">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-3 flex flex-col sm:flex-row gap-2">
            <input
              value={newDeliverableLabel}
              onChange={(e) => setNewDeliverableLabel(e.target.value)}
              placeholder="New deliverable"
              className="flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
            />
            <button
              type="button"
              onClick={() => {
                try {
                  if (!newDeliverableLabel.trim()) {
                    setMessage('Deliverable label is required.', 'error');
                    return;
                  }
                  const status: DeliverableStatus = 'not_started';
                  createDeliverable({
                    projectId: project.id,
                    label: newDeliverableLabel.trim(),
                    ownerCrewId: project.ownerCrewId,
                    ownerName: project.ownerName,
                    dueDate: project.dueDate,
                    required: true,
                    status,
                    linkedAssetIds: [],
                  }, actorName);
                  setNewDeliverableLabel('');
                  setRefreshTick((value) => value + 1);
                  setMessage('Deliverable added.');
                } catch (error) {
                  setMessage(error instanceof Error ? error.message : 'Could not add deliverable.', 'error');
                }
              }}
              className="rounded-md border border-zinc-700 px-3 py-2 text-xs text-zinc-100"
            >
              Add Deliverable
            </button>
          </div>
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
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const next: DeliverableStatus = d.status === 'approved' ? 'in_progress' : 'approved';
                      updateDeliverable(d.id, { status: next }, actorName);
                      setRefreshTick((value) => value + 1);
                    }}
                    className="text-[11px] underline text-zinc-400"
                  >
                    {d.status === 'approved' ? 'Reopen' : 'Approve'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      deleteDeliverable(d.id, actorName);
                      setRefreshTick((value) => value + 1);
                    }}
                    className="text-[11px] underline text-red-300"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
          </div>
        </div>
      ))}

      {tab === 'controls' && withState('controls', true, (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
            <h3 className="text-xs uppercase tracking-widest text-zinc-500 font-bold mb-3">Risks</h3>
            <div className="mb-3 flex gap-2">
              <input
                value={newRiskLabel}
                onChange={(e) => setNewRiskLabel(e.target.value)}
                placeholder="Add risk"
                className="flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-100"
              />
              <button
                type="button"
                onClick={() => {
                  if (!newRiskLabel.trim()) return;
                  createRisk({ projectId: project.id, label: newRiskLabel.trim(), ownerName: project.ownerName, severity: 'medium', status: 'open' }, actorName);
                  setNewRiskLabel('');
                  setRefreshTick((value) => value + 1);
                }}
                className="rounded-md border border-zinc-700 px-2 py-1 text-[11px] text-zinc-100"
              >
                Add
              </button>
            </div>
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
                    <button
                      type="button"
                      onClick={() => {
                        updateRisk(r.id, { status: r.status === 'resolved' ? 'open' : 'resolved' }, actorName);
                        setRefreshTick((value) => value + 1);
                      }}
                      className="mt-1 text-[11px] underline text-zinc-400"
                    >
                      {r.status === 'resolved' ? 'Reopen' : 'Resolve'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
            <h3 className="text-xs uppercase tracking-widest text-zinc-500 font-bold mb-3">Blockers</h3>
            <div className="mb-3 flex gap-2">
              <input
                value={newBlockerLabel}
                onChange={(e) => setNewBlockerLabel(e.target.value)}
                placeholder="Add blocker"
                className="flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-100"
              />
              <button
                type="button"
                onClick={() => {
                  if (!newBlockerLabel.trim()) return;
                  createBlocker({ projectId: project.id, label: newBlockerLabel.trim(), ownerName: project.ownerName, status: 'open' }, actorName);
                  setNewBlockerLabel('');
                  setRefreshTick((value) => value + 1);
                }}
                className="rounded-md border border-zinc-700 px-2 py-1 text-[11px] text-zinc-100"
              >
                Add
              </button>
            </div>
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
                    <button
                      type="button"
                      onClick={() => {
                        updateBlocker(b.id, { status: b.status === 'resolved' ? 'open' : 'resolved' }, actorName);
                        setRefreshTick((value) => value + 1);
                      }}
                      className="mt-1 text-[11px] underline text-zinc-400"
                    >
                      {b.status === 'resolved' ? 'Reopen' : 'Resolve'}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
            <h3 className="text-xs uppercase tracking-widest text-zinc-500 font-bold mb-3">Dependencies</h3>
            <div className="mb-3 flex gap-2">
              <input
                value={newDependencyLabel}
                onChange={(e) => setNewDependencyLabel(e.target.value)}
                placeholder="Add dependency"
                className="flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-100"
              />
              <button
                type="button"
                onClick={() => {
                  if (!newDependencyLabel.trim()) return;
                  createDependency({ projectId: project.id, label: newDependencyLabel.trim(), status: 'waiting' }, actorName);
                  setNewDependencyLabel('');
                  setRefreshTick((value) => value + 1);
                }}
                className="rounded-md border border-zinc-700 px-2 py-1 text-[11px] text-zinc-100"
              >
                Add
              </button>
            </div>
            {dependencies.length === 0 ? (
              <p className="text-sm text-zinc-500">No dependencies logged.</p>
            ) : (
              <ul className="space-y-2">
                {dependencies.map((d) => (
                  <li key={d.id} className="rounded-lg border border-zinc-800 p-2.5 text-sm text-zinc-200">
                    {d.label}
                    <p className="text-xs text-zinc-500 mt-1">{d.status}</p>
                    <button
                      type="button"
                      onClick={() => {
                        updateDependency(d.id, { status: d.status === 'cleared' ? 'waiting' : 'cleared' }, actorName);
                        setRefreshTick((value) => value + 1);
                      }}
                      className="mt-1 text-[11px] underline text-zinc-400"
                    >
                      {d.status === 'cleared' ? 'Set waiting' : 'Clear'}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ))}

      {tab === 'financials' && withState('financials', true, (
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
                    try {
                      if (!projectId) return;
                      const title = window.prompt('Change order title');
                      if (!title?.trim()) {
                        setMessage('Change order title is required.', 'error');
                        return;
                      }
                      const amountRaw = window.prompt('Amount', '0');
                      const amount = Number(amountRaw || '0');
                      requestChangeOrder(projectId, title.trim(), Number.isFinite(amount) ? amount : -1, user?.displayName || 'System');
                      setRefreshTick((value) => value + 1);
                      setMessage('Change order request created.');
                    } catch (error) {
                      setMessage(error instanceof Error ? error.message : 'Could not request change order.', 'error');
                    }
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
                      <button
                        type="button"
                        disabled={!canApproveFinance}
                        onClick={() => {
                          const next: AdminInvoiceStatus = inv.status === 'paid' ? 'sent' : 'paid';
                          updateInvoice(inv.id, { status: next, amountPaid: next === 'paid' ? inv.amount : 0 }, actorName);
                          setRefreshTick((value) => value + 1);
                          setMessage(`Invoice ${inv.id} updated to ${next}.`);
                        }}
                        className="ml-2 text-[11px] underline text-zinc-400 disabled:opacity-50"
                      >
                        Mark {inv.status === 'sent' ? 'paid' : 'sent'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
            <h3 className="text-sm font-bold text-zinc-400 mb-2">Expenses (mock)</h3>
            <div className="mb-3 flex flex-col sm:flex-row gap-2">
              <input
                value={newExpenseLabel}
                onChange={(e) => setNewExpenseLabel(e.target.value)}
                placeholder="Expense label"
                className="flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-2 text-sm text-zinc-100"
              />
              <input
                value={newExpenseAmount}
                onChange={(e) => setNewExpenseAmount(e.target.value.replace(/[^\d]/g, ''))}
                placeholder="Amount"
                className="w-32 rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-2 text-sm text-zinc-100"
              />
              <button
                type="button"
                onClick={() => {
                  if (!newExpenseLabel.trim()) {
                    setMessage('Expense label is required.', 'error');
                    return;
                  }
                  createExpense({
                    projectId: project.id,
                    label: newExpenseLabel.trim(),
                    amount: Number(newExpenseAmount || '0'),
                    category: 'other',
                    date: new Date().toISOString().slice(0, 10),
                  }, actorName);
                  setNewExpenseLabel('');
                  setNewExpenseAmount('0');
                  setRefreshTick((value) => value + 1);
                  setMessage('Expense added.');
                }}
                className="rounded-md border border-zinc-700 px-3 py-2 text-xs text-zinc-100"
              >
                Add Expense
              </button>
              <button
                type="button"
                disabled={!canApproveFinance}
                onClick={() => {
                  try {
                    createInvoice({
                      projectId: project.id,
                      clientName: project.clientName,
                      amount: 1200,
                      amountPaid: 0,
                      status: 'draft',
                      issuedDate: new Date().toISOString().slice(0, 10),
                      dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString().slice(0, 10),
                    }, actorName);
                    setRefreshTick((value) => value + 1);
                    setMessage('Invoice added.');
                  } catch (error) {
                    setMessage(error instanceof Error ? error.message : 'Could not create invoice.', 'error');
                  }
                }}
                className="rounded-md border border-zinc-700 px-3 py-2 text-xs text-zinc-100 disabled:opacity-50"
              >
                Add Invoice
              </button>
            </div>
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

    </div>
  );
};

export default AdminProjectDetail;
