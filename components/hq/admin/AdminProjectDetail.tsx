import React, { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarPlus, Share2 } from 'lucide-react';
import { PROJECT_STAGE_ORDER } from '../../../data/hqConstants';
import {
  getActivityByProject,
  getAssetsByProject,
  getBlockersByProject,
  getChangeOrdersByProject,
  getDeliverablesByProject,
  getDependenciesByProject,
  getMeetingsByProject,
  getPlannerByProject,
  getProjectById,
  getRisksByProject,
  getShootsByProject,
} from '../../../data/hqOrgRead';
import {
  assignCrewToProject,
  removeCrewFromProject,
  transitionProjectStage,
} from '../../../data/hqProjectOps';
import {
  createMeeting,
  createPlannerTask,
  createProjectAsset,
  createShoot,
  deleteMeeting,
  deletePlannerTask,
  deleteProjectAsset,
  deleteShoot,
  plannerStatusFromItem,
  plannerStatusToLegacy,
  updateMeeting,
  updatePlannerTask,
  updateProjectAsset,
  updateShoot,
} from '../../../data/hqPlannerCalendarOps';
import { projectAssignableCrew } from '../../../data/hqSchedulingGuards';
import {
  createBlocker,
  createDeliverable,
  createDependency,
  createRisk,
  deleteDeliverable,
  requestChangeOrder,
  updateBlocker,
  updateDeliverable,
  updateDependency,
  updateRisk,
} from '../../../data/hqProjectControlsOps';
import { getHqCrewDirectory } from '../../../data/hqSyncDirectory';
import { useHqOrgTick } from '../HqFirestoreProvider';
import {
  createExpense,
  createInvoice,
  getExpensesByProject,
  getInvoicesByProject,
  getProposalByProject,
  updateInvoice,
} from '../../../data/financeApi';
import { saveProjectNarrative } from '../../../data/adminProjectsApi';
import { openGoogleCalendarInNewTab, payloadFromAdminMeeting, payloadFromAdminShoot } from '../../../lib/calendarEvent';
import { useAuth } from '../../../lib/auth';
import { adminDateTimeInputProps, useAdminTheme } from '../../../lib/adminTheme';
import { appInputClass, appPanelClass } from '../../../lib/appThemeClasses';
import { staffCanViewProject } from '../../../lib/hqAccess';
import { hasProjectCapability, isProjectRole } from '../../../lib/projectPermissions';
import { createStorageDeliveryLink, revokeStorageDeliveryLink } from '../../../lib/storageDelivery';
import type {
  AdminInvoiceStatus,
  AdminMeeting,
  AdminShoot,
  DeliverableStep,
  DeliverableStatus,
  PlannerItemPriority,
  PlannerItemType,
  ProjectAssetSourceType,
  ProjectAssetType,
  PlannerTaskStatus,
  ProjectAssetStatus,
  ProjectStage,
} from '../../../types';
import { UserRole } from '../../../types';
import {
  assetStatusClassForTheme,
  formatAdminDate,
  formatAdminDateTime,
  formatStage,
  invoiceStatusClassForTheme,
  proposalStatusClassForTheme,
} from './adminFormat';
import AdminCompactYmdCalendar from './AdminCompactYmdCalendar';
import AdminFormDrawer from './AdminFormDrawer';
import ScheduleLocationInput from './ScheduleLocationInput';
import CalendarEventSheet from './CalendarEventSheet';
import ProjectAssetUploader from './ProjectAssetUploader';
import DeliveryLinksPanel from './DeliveryLinksPanel';

type Tab = 'overview' | 'brief' | 'planner' | 'schedule' | 'assets' | 'deliverables' | 'controls' | 'financials' | 'activity';
const STAFF_PROJECT_TABS: Tab[] = ['overview', 'brief', 'planner', 'schedule', 'assets', 'deliverables'];
const ALL_PROJECT_TABS: Tab[] = ['overview', 'brief', 'planner', 'schedule', 'assets', 'deliverables', 'controls', 'financials', 'activity'];
const TAB_LABELS: Record<Tab, string> = {
  overview: 'Overview',
  brief: 'Brief',
  planner: 'Planner',
  schedule: 'Schedule',
  assets: 'Assets',
  deliverables: 'Deliverables',
  controls: 'Controls',
  financials: 'Financials',
  activity: 'Activity',
};
type LoadState = 'loading' | 'empty' | 'error' | 'success';
type ActivityFilter = 'all' | 'alerts' | 'mentions' | 'unread';
type ScheduleFormType = 'shoot' | 'meeting';
type DrawerStatus = { tone: 'ok' | 'error'; message: string } | null;
type DrawerForm =
  | 'planner'
  | 'schedule'
  | 'asset'
  | 'deliverable'
  | 'risk'
  | 'blocker'
  | 'dependency'
  | 'expense'
  | 'invoice'
  | 'changeOrder';

function pad2Schedule(n: number): string {
  return String(n).padStart(2, '0');
}

/** Parse "HH:mm" (24h) to minutes from midnight; null if invalid. */
function hmToMinutesSchedule(hm: string): number | null {
  if (!hm || !/^\d{1,2}:\d{2}$/.test(hm.trim())) return null;
  const [hRaw, mRaw] = hm.trim().split(':');
  const h = Number.parseInt(hRaw, 10);
  const m = Number.parseInt(mRaw, 10);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  const t = h * 60 + m;
  if (t < 0 || t > 24 * 60) return null;
  return t;
}

function minutesToHmSchedule(min: number): string {
  const c = Math.max(0, Math.min(24 * 60 - 1, Math.round(min)));
  return `${pad2Schedule(Math.floor(c / 60))}:${pad2Schedule(c % 60)}`;
}

function defaultEndTimeForSchedule(start: string, kind: ScheduleFormType): string {
  const s = hmToMinutesSchedule(start);
  if (s == null) return kind === 'shoot' ? '16:00' : '11:00';
  const delta = kind === 'shoot' ? 8 * 60 : 60;
  return minutesToHmSchedule(s + delta);
}

function ensureEndTimeFromStored(start: string, end: string | undefined, kind: ScheduleFormType): string {
  const sm = hmToMinutesSchedule(start);
  const em = end ? hmToMinutesSchedule(end) : null;
  if (sm != null && em != null && em >= sm) return end!;
  return defaultEndTimeForSchedule(start, kind);
}

const AdminProjectDetail: React.FC = () => {
  const { user } = useAuth();
  const { theme } = useAdminTheme();
  const isDark = theme === 'dark';
  const isStaff = user?.role === UserRole.STAFF;
  const { projectId } = useParams();
  const [tab, setTab] = useState<Tab>('overview');
  useEffect(() => {
    if (!isStaff) return;
    if (!STAFF_PROJECT_TABS.includes(tab)) setTab('overview');
  }, [isStaff, tab]);
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
  const hqTick = useHqOrgTick();
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>('all');
  const [watching, setWatching] = useState(false);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [activeDrawer, setActiveDrawer] = useState<DrawerForm | null>(null);
  const [newRiskLabel, setNewRiskLabel] = useState('');
  const [newBlockerLabel, setNewBlockerLabel] = useState('');
  const [newDependencyLabel, setNewDependencyLabel] = useState('');
  const [newExpenseLabel, setNewExpenseLabel] = useState('');
  const [newExpenseAmount, setNewExpenseAmount] = useState('0');
  const [newInvoiceAmount, setNewInvoiceAmount] = useState('1200');
  const [newInvoiceDueDate, setNewInvoiceDueDate] = useState(new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString().slice(0, 10));
  const [newChangeOrderTitle, setNewChangeOrderTitle] = useState('');
  const [newChangeOrderAmount, setNewChangeOrderAmount] = useState('0');
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
    assigneeCrewIds: [] as string[],
    type: 'admin' as 'pre_production' | 'shoot' | 'edit' | 'review' | 'delivery' | 'admin' | 'invoice' | 'client_followup',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
  });
  const [scheduleQuickType, setScheduleQuickType] = useState<ScheduleFormType>('shoot');
  const [openAssetId, setOpenAssetId] = useState<string | null>(null);
  const [assetDrawerBusy, setAssetDrawerBusy] = useState(false);
  const [assetDrawerStatus, setAssetDrawerStatus] = useState<DrawerStatus>(null);
  const [assetDraft, setAssetDraft] = useState({
    label: '',
    mediaType: 'video' as ProjectAssetType,
    sourceType: 'upload' as ProjectAssetSourceType,
    uploadFilename: '',
    /** Optional preview/reference link when source is upload. */
    uploadReferenceUrl: '',
    externalUrl: '',
    version: 'v0.1',
    status: 'internal' as ProjectAssetStatus,
    clientVisible: false,
    notes: '',
  });
  const [openDeliverableId, setOpenDeliverableId] = useState<string | null>(null);
  const [deliverableDrawerBusy, setDeliverableDrawerBusy] = useState(false);
  const [deliverableDrawerStatus, setDeliverableDrawerStatus] = useState<DrawerStatus>(null);
  const [deliveryActionBusyById, setDeliveryActionBusyById] = useState<Record<string, boolean>>({});
  const [deliverableDraft, setDeliverableDraft] = useState({
    label: '',
    ownerCrewId: '',
    dueDate: '',
    required: true,
    step: 'post_production' as DeliverableStep,
    status: 'not_started' as DeliverableStatus,
    linkedAssetIds: [] as string[],
    referenceLink: '',
    acceptanceCriteria: '',
    notes: '',
  });
  const [openSchedule, setOpenSchedule] = useState<{ kind: ScheduleFormType; id: string } | null>(null);
  const [scheduleDraft, setScheduleDraft] = useState({
    title: '',
    date: '',
    time: '',
    endTime: '',
    location: '',
    description: '',
    participants: [] as string[],
  });
  const [calendarEventOpen, setCalendarEventOpen] = useState(false);
  const [calendarEventInitial, setCalendarEventInitial] = useState<{
    title?: string;
    dateYmd?: string;
    timeHm?: string;
    allDay?: boolean;
    location?: string;
    description?: string;
  }>({});

  const project = useMemo(
    () => (projectId ? getProjectById(projectId) : undefined),
    [projectId, refreshTick, hqTick],
  );

  const planner = useMemo(() => (projectId ? getPlannerByProject(projectId) : []), [projectId, refreshTick, hqTick]);
  const plannerView = useMemo(() => {
    if (user?.role !== UserRole.STAFF || !user.crewId) return planner;
    return planner.filter((t) => {
      const ids = t.assigneeCrewIds?.length
        ? t.assigneeCrewIds
        : t.assigneeCrewId
          ? [t.assigneeCrewId]
          : [];
      return ids.includes(user.crewId!);
    });
  }, [planner, user]);
  const shoots = useMemo(() => (projectId ? getShootsByProject(projectId) : []), [projectId, refreshTick, hqTick]);
  const meetings = useMemo(() => (projectId ? getMeetingsByProject(projectId) : []), [projectId, refreshTick, hqTick]);
  const assets = useMemo(() => (projectId ? getAssetsByProject(projectId) : []), [projectId, refreshTick, hqTick]);
  const invoices = useMemo(() => (projectId ? getInvoicesByProject(projectId) : []), [projectId, refreshTick, hqTick]);
  const proposal = useMemo(
    () => (projectId ? getProposalByProject(projectId) : undefined),
    [projectId, refreshTick, hqTick],
  );
  const expenses = useMemo(() => (projectId ? getExpensesByProject(projectId) : []), [projectId, refreshTick, hqTick]);
  const activity = useMemo(() => (projectId ? getActivityByProject(projectId) : []), [projectId, refreshTick, hqTick]);
  const deliverables = useMemo(() => (projectId ? getDeliverablesByProject(projectId) : []), [projectId, refreshTick, hqTick]);
  const risks = useMemo(() => (projectId ? getRisksByProject(projectId) : []), [projectId, refreshTick, hqTick]);
  const blockers = useMemo(() => (projectId ? getBlockersByProject(projectId) : []), [projectId, refreshTick, hqTick]);
  const dependencies = useMemo(() => (projectId ? getDependenciesByProject(projectId) : []), [projectId, refreshTick, hqTick]);
  const changeOrders = useMemo(() => (projectId ? getChangeOrdersByProject(projectId) : []), [projectId, refreshTick, hqTick]);
  const assignableCrew = useMemo(() => (projectId ? projectAssignableCrew(projectId) : []), [projectId, refreshTick, hqTick]);
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
    return <Navigate to={isStaff ? '/hq/staff' : '/hq/admin/projects'} replace />;
  }

  if (isStaff && user && !staffCanViewProject(user, project.id)) {
    return <Navigate to="/hq/staff" replace />;
  }

  const openTotal = invoices.reduce((s, i) => s + (i.amount - i.amountPaid), 0);
  const expenseTotal = expenses.reduce((s, e) => s + e.amount, 0);
  const canMoveStage = hasProjectCapability(user?.role, 'project.stage.move');
  const canApproveFinance = hasProjectCapability(user?.role, 'project.financial.approve');
  const canRequestChangeOrder = hasProjectCapability(user?.role, 'project.changeOrder.request');
  const canEditAssetDeliverables = isProjectRole(user?.role);
  const canIssueDeliveryLinks = user?.role === UserRole.ADMIN || user?.role === UserRole.PROJECT_MANAGER;
  const actorName = user?.displayName || 'System';
  const dateTimeInput = adminDateTimeInputProps(theme);
  const appOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const projectCalendarContext = {
    id: project.id,
    title: project.title,
    clientName: project.clientName,
    contactEmail: project.contactEmail,
  };
  const addShootToGoogle = (s: AdminShoot) => {
    if (!appOrigin) return;
    openGoogleCalendarInNewTab(payloadFromAdminShoot(s, appOrigin));
  };
  const addMeetingToGoogle = (m: AdminMeeting) => {
    if (!appOrigin) return;
    openGoogleCalendarInNewTab(payloadFromAdminMeeting(m, appOrigin));
  };
  const openCalendarForShoot = (s: AdminShoot) => {
    setCalendarEventInitial({
      title: s.title,
      dateYmd: s.date,
      timeHm: s.callTime,
      allDay: false,
      location: s.location,
      description: [s.description, s.gearSummary].filter(Boolean).join('\n'),
    });
    setCalendarEventOpen(true);
  };
  const openCalendarForMeeting = (m: AdminMeeting) => {
    setCalendarEventInitial({
      title: m.title,
      dateYmd: m.date,
      timeHm: m.startTime,
      allDay: false,
      location: m.location,
      description: [m.description, m.participants.length ? `Participants: ${m.participants.join(', ')}` : ''].filter(Boolean).join('\n'),
    });
    setCalendarEventOpen(true);
  };

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
    if (taskId === '__new__') {
      setOpenTaskId('__new__');
      setTaskDraft({
        title: '',
        description: '',
        referenceLink: '',
        dueDate: new Date().toISOString().slice(0, 10),
        assigneeCrewIds: [project.ownerCrewId],
        type: 'admin',
        priority: 'medium',
      });
      setActiveDrawer('planner');
      return;
    }
    const task = planner.find((item) => item.id === taskId);
    if (!task) return;
    setOpenTaskId(taskId);
    setTaskDraft({
      title: task.title,
      description: task.description || task.notes || '',
      referenceLink: task.referenceLink || '',
      dueDate: task.dueDate,
      assigneeCrewIds: task.assigneeCrewIds?.length ? task.assigneeCrewIds : [task.assigneeCrewId],
      type: task.type,
      priority: task.priority,
    });
    setActiveDrawer('planner');
  };

  const openScheduleEditor = (kind: ScheduleFormType, id: string) => {
    if (id === '__new__') {
      setScheduleQuickType(kind);
      const start = kind === 'shoot' ? '08:00' : '10:00';
      setScheduleDraft({
        title: '',
        date: '',
        time: start,
        endTime: defaultEndTimeForSchedule(start, kind),
        location: '',
        description: '',
        participants: [project.ownerCrewId],
      });
      setOpenSchedule({ kind, id: '__new__' });
      setActiveDrawer('schedule');
      return;
    }
    if (kind === 'shoot') {
      const shoot = shoots.find((item) => item.id === id);
      if (!shoot) return;
      setScheduleDraft({
        title: shoot.title,
        date: shoot.date,
        time: shoot.callTime,
        endTime: ensureEndTimeFromStored(shoot.callTime, shoot.endTime, 'shoot'),
        location: shoot.location,
        description: shoot.description || shoot.gearSummary,
        participants: shoot.crewIds?.length ? shoot.crewIds : (shoot.crew ?? []),
      });
    } else {
      const meeting = meetings.find((item) => item.id === id);
      if (!meeting) return;
      setScheduleDraft({
        title: meeting.title,
        date: meeting.date,
        time: meeting.startTime,
        endTime: ensureEndTimeFromStored(meeting.startTime, meeting.endTime, 'meeting'),
        location: meeting.location,
        description: meeting.description || '',
        participants: meeting.participantCrewIds?.length ? meeting.participantCrewIds : meeting.participants,
      });
    }
    setOpenSchedule({ kind, id });
    setScheduleQuickType(kind);
    setActiveDrawer('schedule');
  };

  const toggleParticipant = (crewId: string) => {
    setScheduleDraft((current) => ({
      ...current,
      participants: current.participants.includes(crewId)
        ? current.participants.filter((item) => item !== crewId)
        : [...current.participants, crewId],
    }));
  };

  const toggleTaskAssignee = (crewId: string) => {
    setTaskDraft((current) => ({
      ...current,
      assigneeCrewIds: current.assigneeCrewIds.includes(crewId)
        ? current.assigneeCrewIds.filter((id) => id !== crewId)
        : [...current.assigneeCrewIds, crewId],
    }));
  };

  const openAssetEditor = (assetId: string | '__new__') => {
    setAssetDrawerStatus(null);
    if (assetId === '__new__') {
      setOpenAssetId('__new__');
      setAssetDraft({
        label: '',
        mediaType: 'video',
        sourceType: 'upload',
        uploadFilename: '',
        uploadReferenceUrl: '',
        externalUrl: '',
        version: 'v0.1',
        status: 'internal',
        clientVisible: false,
        notes: '',
      });
    } else {
      const asset = assets.find((item) => item.id === assetId);
      if (!asset) return;
      setOpenAssetId(assetId);
      setAssetDraft({
        label: asset.label,
        mediaType: asset.type,
        sourceType: asset.sourceType ?? 'upload',
        uploadFilename: asset.storage?.filename || '',
        uploadReferenceUrl: (asset.sourceType === 'upload' || !asset.sourceType) && asset.sourceUrl ? asset.sourceUrl : '',
        externalUrl: asset.sourceType === 'external_link' ? (asset.sourceUrl || '') : '',
        version: asset.version,
        status: asset.status,
        clientVisible: asset.clientVisible,
        notes: asset.notes || '',
      });
    }
    setActiveDrawer('asset');
  };

  const toggleDeliverableAsset = (assetId: string) => {
    setDeliverableDraft((current) => ({
      ...current,
      linkedAssetIds: current.linkedAssetIds.includes(assetId)
        ? current.linkedAssetIds.filter((id) => id !== assetId)
        : [...current.linkedAssetIds, assetId],
    }));
  };

  const issueClientLink = async (deliverableId: string) => {
    if (!canIssueDeliveryLinks) {
      setMessage('Only admin or project managers can issue client links.', 'error');
      return;
    }
    const deliverable = deliverables.find((item) => item.id === deliverableId);
    if (!deliverable) {
      setMessage('Deliverable not found.', 'error');
      return;
    }
    if (deliverable.status !== 'approved' && deliverable.status !== 'delivered') {
      setMessage('Deliverable must be approved before generating a client link.', 'error');
      return;
    }
    const linkedAssets = assets.filter((asset) => deliverable.linkedAssetIds.includes(asset.id));
    const approvedAsset = linkedAssets.find((asset) => asset.status === 'approved' || asset.status === 'delivered');
    if (!approvedAsset?.storage?.path) {
      setMessage('An approved linked asset with a storage path is required.', 'error');
      return;
    }
    setDeliveryActionBusyById((current) => ({ ...current, [deliverableId]: true }));
    try {
      const result = await createStorageDeliveryLink({
        path: approvedAsset.storage.path,
        assetId: approvedAsset.id,
        versionId: approvedAsset.version,
        expiresInMinutes: 60,
      });
      const deliveryLinkIds = [...(deliverable.deliveryLinkIds || []), result.id];
      updateDeliverable(
        deliverableId,
        {
          referenceLink: result.url,
          deliveryLinkIds,
          approvedAssetVersionId: approvedAsset.version,
          deliveryLinkExpiresAt: result.expiresAt,
          deliveryLinkRevokedAt: undefined,
        },
        actorName
      );
      setRefreshTick((value) => value + 1);
      setMessage('Client link generated.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not generate client link.', 'error');
    } finally {
      setDeliveryActionBusyById((current) => ({ ...current, [deliverableId]: false }));
    }
  };

  const revokeClientLink = async (deliverableId: string) => {
    if (!canIssueDeliveryLinks) {
      setMessage('Only admin or project managers can revoke client links.', 'error');
      return;
    }
    const deliverable = deliverables.find((item) => item.id === deliverableId);
    const linkId = deliverable?.deliveryLinkIds?.[deliverable.deliveryLinkIds.length - 1];
    if (!deliverable || !linkId) {
      setMessage('No active delivery link found for this deliverable.', 'error');
      return;
    }
    setDeliveryActionBusyById((current) => ({ ...current, [deliverableId]: true }));
    try {
      await revokeStorageDeliveryLink(linkId);
      updateDeliverable(
        deliverableId,
        {
          deliveryLinkRevokedAt: new Date().toISOString(),
        },
        actorName
      );
      setRefreshTick((value) => value + 1);
      setMessage('Client link revoked.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not revoke link.', 'error');
    } finally {
      setDeliveryActionBusyById((current) => ({ ...current, [deliverableId]: false }));
    }
  };

  const openDeliverableEditor = (deliverableId: string | '__new__') => {
    setDeliverableDrawerStatus(null);
    if (deliverableId === '__new__') {
      setOpenDeliverableId('__new__');
      setDeliverableDraft({
        label: '',
        ownerCrewId: project.ownerCrewId,
        dueDate: project.dueDate,
        required: true,
        step: 'post_production',
        status: 'not_started',
        linkedAssetIds: [],
        referenceLink: '',
        acceptanceCriteria: '',
        notes: '',
      });
    } else {
      const deliverable = deliverables.find((item) => item.id === deliverableId);
      if (!deliverable) return;
      setOpenDeliverableId(deliverableId);
      setDeliverableDraft({
        label: deliverable.label,
        ownerCrewId: deliverable.ownerCrewId,
        dueDate: deliverable.dueDate,
        required: deliverable.required,
        step: deliverable.step ?? 'post_production',
        status: deliverable.status,
        linkedAssetIds: deliverable.linkedAssetIds || [],
        referenceLink: deliverable.referenceLink || '',
        acceptanceCriteria: deliverable.acceptanceCriteria || '',
        notes: deliverable.notes || '',
      });
    }
    setActiveDrawer('deliverable');
  };

  const tabBtn = (id: Tab, label: string) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      data-tour={`project-tab-${id}`}
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
    if (state === 'loading')
      return (
        <div
          className={`rounded-xl p-4 text-sm ${
            isDark ? 'border border-zinc-800 bg-zinc-900/30 text-zinc-500' : 'border border-zinc-200 bg-zinc-50 text-zinc-600'
          }`}
        >
          {tabName} is loading...
        </div>
      );
    if (state === 'error') return <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-4 text-sm text-red-200">We could not load this section right now. Please try again.</div>;
    if (state === 'empty' || !hasData)
      return (
        <div
          className={`rounded-xl p-4 text-sm ${
            isDark ? 'border border-zinc-800 bg-zinc-900/30 text-zinc-500' : 'border border-zinc-200 bg-zinc-50 text-zinc-600'
          }`}
        >
          Nothing here yet. Add the first item to get started.
        </div>
      );
    return <>{content}</>;
  };

  return (
    <div className="max-w-6xl min-w-0">
      <div
        className={[
          'sticky top-0 z-30 -mx-4 sm:-mx-6 px-4 sm:px-6 pb-3 space-y-3 backdrop-blur border-b',
          isDark ? 'bg-zinc-950/90 border-zinc-800' : 'bg-zinc-50/95 border-zinc-200',
        ].join(' ')}
      >
        <div
          data-tour="project-header"
          className={[
            'rounded-xl border px-3 py-3 sm:px-4',
            isDark ? 'border-zinc-800 bg-zinc-900/40' : 'border-zinc-200 bg-white/80',
          ].join(' ')}
        >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            to={isStaff ? '/hq/staff' : '/hq/admin/projects'}
            className="inline-flex items-center gap-2 text-xs text-zinc-500 hover:text-white mb-2"
          >
            <ArrowLeft size={14} />
            {isStaff ? 'Crew home' : 'All projects'}
          </Link>
          <h2 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>{project.title}</h2>
          <p className="text-sm text-zinc-500 mt-1">
            {project.clientName} · {project.packageLabel}
          </p>
        </div>
        <div className="flex flex-col sm:items-end gap-2 sm:text-right text-xs text-zinc-500 min-w-0">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <select
              value={project.stage}
              onChange={async (e) => {
                if (!canMoveStage) return;
                const nextStage = e.target.value as ProjectStage;
                const result = await transitionProjectStage(project.id, nextStage, user?.displayName || 'System');
                setStageMessage(result.ok ? `Stage updated to ${formatStage(nextStage)}.` : result.error || 'Unable to update stage.');
                if (result.ok) setRefreshTick((value) => value + 1);
              }}
              disabled={!canMoveStage}
              className={`${appInputClass(isDark).replace('text-sm', 'text-xs')} py-1.5 disabled:opacity-50`}
            >
              {PROJECT_STAGE_ORDER.map((item) => (
                <option key={item} value={item}>
                  {formatStage(item)}
                </option>
              ))}
            </select>
            {!canMoveStage && <span className="text-[11px] text-zinc-500">Stage updates are restricted for this role</span>}
          </div>
          <p className="break-words">
            Due <span className="text-zinc-300 font-mono">{formatAdminDate(project.dueDate)}</span> · Owner{' '}
            <span className="text-zinc-300">{project.ownerName}</span>
          </p>
          {stageMessage && <p className="text-xs text-zinc-400">{stageMessage}</p>}
        </div>
        </div>
        </div>

        <div className="flex flex-wrap gap-2 min-w-0" data-tour="project-tabs">
          {(isStaff ? STAFF_PROJECT_TABS : ALL_PROJECT_TABS).map((id) => tabBtn(id, TAB_LABELS[id]))}
        </div>
      </div>

      <div
        className="space-y-6 mt-6 min-w-0"
        data-tour="project-tab-content"
        data-active-project-tab={tab}
      >
      {feedback && (
        <div
          className={`rounded-xl border px-3 py-2 text-xs ${
            feedbackTone === 'ok' ? 'border-emerald-900/60 bg-emerald-950/20 text-emerald-200' : 'border-red-900/60 bg-red-950/20 text-red-200'
          }`}
        >
          {feedback}
        </div>
      )}

      {tab === 'overview' && withState('overview', true, (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-zinc-300 min-w-0">
          <div className={`rounded-xl p-4 min-w-0 ${appPanelClass(isDark)}`}>
            <div className="flex items-center justify-between gap-2 mb-2">
              <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Summary</h3>
              {!isEditingNarrative && !isStaff && (
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
          <div className={`rounded-xl p-4 min-w-0 ${appPanelClass(isDark)}`}>
            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">Deliverables</h3>
            {deliverables.length === 0 ? (
              <p className="text-sm text-zinc-500">No deliverables yet. Add one in the Deliverables tab.</p>
            ) : (
              <ul className="list-disc list-inside text-zinc-200 space-y-1">
                {deliverables.map((item) => (
                  <li key={item.id}>{item.label}</li>
                ))}
              </ul>
            )}
          </div>
          <div className={`rounded-xl p-4 md:col-span-2 min-w-0 ${appPanelClass(isDark)}`}>
            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">Team on this project</h3>
            <p className="text-xs text-zinc-500 mb-2">
              Owner: <span className="text-zinc-300">{project.ownerName}</span>
            </p>
            <div className="flex flex-wrap gap-2 mb-3">
              {(project.assignedCrewIds || []).map((crewId) => {
                const crew = getHqCrewDirectory().find((c) => c.id === crewId);
                return (
                  <button
                    key={crewId}
                    type="button"
                    onClick={async () => {
                      const r = await removeCrewFromProject(project.id, crewId, actorName);
                      if (!r.ok) {
                        setMessage(r.error || 'Could not remove crew member.', 'error');
                        return;
                      }
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
              {getHqCrewDirectory()
                .filter((crew) => !(project.assignedCrewIds || []).includes(crew.id))
                .map((crew) => (
                <button
                  key={crew.id}
                  type="button"
                  onClick={async () => {
                    const r = await assignCrewToProject(project.id, crew.id, actorName);
                    if (!r.ok) {
                      setMessage(r.error || 'Could not assign crew member.', 'error');
                      return;
                    }
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
            <div className={`rounded-xl p-4 md:col-span-2 space-y-3 min-w-0 ${appPanelClass(isDark)}`}>
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Narrative Draft</h3>
                <button type="button" onClick={autoSuggestNarrative} className="text-[11px] underline text-zinc-400">
                  Auto-suggest draft
                </button>
              </div>
              <textarea value={summaryDraft} onChange={(e) => setSummaryDraft(e.target.value)} rows={3} className={appInputClass(isDark)} />
              <textarea value={milestoneDraft} onChange={(e) => setMilestoneDraft(e.target.value)} rows={2} className={appInputClass(isDark)} />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    const result = await saveProjectNarrative(
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
        <div
          className={`rounded-xl p-5 space-y-4 text-sm ${
            isDark ? 'text-zinc-200' : 'text-zinc-800'
          } min-w-0 ${appPanelClass(isDark)}`}
        >
          <div>
            <div className="flex items-center justify-between gap-2 mb-1">
              <h3 className="text-xs font-bold uppercase text-zinc-500">Brief</h3>
              {!isEditingNarrative && !isStaff && (
                <button type="button" onClick={beginNarrativeEdit} className="text-[11px] underline text-zinc-400">
                  Edit
                </button>
              )}
            </div>
            {isEditingNarrative ? (
              <textarea value={briefDraft} onChange={(e) => setBriefDraft(e.target.value)} rows={4} className={appInputClass(isDark)} />
            ) : (
              <p className="leading-relaxed">{project.brief}</p>
            )}
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase text-zinc-500 mb-1">Goals</h3>
            {isEditingNarrative ? (
              <textarea value={goalsDraft} onChange={(e) => setGoalsDraft(e.target.value)} rows={3} className={appInputClass(isDark)} />
            ) : (
              <p className="leading-relaxed">{project.goals}</p>
            )}
          </div>
          {isEditingNarrative && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={async () => {
                  const result = await saveProjectNarrative(
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
          <div
            className={`flex items-center justify-between rounded-xl px-3 py-2 ${
              isDark ? 'border border-zinc-800 bg-zinc-900/20' : 'border border-zinc-200 bg-zinc-100/80'
            }`}
          >
            <p className="text-xs uppercase tracking-widest text-zinc-500">Task Workstream</p>
            <div className="flex items-center gap-3">
              <p className="text-xs text-zinc-400">{plannerView.length} task(s)</p>
              {!isStaff && (
                <button
                  type="button"
                  onClick={() => openTaskEditor('__new__')}
                  className="rounded-md border border-zinc-700 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-zinc-200"
                >
                  Quick Add Task
                </button>
              )}
            </div>
          </div>
          <div className={`rounded-xl overflow-x-auto min-w-0 ${appPanelClass(isDark)}`}>
            {plannerView.length === 0 ? (
              <p className="p-4 text-sm text-zinc-500">No planner tasks yet. Add the first work item above.</p>
            ) : (
              <table className="w-full text-sm min-w-[920px]">
              <thead
                className={`text-xs uppercase border-b ${
                  isDark ? 'text-zinc-500 border-zinc-800 bg-zinc-950/60' : 'text-zinc-600 border-zinc-200 bg-zinc-100'
                }`}
              >
                <tr>
                  <th className="text-left px-3 py-2">Task</th>
                  <th className="text-left px-3 py-2">Type</th>
                  <th className="text-left px-3 py-2">Status</th>
                  <th className="text-left px-3 py-2">Priority</th>
                  <th className="text-left px-3 py-2">Assignee</th>
                  <th className="text-left px-3 py-2">Due</th>
                  <th className="text-left px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody className={isDark ? 'divide-y divide-zinc-800/80' : 'divide-y divide-zinc-200'}>
                {plannerView.map((t) => (
                  <tr key={t.id} className={isDark ? 'hover:bg-zinc-900/30' : 'hover:bg-zinc-100/80'}>
                    <td
                      className={`px-3 py-2.5 ${
                        isDark ? 'text-white' : 'text-zinc-900'
                      }`}
                    >
                      {t.title}
                      {t.done && <span className="ml-2 text-xs text-zinc-500">(done)</span>}
                    </td>
                    <td className="px-3 py-2.5 text-zinc-400">
                      <select
                        value={t.type}
                        disabled={isStaff}
                        onChange={async (e) => {
                          const next = e.target.value as PlannerItemType;
                          const r = await updatePlannerTask(t.id, { type: next }, actorName);
                          if (r.ok) setRefreshTick((value) => value + 1);
                          else setMessage(r.error || 'Could not update task.', 'error');
                        }}
                        className={`rounded-md border px-2 py-1 text-xs ${
            isDark ? 'border-zinc-700 bg-zinc-900 text-zinc-100' : 'border-zinc-300 bg-white text-zinc-900'
          }`}
                      >
                        <option value="admin">Admin</option>
                        <option value="pre_production">Pre-production</option>
                        <option value="shoot">Shoot</option>
                        <option value="edit">Edit</option>
                        <option value="review">Review</option>
                        <option value="delivery">Delivery</option>
                        <option value="invoice">Invoice</option>
                        <option value="client_followup">Client follow-up</option>
                      </select>
                    </td>
                    <td className="px-3 py-2.5 text-zinc-500">
                      <select
                        value={plannerStatusFromItem(t)}
                        disabled={isStaff}
                        onChange={async (e) => {
                          const next = e.target.value as PlannerTaskStatus;
                          const mapped = plannerStatusToLegacy(next);
                          const r = await updatePlannerTask(
                            t.id,
                            { status: next, column: mapped.column, done: mapped.done },
                            actorName
                          );
                          if (r.ok) {
                            setRefreshTick((value) => value + 1);
                            setMessage(`Task moved to ${next.replace('_', ' ')}.`);
                          } else setMessage(r.error || 'Could not update task.', 'error');
                        }}
                        className={`rounded-md border px-2 py-1 text-xs ${
            isDark ? 'border-zinc-700 bg-zinc-900 text-zinc-100' : 'border-zinc-300 bg-white text-zinc-900'
          }`}
                      >
                        <option value="todo">To Do</option>
                        <option value="in_progress">In Progress</option>
                        <option value="client_review">Client Review</option>
                        <option value="done">Done</option>
                      </select>
                    </td>
                    <td className="px-3 py-2.5 text-zinc-400">
                      <select
                        value={t.priority}
                        disabled={isStaff}
                        onChange={async (e) => {
                          const next = e.target.value as PlannerItemPriority;
                          const r = await updatePlannerTask(t.id, { priority: next }, actorName);
                          if (r.ok) setRefreshTick((value) => value + 1);
                          else setMessage(r.error || 'Could not update task.', 'error');
                        }}
                        className={`rounded-md border px-2 py-1 text-xs ${
            isDark ? 'border-zinc-700 bg-zinc-900 text-zinc-100' : 'border-zinc-300 bg-white text-zinc-900'
          }`}
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </td>
                    <td className="px-3 py-2.5 text-zinc-300">
                      <div className="flex flex-wrap gap-1">
                        {(t.assigneeNames?.length ? t.assigneeNames : [t.assigneeName]).map((name) => (
                          <span key={name} className="rounded-full border border-zinc-700 px-2 py-0.5 text-[11px] text-zinc-300">
                            {name}
                          </span>
                        ))}
                      </div>
                    </td>
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
                          onClick={async () => {
                            const r = await deletePlannerTask(t.id, actorName);
                            if (r.ok) setRefreshTick((value) => value + 1);
                            else setMessage(r.error || 'Could not delete task.', 'error');
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
            <AdminFormDrawer
              open={activeDrawer === 'planner'}
              onClose={() => {
                setActiveDrawer(null);
                setOpenTaskId(null);
              }}
              title={openTaskId === '__new__' ? 'Quick Add Task' : 'Edit Task'}
              subtitle="Task details, assignees, and due date"
              footer={
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveDrawer(null);
                      setOpenTaskId(null);
                    }}
                    className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const selectedNames = taskDraft.assigneeCrewIds
                        .map((crewId) => assignableCrew.find((crew) => crew.id === crewId)?.displayName)
                        .filter((name): name is string => Boolean(name));
                      try {
                        if (!taskDraft.title.trim()) {
                          setMessage('Task title is required.', 'error');
                          return;
                        }
                        if (openTaskId === '__new__') {
                          await createPlannerTask({
                            projectId: project.id,
                            projectTitle: project.title,
                            clientName: project.clientName,
                            title: taskDraft.title.trim(),
                            type: taskDraft.type,
                            column: 'queue',
                            priority: taskDraft.priority,
                            assigneeCrewId: taskDraft.assigneeCrewIds[0] || project.ownerCrewId,
                            assigneeName: selectedNames[0] || project.ownerName,
                            assigneeCrewIds: taskDraft.assigneeCrewIds.length ? taskDraft.assigneeCrewIds : [project.ownerCrewId],
                            assigneeNames: selectedNames,
                            dueDate: taskDraft.dueDate || new Date().toISOString().slice(0, 10),
                            done: false,
                            status: 'todo',
                            notes: taskDraft.description,
                            description: taskDraft.description,
                            referenceLink: taskDraft.referenceLink,
                          }, actorName);
                          setMessage('Task added to planner.');
                        } else {
                          const ur = await updatePlannerTask(
                            openTaskId,
                            {
                              title: taskDraft.title,
                              dueDate: taskDraft.dueDate,
                              type: taskDraft.type,
                              priority: taskDraft.priority,
                              assigneeCrewId: taskDraft.assigneeCrewIds[0],
                              assigneeName: selectedNames[0] || '',
                              assigneeCrewIds: taskDraft.assigneeCrewIds,
                              assigneeNames: selectedNames,
                              description: taskDraft.description,
                              notes: taskDraft.description,
                              referenceLink: taskDraft.referenceLink,
                            },
                            actorName
                          );
                          if (!ur.ok) {
                            setMessage(ur.error || 'Could not update task.', 'error');
                            return;
                          }
                          setMessage('Task updated.');
                        }
                        setActiveDrawer(null);
                        setOpenTaskId(null);
                        setRefreshTick((value) => value + 1);
                      } catch (error) {
                        setMessage(error instanceof Error ? error.message : 'Could not save task.', 'error');
                      }
                    }}
                    className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-100"
                  >
                    {openTaskId === '__new__' ? 'Create Task' : 'Save Task'}
                  </button>
                </div>
              }
            >
              <input
                value={taskDraft.title}
                onChange={(e) => setTaskDraft((current) => ({ ...current, title: e.target.value }))}
                className={appInputClass(isDark)}
                placeholder="Task title"
              />
              <textarea
                value={taskDraft.description}
                onChange={(e) => setTaskDraft((current) => ({ ...current, description: e.target.value }))}
                rows={3}
                className={appInputClass(isDark)}
                placeholder="Description"
              />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  value={taskDraft.referenceLink}
                  onChange={(e) => setTaskDraft((current) => ({ ...current, referenceLink: e.target.value }))}
                  className={`${appInputClass(isDark)} sm:col-span-2`}
                  placeholder="Reference link"
                />
                <input
                  type="date"
                  value={taskDraft.dueDate}
                  onChange={(e) => setTaskDraft((current) => ({ ...current, dueDate: e.target.value }))}
                  style={dateTimeInput.style}
                  className={`${appInputClass(isDark)} ${dateTimeInput.className}`}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <select value={taskDraft.type} onChange={(e) => setTaskDraft((current) => ({ ...current, type: e.target.value as typeof current.type }))} className={appInputClass(isDark)}>
                  <option value="admin">Admin</option>
                  <option value="pre_production">Pre-production</option>
                  <option value="shoot">Shoot</option>
                  <option value="edit">Edit</option>
                  <option value="review">Review</option>
                  <option value="delivery">Delivery</option>
                  <option value="invoice">Invoice</option>
                  <option value="client_followup">Client follow-up</option>
                </select>
                <select value={taskDraft.priority} onChange={(e) => setTaskDraft((current) => ({ ...current, priority: e.target.value as typeof current.priority }))} className={appInputClass(isDark)}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div className="flex flex-wrap gap-2">
                {assignableCrew.map((crew) => (
                  <button
                    key={crew.id}
                    type="button"
                    onClick={() => toggleTaskAssignee(crew.id)}
                    className={`rounded-full border px-2.5 py-1 text-xs ${taskDraft.assigneeCrewIds.includes(crew.id) ? 'border-white bg-white text-black' : 'border-zinc-700 text-zinc-300'}`}
                  >
                    {crew.displayName}
                  </button>
                ))}
              </div>
            </AdminFormDrawer>
          )}
        </div>
      ))}

      {tab === 'schedule' && withState('schedule', true, (
        <div className="space-y-3">
          <div
            className={`flex items-center justify-between rounded-xl px-3 py-2 ${
              isDark ? 'border border-zinc-800 bg-zinc-900/20' : 'border border-zinc-200 bg-zinc-100/80'
            }`}
          >
            <p className="text-xs uppercase tracking-widest text-zinc-500">Timeline + Logistics</p>
            <p className="text-xs text-zinc-400">{shoots.length + meetings.length} event(s)</p>
          </div>
          <div className={`rounded-xl p-3 min-w-0 ${appPanelClass(isDark)}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-zinc-500">Choose event type, then schedule it with full details and participants.</p>
              <button
                type="button"
                onClick={() => openScheduleEditor('shoot', '__new__')}
                className="rounded-md border border-zinc-700 px-3 py-2 text-xs font-bold uppercase tracking-wide text-zinc-100"
              >
                Schedule Event
              </button>
            </div>
          </div>
          {shoots.length === 0 && meetings.length === 0 ? (
            <p className="text-sm text-zinc-500">No schedule items on this project yet.</p>
          ) : (
            <>
            {shoots.map((s) => (
              <div
                key={s.id}
                className={`rounded-xl p-4 min-w-0 flex flex-col sm:flex-row sm:justify-between gap-2 ${appPanelClass(isDark)}`}
              >
                <div>
                  <p className="text-white font-medium">{s.title}</p>
                  <p className="text-sm text-zinc-500">
                    {formatAdminDate(s.date)} @{' '}
                    {(() => {
                      const sm = hmToMinutesSchedule(s.callTime);
                      const em = s.endTime ? hmToMinutesSchedule(s.endTime) : null;
                      const range =
                        sm != null && em != null && em >= sm ? `${s.callTime}–${s.endTime}` : s.callTime;
                      return (
                        <>
                          {range} — {s.location}
                        </>
                      );
                    })()}
                  </p>
                  <p className="text-xs text-zinc-600 mt-1">Crew: {(s.crew ?? []).join(', ')}</p>
                  {s.description && <p className="text-xs text-zinc-500 mt-1">{s.description}</p>}
                </div>
                <p className="text-xs text-zinc-500 max-w-xs">{s.gearSummary}</p>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <button
                    type="button"
                    onClick={() => addShootToGoogle(s)}
                    className="inline-flex items-center gap-0.5 text-[10px] font-bold uppercase text-zinc-300 border border-zinc-700 rounded px-1.5 py-0.5 hover:bg-zinc-800"
                    title="Add to Google Calendar"
                  >
                    <CalendarPlus size={10} />
                    Google
                  </button>
                  <button
                    type="button"
                    onClick={() => openCalendarForShoot(s)}
                    className="inline-flex items-center gap-0.5 text-[10px] font-bold uppercase text-zinc-500 hover:text-zinc-200"
                    title="Compose invite and export"
                  >
                    <Share2 size={10} />
                    Invite
                  </button>
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
                    onClick={async () => {
                      const r = await deleteShoot(s.id, actorName);
                      if (!r.ok) {
                        setMessage(r.error || 'Could not delete shoot.', 'error');
                        return;
                      }
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
              <div key={m.id} className={`rounded-xl p-4 min-w-0 flex flex-col sm:flex-row sm:justify-between gap-2 ${appPanelClass(isDark)}`}>
                <div>
                  <p className="text-white font-medium">{m.title} <span className="text-[11px] text-zinc-400">(Meeting)</span></p>
                  <p className="text-sm text-zinc-500">
                    {formatAdminDate(m.date)} @{' '}
                    {(() => {
                      const sm = hmToMinutesSchedule(m.startTime);
                      const em = m.endTime ? hmToMinutesSchedule(m.endTime) : null;
                      const range =
                        sm != null && em != null && em >= sm ? `${m.startTime}–${m.endTime}` : m.startTime;
                      return (
                        <>
                          {range} — {m.location}
                        </>
                      );
                    })()}
                  </p>
                  <p className="text-xs text-zinc-600 mt-1">Participants: {m.participants.join(', ')}</p>
                  {m.description && <p className="text-xs text-zinc-500 mt-1">{m.description}</p>}
                </div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <button
                    type="button"
                    onClick={() => addMeetingToGoogle(m)}
                    className="inline-flex items-center gap-0.5 text-[10px] font-bold uppercase text-zinc-300 border border-zinc-700 rounded px-1.5 py-0.5 hover:bg-zinc-800"
                    title="Add to Google Calendar"
                  >
                    <CalendarPlus size={10} />
                    Google
                  </button>
                  <button
                    type="button"
                    onClick={() => openCalendarForMeeting(m)}
                    className="inline-flex items-center gap-0.5 text-[10px] font-bold uppercase text-zinc-500 hover:text-zinc-200"
                    title="Compose invite and export"
                  >
                    <Share2 size={10} />
                    Invite
                  </button>
                  <button type="button" onClick={() => openScheduleEditor('meeting', m.id)} className="text-[11px] underline text-zinc-400">Open</button>
                  <button
                    type="button"
                    onClick={async () => {
                      const r = await deleteMeeting(m.id, actorName);
                      if (!r.ok) {
                        setMessage(r.error || 'Could not delete meeting.', 'error');
                        return;
                      }
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
            <AdminFormDrawer
              open={activeDrawer === 'schedule'}
              onClose={() => {
                setActiveDrawer(null);
                setOpenSchedule(null);
              }}
              title={openSchedule.id === '__new__' ? 'Schedule Event' : openSchedule.kind === 'shoot' ? 'Edit Shoot' : 'Edit Meeting'}
              subtitle="Set timing, location, and participants"
              footer={
                <div className="flex justify-end gap-2">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveDrawer(null);
                        setOpenSchedule(null);
                      }}
                      className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const startM = hmToMinutesSchedule(scheduleDraft.time);
                          const endM = hmToMinutesSchedule(scheduleDraft.endTime);
                          if (startM == null || endM == null) {
                            setMessage('Enter valid start and end times.', 'error');
                            return;
                          }
                          if (endM < startM) {
                            setMessage('End time must be on or after start time.', 'error');
                            return;
                          }
                          if (openSchedule.kind === 'shoot') {
                            if (openSchedule.id === '__new__') {
                              await createShoot({
                                projectId: project.id,
                                projectTitle: project.title,
                                title: scheduleDraft.title,
                                date: scheduleDraft.date,
                                callTime: scheduleDraft.time,
                                endTime: scheduleDraft.endTime,
                                location: scheduleDraft.location,
                                gearSummary: scheduleDraft.description,
                                description: scheduleDraft.description,
                                crew: scheduleDraft.participants,
                              }, actorName);
                            } else {
                              const sr = await updateShoot(
                                openSchedule.id,
                                {
                                  title: scheduleDraft.title,
                                  date: scheduleDraft.date,
                                  callTime: scheduleDraft.time,
                                  endTime: scheduleDraft.endTime,
                                  location: scheduleDraft.location,
                                  gearSummary: scheduleDraft.description,
                                  description: scheduleDraft.description,
                                  crew: scheduleDraft.participants,
                                },
                                actorName
                              );
                              if (!sr.ok) {
                                setMessage(sr.error || 'Could not update shoot.', 'error');
                                return;
                              }
                            }
                          } else if (openSchedule.id === '__new__') {
                            await createMeeting({
                              projectId: project.id,
                              projectTitle: project.title,
                              title: scheduleDraft.title,
                              date: scheduleDraft.date,
                              startTime: scheduleDraft.time,
                              endTime: scheduleDraft.endTime,
                              location: scheduleDraft.location,
                              description: scheduleDraft.description,
                              participants: scheduleDraft.participants,
                            }, actorName);
                          } else {
                            const mr = await updateMeeting(
                              openSchedule.id,
                              {
                                title: scheduleDraft.title,
                                date: scheduleDraft.date,
                                startTime: scheduleDraft.time,
                                endTime: scheduleDraft.endTime,
                                location: scheduleDraft.location,
                                description: scheduleDraft.description,
                                participants: scheduleDraft.participants,
                              },
                              actorName
                            );
                            if (!mr.ok) {
                              setMessage(mr.error || 'Could not update meeting.', 'error');
                              return;
                            }
                          }
                          setActiveDrawer(null);
                          setOpenSchedule(null);
                          setRefreshTick((value) => value + 1);
                          setMessage(`${openSchedule.kind === 'shoot' ? 'Shoot' : 'Meeting'} ${openSchedule.id === '__new__' ? 'created' : 'updated'}.`);
                        } catch (error) {
                          setMessage(error instanceof Error ? error.message : 'Could not update schedule item.', 'error');
                        }
                      }}
                      className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-100"
                    >
                      {openSchedule.id === '__new__' ? `Create ${openSchedule.kind}` : `Save ${openSchedule.kind}`}
                    </button>
                  </div>
                </div>
              }
            >
              <div className="space-y-1">
                <label className="block text-xs font-medium uppercase tracking-wide text-zinc-500">Event Type</label>
                <select
                  value={scheduleQuickType}
                  onChange={(e) => {
                    const next = e.target.value as ScheduleFormType;
                    setScheduleQuickType(next);
                    setOpenSchedule((current) => (current ? { ...current, kind: next } : current));
                    setScheduleDraft((current) => {
                      const start = current.time || (next === 'shoot' ? '08:00' : '10:00');
                      return {
                        ...current,
                        time: start,
                        endTime: ensureEndTimeFromStored(start, current.endTime, next),
                      };
                    });
                  }}
                  disabled={openSchedule.id !== '__new__'}
                  className={`${appInputClass(isDark)} disabled:opacity-50`}
                >
                  <option value="shoot">Shoot</option>
                  <option value="meeting">Meeting</option>
                </select>
              </div>
              <input
                value={scheduleDraft.title}
                onChange={(e) => setScheduleDraft((current) => ({ ...current, title: e.target.value }))}
                className={appInputClass(isDark)}
                placeholder="Title"
              />
              <AdminCompactYmdCalendar
                value={scheduleDraft.date}
                onChange={(date) => setScheduleDraft((current) => ({ ...current, date }))}
                isDark={isDark}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 min-w-0">
                <div className="space-y-0.5 min-w-0">
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-zinc-500">Start</label>
                  <input
                    type="time"
                    value={scheduleDraft.time}
                    onChange={(e) => setScheduleDraft((current) => ({ ...current, time: e.target.value }))}
                    style={dateTimeInput.style}
                    className={`${appInputClass(isDark)} ${dateTimeInput.className} w-full`}
                  />
                </div>
                <div className="space-y-0.5 min-w-0">
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-zinc-500">End</label>
                  <input
                    type="time"
                    value={scheduleDraft.endTime}
                    onChange={(e) => setScheduleDraft((current) => ({ ...current, endTime: e.target.value }))}
                    style={dateTimeInput.style}
                    className={`${appInputClass(isDark)} ${dateTimeInput.className} w-full`}
                  />
                </div>
              </div>
              <ScheduleLocationInput
                enabled={Boolean(activeDrawer === 'schedule' && openSchedule)}
                value={scheduleDraft.location}
                onChange={(location) => setScheduleDraft((current) => ({ ...current, location }))}
                className={appInputClass(isDark)}
                placeholder="Location/Link"
              />
              <textarea value={scheduleDraft.description} onChange={(e) => setScheduleDraft((current) => ({ ...current, description: e.target.value }))} rows={3} className={appInputClass(isDark)} placeholder="Description/context" />
              <div className="flex flex-wrap gap-2">
                {assignableCrew.map((crew) => (
                  <button
                    key={crew.id}
                    type="button"
                    onClick={() => toggleParticipant(crew.id)}
                    className={`rounded-full border px-2.5 py-1 text-xs ${scheduleDraft.participants.includes(crew.id) ? 'border-white bg-white text-black' : 'border-zinc-700 text-zinc-300'}`}
                  >
                    {crew.displayName}
                  </button>
                ))}
              </div>
            </AdminFormDrawer>
          )}
        </div>
      ))}

      {tab === 'assets' && withState('assets', true, (
        <div className="space-y-3">
          <div
            className={`rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 min-w-0 ${appPanelClass(
              isDark
            )}`}
          >
            <p className="text-xs uppercase tracking-widest text-zinc-500">Assets</p>
            <button type="button" onClick={() => openAssetEditor('__new__')} className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-zinc-100">
              Quick Add Asset
            </button>
          </div>
          {projectId && (
            <ProjectAssetUploader
              projectId={projectId}
              canUpload={canEditAssetDeliverables}
              onComplete={() => setRefreshTick((value) => value + 1)}
            />
          )}
          <div
            className={`rounded-xl divide-y ${
              isDark ? 'divide-zinc-800/80' : 'divide-zinc-200'
            } min-w-0 ${appPanelClass(isDark)}`}
          >
          {assets.length === 0 ? (
            <p className="p-4 text-sm text-zinc-500">No assets linked to this project yet.</p>
          ) : (
            assets.map((a) => (
              <div
                key={a.id}
                className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
              >
                <div>
                  <p className="text-white text-sm font-medium">
                    {a.label}{' '}
                    <span className="text-zinc-500 font-mono text-xs">{a.version}</span>
                  </p>
                  <p className="text-xs text-zinc-500">
                    {a.type.toUpperCase()} — {a.commentCount} comment(s) —{' '}
                    {a.clientVisible ? 'Client visible' : 'Internal only'}
                  </p>
                  <p className="text-xs text-zinc-600 mt-1 break-all">
                    {a.sourceType === 'external_link'
                      ? (a.sourceUrl || 'External link not set')
                      : (a.storage?.path || 'Upload path not set')}
                    {a.sourceType !== 'external_link' && a.sourceUrl ? (
                      <span className="block text-zinc-500 mt-0.5">Link: {a.sourceUrl}</span>
                    ) : null}
                  </p>
                </div>
                <span
                  className={`self-start text-[10px] uppercase font-bold px-2 py-0.5 rounded ${assetStatusClassForTheme(a.status, theme)}`}
                >
                  {a.status}
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => openAssetEditor(a.id)}
                    disabled={!canEditAssetDeliverables}
                    className="text-[11px] underline text-zinc-400 disabled:opacity-50"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      updateProjectAsset(a.id, { clientVisible: !a.clientVisible }, actorName);
                      setRefreshTick((value) => value + 1);
                    }}
                    disabled={!canEditAssetDeliverables}
                    className="text-[11px] underline text-zinc-400 disabled:opacity-50"
                  >
                    {a.clientVisible ? 'Set internal' : 'Set client-visible'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      deleteProjectAsset(a.id, actorName);
                      setRefreshTick((value) => value + 1);
                    }}
                    disabled={!canEditAssetDeliverables}
                    className="text-[11px] underline text-red-300 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
          </div>
          <AdminFormDrawer
            open={activeDrawer === 'asset'}
            onClose={() => {
              setActiveDrawer(null);
              setOpenAssetId(null);
              setAssetDrawerStatus(null);
            }}
            title={openAssetId === '__new__' ? 'Quick Add Asset' : 'Edit Asset'}
            subtitle="Capture asset source, visibility, and delivery metadata"
            footer={
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => { setActiveDrawer(null); setOpenAssetId(null); }} className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300">Cancel</button>
                <button
                  type="button"
                  disabled={assetDrawerBusy}
                  onClick={() => {
                    try {
                      if (!assetDraft.label.trim()) {
                        setMessage('Asset label is required.', 'error');
                        setAssetDrawerStatus({ tone: 'error', message: 'Asset label is required.' });
                        return;
                      }
                      if (assetDraft.sourceType === 'external_link' && !assetDraft.externalUrl.trim()) {
                        setAssetDrawerStatus({ tone: 'error', message: 'External link URL is required.' });
                        return;
                      }
                      if (assetDraft.sourceType === 'upload' && !assetDraft.uploadFilename.trim()) {
                        setAssetDrawerStatus({ tone: 'error', message: 'Upload filename is required.' });
                        return;
                      }
                      setAssetDrawerBusy(true);
                      if (openAssetId === '__new__') {
                        const uploadRef = assetDraft.uploadReferenceUrl.trim();
                        createProjectAsset({
                          projectId: project.id,
                          label: assetDraft.label.trim(),
                          type: assetDraft.mediaType,
                          sourceType: assetDraft.sourceType,
                          sourceUrl:
                            assetDraft.sourceType === 'external_link'
                              ? assetDraft.externalUrl.trim()
                              : uploadRef || undefined,
                          storage: assetDraft.sourceType === 'upload' ? { filename: assetDraft.uploadFilename.trim() } : undefined,
                          status: assetDraft.status,
                          clientVisible: assetDraft.clientVisible,
                          version: assetDraft.version.trim() || 'v0.1',
                          notes: assetDraft.notes.trim(),
                        }, actorName);
                      } else if (openAssetId) {
                        const uploadRef = assetDraft.uploadReferenceUrl.trim();
                        updateProjectAsset(openAssetId, {
                          label: assetDraft.label.trim(),
                          type: assetDraft.mediaType,
                          sourceType: assetDraft.sourceType,
                          sourceUrl:
                            assetDraft.sourceType === 'external_link'
                              ? assetDraft.externalUrl.trim()
                              : uploadRef,
                          storage: assetDraft.sourceType === 'upload' ? { filename: assetDraft.uploadFilename.trim() } : undefined,
                          status: assetDraft.status,
                          clientVisible: assetDraft.clientVisible,
                          version: assetDraft.version.trim() || 'v0.1',
                          notes: assetDraft.notes.trim(),
                        }, actorName);
                      }
                      setActiveDrawer(null);
                      setOpenAssetId(null);
                      setRefreshTick((value) => value + 1);
                      setAssetDrawerStatus({ tone: 'ok', message: openAssetId === '__new__' ? 'Asset added.' : 'Asset updated.' });
                      setMessage(openAssetId === '__new__' ? 'Asset added.' : 'Asset updated.');
                    } catch (error) {
                      setMessage(error instanceof Error ? error.message : 'Could not add asset.', 'error');
                      setAssetDrawerStatus({ tone: 'error', message: error instanceof Error ? error.message : 'Could not save asset.' });
                    } finally {
                      setAssetDrawerBusy(false);
                    }
                  }}
                  className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-100 disabled:opacity-60"
                >
                  {assetDrawerBusy ? 'Saving...' : openAssetId === '__new__' ? 'Add Asset' : 'Save Asset'}
                </button>
              </div>
            }
          >
            <div className="space-y-2">
              {assetDrawerStatus && (
                <p className={`text-xs ${assetDrawerStatus.tone === 'error' ? 'text-red-300' : 'text-emerald-300'}`}>{assetDrawerStatus.message}</p>
              )}
              <input value={assetDraft.label} onChange={(e) => setAssetDraft((current) => ({ ...current, label: e.target.value }))} placeholder="Asset label" className={appInputClass(isDark)} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <select value={assetDraft.mediaType} onChange={(e) => setAssetDraft((current) => ({ ...current, mediaType: e.target.value as ProjectAssetType }))} className={appInputClass(isDark)}>
                  <option value="video">Video</option>
                  <option value="still">Still</option>
                  <option value="doc">Doc</option>
                  <option value="audio">Audio</option>
                </select>
                <select value={assetDraft.sourceType} onChange={(e) => setAssetDraft((current) => ({ ...current, sourceType: e.target.value as ProjectAssetSourceType }))} className={appInputClass(isDark)}>
                  <option value="upload">Upload</option>
                  <option value="external_link">External link</option>
                </select>
              </div>
              {assetDraft.sourceType === 'upload' ? (
                <div className="space-y-2">
                  <input value={assetDraft.uploadFilename} onChange={(e) => setAssetDraft((current) => ({ ...current, uploadFilename: e.target.value }))} placeholder="Upload filename (e.g. hero-cut-v3.mp4)" className={appInputClass(isDark)} />
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-zinc-500 mb-1">Link / URL (optional)</p>
                    <input
                      value={assetDraft.uploadReferenceUrl}
                      onChange={(e) => setAssetDraft((current) => ({ ...current, uploadReferenceUrl: e.target.value }))}
                      type="url"
                      inputMode="url"
                      placeholder="https://… (Frame.io, review link, or hosted file)"
                      className={appInputClass(isDark)}
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-zinc-500 mb-1">Link / URL</p>
                  <input
                    value={assetDraft.externalUrl}
                    onChange={(e) => setAssetDraft((current) => ({ ...current, externalUrl: e.target.value }))}
                    type="url"
                    inputMode="url"
                    placeholder="https://…"
                    className={appInputClass(isDark)}
                  />
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input value={assetDraft.version} onChange={(e) => setAssetDraft((current) => ({ ...current, version: e.target.value }))} placeholder="Version" className={appInputClass(isDark)} />
                <select value={assetDraft.status} onChange={(e) => setAssetDraft((current) => ({ ...current, status: e.target.value as ProjectAssetStatus }))} className={appInputClass(isDark)}>
                  <option value="internal">Internal</option>
                  <option value="client_review">Client review</option>
                  <option value="approved">Approved</option>
                  <option value="delivered">Delivered</option>
                </select>
                <label
                  className={`flex items-center gap-2 rounded-md border px-3 py-2 text-xs ${
                    isDark
                      ? 'border-zinc-700 bg-zinc-900 text-zinc-200'
                      : 'border-zinc-300 bg-zinc-50 text-zinc-800'
                  }`}
                >
                  <input type="checkbox" checked={assetDraft.clientVisible} onChange={(e) => setAssetDraft((current) => ({ ...current, clientVisible: e.target.checked }))} />
                  Client visible
                </label>
              </div>
              <textarea value={assetDraft.notes} onChange={(e) => setAssetDraft((current) => ({ ...current, notes: e.target.value }))} rows={2} placeholder="Notes" className={appInputClass(isDark)} />
            </div>
          </AdminFormDrawer>
        </div>
      ))}

      {tab === 'deliverables' && withState('deliverables', true, (
        <div className="space-y-3">
          <div
            className={`rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 min-w-0 ${appPanelClass(
              isDark
            )}`}
          >
            <p className="text-xs uppercase tracking-widest text-zinc-500">Deliverables</p>
            <button type="button" onClick={() => openDeliverableEditor('__new__')} className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-zinc-100">
              Quick Add Deliverable
            </button>
          </div>
          <div
            className={`rounded-xl divide-y ${
              isDark ? 'divide-zinc-800/80' : 'divide-zinc-200'
            } min-w-0 ${appPanelClass(isDark)}`}
          >
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
                  <p className="text-xs text-zinc-600 mt-1">
                    Step {d.step?.replaceAll('_', ' ') || 'post production'} · {d.linkedAssetIds.length} linked asset(s)
                  </p>
                  {d.referenceLink && (
                    <p className="text-xs text-zinc-500 mt-1 min-w-0 break-all">
                      <span className="text-zinc-600">Link </span>
                      {/^https?:\/\//i.test(d.referenceLink) ? (
                        <a href={d.referenceLink} className="text-zinc-300 underline" target="_blank" rel="noreferrer">
                          {d.referenceLink}
                        </a>
                      ) : (
                        d.referenceLink
                      )}
                      {/^https?:\/\//i.test(d.referenceLink) && (
                        <button
                          type="button"
                          onClick={() => {
                            void navigator.clipboard?.writeText(d.referenceLink || '').then(() => {
                              setMessage('Client link copied to clipboard.');
                            });
                          }}
                          className="ml-2 text-[11px] underline text-zinc-300"
                        >
                          Copy
                        </button>
                      )}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 min-w-0">
                  <button
                    type="button"
                    onClick={() => {
                      void issueClientLink(d.id);
                    }}
                    disabled={!canIssueDeliveryLinks || deliveryActionBusyById[d.id]}
                    className="rounded-md border border-zinc-700 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-zinc-100 disabled:opacity-50"
                  >
                    {deliveryActionBusyById[d.id] ? 'Working...' : 'Generate Client Link'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void revokeClientLink(d.id);
                    }}
                    disabled={!canIssueDeliveryLinks || !d.deliveryLinkIds?.length || deliveryActionBusyById[d.id]}
                    className="rounded-md border border-red-800/70 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-red-300 disabled:opacity-50"
                  >
                    Revoke Link
                  </button>
                  <select
                    value={d.status}
                    onChange={(e) => {
                      const next = e.target.value as DeliverableStatus;
                      updateDeliverable(d.id, { status: next }, actorName);
                      setRefreshTick((value) => value + 1);
                      setMessage(`Deliverable status moved to ${next.replaceAll('_', ' ')}.`);
                    }}
                    disabled={!canEditAssetDeliverables}
                    className={`rounded-md border px-2 py-1 text-xs disabled:opacity-50 ${
            isDark ? 'border-zinc-700 bg-zinc-900 text-zinc-100' : 'border-zinc-300 bg-white text-zinc-900'
          }`}
                  >
                    <option value="not_started">Not started</option>
                    <option value="in_progress">In progress</option>
                    <option value="ready_for_approval">Ready for approval</option>
                    <option value="approved">Approved</option>
                    <option value="delivered">Delivered</option>
                  </select>
                  <select
                    value={d.step ?? 'post_production'}
                    onChange={(e) => {
                      const next = e.target.value as DeliverableStep;
                      updateDeliverable(d.id, { step: next }, actorName);
                      setRefreshTick((value) => value + 1);
                      setMessage(`Deliverable step moved to ${next.replaceAll('_', ' ')}.`);
                    }}
                    disabled={!canEditAssetDeliverables}
                    className={`rounded-md border px-2 py-1 text-xs disabled:opacity-50 ${
            isDark ? 'border-zinc-700 bg-zinc-900 text-zinc-100' : 'border-zinc-300 bg-white text-zinc-900'
          }`}
                  >
                    <option value="pre_production">Pre-production</option>
                    <option value="production">Production</option>
                    <option value="post_production">Post-production</option>
                    <option value="delivery">Delivery</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => openDeliverableEditor(d.id)}
                    disabled={!canEditAssetDeliverables}
                    className="text-[11px] underline text-zinc-400 disabled:opacity-50"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      deleteDeliverable(d.id, actorName);
                      setRefreshTick((value) => value + 1);
                    }}
                    disabled={!canEditAssetDeliverables}
                    className="text-[11px] underline text-red-300 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
                <div className="w-full min-w-0">
                  {d.referenceLink && (
                    <p className="text-[11px] text-zinc-500 break-all mt-1">
                      Client link {d.deliveryLinkRevokedAt ? 'revoked' : 'active'}.
                      {d.deliveryLinkExpiresAt ? ` Expires ${formatAdminDateTime(d.deliveryLinkExpiresAt)}.` : ''}
                    </p>
                  )}
                  {(() => {
                    const approvedAssetId = (d.linkedAssetIds || [])
                      .map((id) => assets.find((a) => a.id === id))
                      .find((a) => a && (a.status === 'approved' || a.status === 'delivered'))?.id;
                    if (!approvedAssetId) return null;
                    return (
                      <div className="mt-2">
                        <DeliveryLinksPanel
                          assetId={approvedAssetId}
                          versionId={d.approvedAssetVersionId}
                          canRevoke={canIssueDeliveryLinks}
                          refreshKey={refreshTick}
                        />
                      </div>
                    );
                  })()}
                </div>
              </div>
            ))
          )}
          </div>
          <AdminFormDrawer
            open={activeDrawer === 'deliverable'}
            onClose={() => {
              setActiveDrawer(null);
              setOpenDeliverableId(null);
              setDeliverableDrawerStatus(null);
            }}
            title={openDeliverableId === '__new__' ? 'Quick Add Deliverable' : 'Edit Deliverable'}
            subtitle="Set owner, dates, status, linked assets, and acceptance details"
            footer={
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => { setActiveDrawer(null); setOpenDeliverableId(null); }} className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300">Cancel</button>
                <button
                  type="button"
                  disabled={deliverableDrawerBusy}
                  onClick={() => {
                    try {
                      if (!deliverableDraft.label.trim()) {
                        setDeliverableDrawerStatus({ tone: 'error', message: 'Deliverable label is required.' });
                        return;
                      }
                      if (!deliverableDraft.ownerCrewId) {
                        setDeliverableDrawerStatus({ tone: 'error', message: 'Owner is required.' });
                        return;
                      }
                      const owner = assignableCrew.find((crew) => crew.id === deliverableDraft.ownerCrewId);
                      if (!owner) {
                        setDeliverableDrawerStatus({ tone: 'error', message: 'Owner must be on this project team.' });
                        return;
                      }
                      setDeliverableDrawerBusy(true);
                      const payload = {
                        projectId: project.id,
                        label: deliverableDraft.label.trim(),
                        ownerCrewId: deliverableDraft.ownerCrewId,
                        ownerName: owner.displayName,
                        dueDate: deliverableDraft.dueDate || project.dueDate,
                        required: deliverableDraft.required,
                        step: deliverableDraft.step,
                        status: deliverableDraft.status,
                        linkedAssetIds: deliverableDraft.linkedAssetIds,
                        referenceLink: deliverableDraft.referenceLink.trim() || undefined,
                        acceptanceCriteria: deliverableDraft.acceptanceCriteria.trim(),
                        notes: deliverableDraft.notes.trim(),
                      };
                      if (openDeliverableId === '__new__') {
                        createDeliverable(payload, actorName);
                      } else if (openDeliverableId) {
                        updateDeliverable(openDeliverableId, payload, actorName);
                      }
                      setActiveDrawer(null);
                      setOpenDeliverableId(null);
                      setRefreshTick((value) => value + 1);
                      setDeliverableDrawerStatus({ tone: 'ok', message: openDeliverableId === '__new__' ? 'Deliverable added.' : 'Deliverable updated.' });
                      setMessage(openDeliverableId === '__new__' ? 'Deliverable added.' : 'Deliverable updated.');
                    } catch (error) {
                      setMessage(error instanceof Error ? error.message : 'Could not add deliverable.', 'error');
                      setDeliverableDrawerStatus({ tone: 'error', message: error instanceof Error ? error.message : 'Could not save deliverable.' });
                    } finally {
                      setDeliverableDrawerBusy(false);
                    }
                  }}
                  className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-100 disabled:opacity-60"
                >
                  {deliverableDrawerBusy ? 'Saving...' : openDeliverableId === '__new__' ? 'Add Deliverable' : 'Save Deliverable'}
                </button>
              </div>
            }
          >
            <div className="space-y-2">
              {deliverableDrawerStatus && (
                <p className={`text-xs ${deliverableDrawerStatus.tone === 'error' ? 'text-red-300' : 'text-emerald-300'}`}>{deliverableDrawerStatus.message}</p>
              )}
              <input value={deliverableDraft.label} onChange={(e) => setDeliverableDraft((current) => ({ ...current, label: e.target.value }))} placeholder="Deliverable label" className={appInputClass(isDark)} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <select value={deliverableDraft.ownerCrewId} onChange={(e) => setDeliverableDraft((current) => ({ ...current, ownerCrewId: e.target.value }))} className={appInputClass(isDark)}>
                  {assignableCrew.map((crew) => (
                    <option key={crew.id} value={crew.id}>{crew.displayName}</option>
                  ))}
                </select>
                <input type="date" value={deliverableDraft.dueDate} onChange={(e) => setDeliverableDraft((current) => ({ ...current, dueDate: e.target.value }))} style={dateTimeInput.style} className={`${appInputClass(isDark)} ${dateTimeInput.className}`} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <label
                  className={`flex items-center gap-2 rounded-md border px-3 py-2 text-xs ${
                    isDark
                      ? 'border-zinc-700 bg-zinc-900 text-zinc-200'
                      : 'border-zinc-300 bg-zinc-50 text-zinc-800'
                  }`}
                >
                  <input type="checkbox" checked={deliverableDraft.required} onChange={(e) => setDeliverableDraft((current) => ({ ...current, required: e.target.checked }))} />
                  Required
                </label>
                <select value={deliverableDraft.step} onChange={(e) => setDeliverableDraft((current) => ({ ...current, step: e.target.value as DeliverableStep }))} className={appInputClass(isDark)}>
                  <option value="pre_production">Pre-production</option>
                  <option value="production">Production</option>
                  <option value="post_production">Post-production</option>
                  <option value="delivery">Delivery</option>
                </select>
                <select value={deliverableDraft.status} onChange={(e) => setDeliverableDraft((current) => ({ ...current, status: e.target.value as DeliverableStatus }))} className={appInputClass(isDark)}>
                  <option value="not_started">Not started</option>
                  <option value="in_progress">In progress</option>
                  <option value="ready_for_approval">Ready for approval</option>
                  <option value="approved">Approved</option>
                  <option value="delivered">Delivered</option>
                </select>
              </div>
              <div
                className={`rounded-md border p-2 ${
                  isDark ? 'border-zinc-800 bg-zinc-950/60' : 'border-zinc-200 bg-zinc-100'
                }`}
              >
                <p className="text-[11px] uppercase tracking-wide text-zinc-500 mb-2">Linked Assets</p>
                <div className="flex flex-wrap gap-2">
                  {assets.map((asset) => (
                    <button
                      key={asset.id}
                      type="button"
                      onClick={() => toggleDeliverableAsset(asset.id)}
                      className={`rounded-full border px-2.5 py-1 text-xs ${deliverableDraft.linkedAssetIds.includes(asset.id) ? 'border-white bg-white text-black' : 'border-zinc-700 text-zinc-300'}`}
                    >
                      {asset.label}
                    </button>
                  ))}
                  {assets.length === 0 && <span className="text-xs text-zinc-500">No assets yet.</span>}
                </div>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-zinc-500 mb-1">Link / URL (optional)</p>
                <input
                  value={deliverableDraft.referenceLink}
                  onChange={(e) => setDeliverableDraft((current) => ({ ...current, referenceLink: e.target.value }))}
                  type="url"
                  inputMode="url"
                  placeholder="https://… (review, delivery, or reference)"
                  className={appInputClass(isDark)}
                />
              </div>
              <textarea value={deliverableDraft.acceptanceCriteria} onChange={(e) => setDeliverableDraft((current) => ({ ...current, acceptanceCriteria: e.target.value }))} rows={2} placeholder="Acceptance criteria" className={appInputClass(isDark)} />
              <textarea value={deliverableDraft.notes} onChange={(e) => setDeliverableDraft((current) => ({ ...current, notes: e.target.value }))} rows={2} placeholder="Notes" className={appInputClass(isDark)} />
            </div>
          </AdminFormDrawer>
        </div>
      ))}

      {tab === 'controls' && withState('controls', true, (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" data-tour="project-tab-controls">
          <div className={`rounded-xl p-4 min-w-0 ${appPanelClass(isDark)}`}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Risks</h3>
              <button type="button" onClick={() => setActiveDrawer('risk')} className="rounded-md border border-zinc-700 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-zinc-100">Quick Add</button>
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
          <div className={`rounded-xl p-4 min-w-0 ${appPanelClass(isDark)}`}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Blockers</h3>
              <button type="button" onClick={() => setActiveDrawer('blocker')} className="rounded-md border border-zinc-700 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-zinc-100">Quick Add</button>
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
          <div className={`rounded-xl p-4 min-w-0 ${appPanelClass(isDark)}`}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Dependencies</h3>
              <button type="button" onClick={() => setActiveDrawer('dependency')} className="rounded-md border border-zinc-700 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-zinc-100">Quick Add</button>
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
          <AdminFormDrawer
            open={activeDrawer === 'risk'}
            onClose={() => setActiveDrawer(null)}
            title="Quick Add Risk"
            footer={<div className="flex justify-end gap-2"><button type="button" onClick={() => setActiveDrawer(null)} className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300">Cancel</button><button type="button" onClick={() => { if (!newRiskLabel.trim()) { setMessage('Risk label is required.', 'error'); return; } createRisk({ projectId: project.id, label: newRiskLabel.trim(), ownerName: project.ownerName, severity: 'medium', status: 'open' }, actorName); setNewRiskLabel(''); setActiveDrawer(null); setRefreshTick((value) => value + 1); }} className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-100">Add Risk</button></div>}
          >
            <input value={newRiskLabel} onChange={(e) => setNewRiskLabel(e.target.value)} placeholder="Risk label" className={appInputClass(isDark)} />
          </AdminFormDrawer>
          <AdminFormDrawer
            open={activeDrawer === 'blocker'}
            onClose={() => setActiveDrawer(null)}
            title="Quick Add Blocker"
            footer={<div className="flex justify-end gap-2"><button type="button" onClick={() => setActiveDrawer(null)} className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300">Cancel</button><button type="button" onClick={() => { if (!newBlockerLabel.trim()) { setMessage('Blocker label is required.', 'error'); return; } createBlocker({ projectId: project.id, label: newBlockerLabel.trim(), ownerName: project.ownerName, status: 'open' }, actorName); setNewBlockerLabel(''); setActiveDrawer(null); setRefreshTick((value) => value + 1); }} className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-100">Add Blocker</button></div>}
          >
            <input value={newBlockerLabel} onChange={(e) => setNewBlockerLabel(e.target.value)} placeholder="Blocker label" className={appInputClass(isDark)} />
          </AdminFormDrawer>
          <AdminFormDrawer
            open={activeDrawer === 'dependency'}
            onClose={() => setActiveDrawer(null)}
            title="Quick Add Dependency"
            footer={<div className="flex justify-end gap-2"><button type="button" onClick={() => setActiveDrawer(null)} className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300">Cancel</button><button type="button" onClick={() => { if (!newDependencyLabel.trim()) { setMessage('Dependency label is required.', 'error'); return; } createDependency({ projectId: project.id, label: newDependencyLabel.trim(), status: 'waiting' }, actorName); setNewDependencyLabel(''); setActiveDrawer(null); setRefreshTick((value) => value + 1); }} className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-100">Add Dependency</button></div>}
          >
            <input value={newDependencyLabel} onChange={(e) => setNewDependencyLabel(e.target.value)} placeholder="Dependency label" className={appInputClass(isDark)} />
          </AdminFormDrawer>
        </div>
      ))}

      {tab === 'financials' && withState('financials', true, (
        <div className="space-y-6">
          {proposal && (
            <div className={`rounded-xl p-4 min-w-0 ${appPanelClass(isDark)}`}>
              <h3 className="text-sm font-bold text-white mb-2">Proposal & contract</h3>
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
            <div className={`rounded-xl p-4 min-w-0 ${appPanelClass(isDark)}`}>
              <h3 className="text-xs font-bold uppercase text-zinc-500 mb-2">Budget (project)</h3>
              <p className="text-2xl font-bold text-white">${project.budget.toLocaleString()}</p>
            </div>
            <div className={`rounded-xl p-4 min-w-0 ${appPanelClass(isDark)}`}>
              <h3 className="text-xs font-bold uppercase text-zinc-500 mb-2">Open balance (invoices)</h3>
              <p className="text-2xl font-bold text-white">${openTotal.toLocaleString()}</p>
            </div>
            <div className={`rounded-xl p-4 sm:col-span-2 min-w-0 ${appPanelClass(isDark)}`}>
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
                  onClick={() => setActiveDrawer('changeOrder')}
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

          <div className={`rounded-xl overflow-x-auto min-w-0 ${appPanelClass(isDark)}`}>
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

          <div className={`rounded-xl p-4 min-w-0 ${appPanelClass(isDark)}`}>
            <h3 className="text-sm font-bold text-zinc-400 mb-2">Expenses</h3>
            <div className="mb-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setActiveDrawer('expense')}
                className="rounded-md border border-zinc-700 px-3 py-2 text-xs text-zinc-100"
              >
                Quick Add Expense
              </button>
              <button
                type="button"
                disabled={!canApproveFinance}
                onClick={() => setActiveDrawer('invoice')}
                className="rounded-md border border-zinc-700 px-3 py-2 text-xs text-zinc-100 disabled:opacity-50"
              >
                Quick Add Invoice
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
                Rough P&amp;L note: budget minus expenses (internal hours not included)
              </p>
            )}
          </div>
          <AdminFormDrawer
            open={activeDrawer === 'changeOrder'}
            onClose={() => setActiveDrawer(null)}
            title="Request Change Order"
            footer={<div className="flex justify-end gap-2"><button type="button" onClick={() => setActiveDrawer(null)} className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300">Cancel</button><button type="button" onClick={() => { try { if (!projectId) return; const amount = Number(newChangeOrderAmount || '0'); requestChangeOrder(projectId, newChangeOrderTitle.trim(), Number.isFinite(amount) ? amount : -1, user?.displayName || 'System'); setNewChangeOrderTitle(''); setNewChangeOrderAmount('0'); setActiveDrawer(null); setRefreshTick((value) => value + 1); setMessage('Change order request created.'); } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not request change order.', 'error'); } }} className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-100">Submit Request</button></div>}
          >
            <div className="space-y-2">
              <input value={newChangeOrderTitle} onChange={(e) => setNewChangeOrderTitle(e.target.value)} placeholder="Change order title" className={appInputClass(isDark)} />
              <input value={newChangeOrderAmount} onChange={(e) => setNewChangeOrderAmount(e.target.value.replace(/[^\d]/g, ''))} placeholder="Amount" className={appInputClass(isDark)} />
            </div>
          </AdminFormDrawer>
          <AdminFormDrawer
            open={activeDrawer === 'expense'}
            onClose={() => setActiveDrawer(null)}
            title="Quick Add Expense"
            footer={<div className="flex justify-end gap-2"><button type="button" onClick={() => setActiveDrawer(null)} className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300">Cancel</button><button type="button" onClick={() => { if (!newExpenseLabel.trim()) { setMessage('Expense label is required.', 'error'); return; } createExpense({ projectId: project.id, label: newExpenseLabel.trim(), amount: Number(newExpenseAmount || '0'), category: 'other', date: new Date().toISOString().slice(0, 10), }, actorName); setNewExpenseLabel(''); setNewExpenseAmount('0'); setActiveDrawer(null); setRefreshTick((value) => value + 1); setMessage('Expense added.'); }} className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-100">Add Expense</button></div>}
          >
            <div className="space-y-2">
              <input value={newExpenseLabel} onChange={(e) => setNewExpenseLabel(e.target.value)} placeholder="Expense label" className={appInputClass(isDark)} />
              <input value={newExpenseAmount} onChange={(e) => setNewExpenseAmount(e.target.value.replace(/[^\d]/g, ''))} placeholder="Amount" className={appInputClass(isDark)} />
            </div>
          </AdminFormDrawer>
          <AdminFormDrawer
            open={activeDrawer === 'invoice'}
            onClose={() => setActiveDrawer(null)}
            title="Quick Add Invoice"
            footer={<div className="flex justify-end gap-2"><button type="button" onClick={() => setActiveDrawer(null)} className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300">Cancel</button><button type="button" onClick={() => { try { createInvoice({ projectId: project.id, clientName: project.clientName, amount: Number(newInvoiceAmount || '0'), amountPaid: 0, status: 'draft', issuedDate: new Date().toISOString().slice(0, 10), dueDate: newInvoiceDueDate, }, actorName); setActiveDrawer(null); setRefreshTick((value) => value + 1); setMessage('Invoice added.'); } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not create invoice.', 'error'); } }} className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-100">Add Invoice</button></div>}
          >
            <div className="space-y-2">
              <input value={newInvoiceAmount} onChange={(e) => setNewInvoiceAmount(e.target.value.replace(/[^\d]/g, ''))} placeholder="Amount" className={appInputClass(isDark)} />
              <input type="date" value={newInvoiceDueDate} onChange={(e) => setNewInvoiceDueDate(e.target.value)} style={dateTimeInput.style} className={`${appInputClass(isDark)} ${dateTimeInput.className}`} />
            </div>
          </AdminFormDrawer>
        </div>
      ))}

      {tab === 'activity' && withState('activity', activity.length > 0, (
        <div className="space-y-3">
          <div
            className={`rounded-xl p-3 flex flex-wrap gap-2 items-center min-w-0 ${appPanelClass(isDark)}`}
          >
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

          <div
            className={`rounded-xl divide-y ${
              isDark ? 'divide-zinc-800/80' : 'divide-zinc-200'
            } min-w-0 ${appPanelClass(isDark)}`}
          >
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

      <CalendarEventSheet
        open={calendarEventOpen}
        onClose={() => setCalendarEventOpen(false)}
        projectContext={projectCalendarContext}
        initial={calendarEventInitial}
      />
    </div>
  );
};

export default AdminProjectDetail;
