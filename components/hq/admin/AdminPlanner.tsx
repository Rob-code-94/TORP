import React, { useCallback, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CalendarPlus, Share2 } from 'lucide-react';
import { PLANNER_COLUMN_LABEL } from '../../../data/hqConstants';
import { getProjectById, getAssetsByProject } from '../../../data/hqOrgRead';
import {
  attachAssetToPlannerItem,
  createProjectAsset,
  plannerStatusFromItem,
  removeAssetFromPlannerItem,
  updatePlannerTask,
} from '../../../data/hqPlannerCalendarOps';
import {
  getHqProjectDirectory,
  getMeetingsSync,
  getPlannerItemsSync,
  getShootsSync,
} from '../../../data/hqSyncDirectory';
import { useHqOrgTick } from '../HqFirestoreProvider';
import { openGoogleCalendarInNewTab, payloadFromPlannerItem } from '../../../lib/calendarEvent';
import { useAuth } from '../../../lib/auth';
import { useAdminTheme } from '../../../lib/adminTheme';
import { appLinkMutedClass, appPanelClass } from '../../../lib/appThemeClasses';
import { canEditPlannerItem } from '../../../lib/projectPermissions';
import { columnLabel, formatAdminDate, typeLabel } from './adminFormat';
import CalendarEventSheet from './CalendarEventSheet';
import type { CalendarProjectOption } from './CalendarEventSheet';
import PlannerCalendar from './PlannerCalendar';
import PlannerTaskTimeDrawer from './PlannerTaskTimeDrawer';
import type { PlannerBoardColumn, PlannerItem, PlannerTaskStatus } from '../../../types';
import { createDefaultStoragePolicy } from '../../../lib/storagePolicy';

const COLUMNS: PlannerBoardColumn[] = ['queue', 'active', 'post', 'client_review', 'complete'];

const BOARD_STATUS_OPTIONS: { value: PlannerTaskStatus; label: string }[] = [
  { value: 'todo', label: 'To do' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'client_review', label: 'Client review' },
  { value: 'done', label: 'Done' },
];

type View = 'list' | 'board' | 'calendar';

const AdminPlanner: React.FC = () => {
  const { search } = useLocation();
  const { user } = useAuth();
  const { theme } = useAdminTheme();
  const isDark = theme === 'dark';
  const actorName = user?.displayName?.trim() || user?.email || 'HQ';
  const [plannerVersion, setPlannerVersion] = useState(0);
  const hqTick = useHqOrgTick();
  const initialParams = useMemo(() => new URLSearchParams(search), [search]);
  const initialView = initialParams.get('view');
  const initialMode = initialParams.get('mode');
  const initialDate = initialParams.get('date');
  const [view, setView] = useState<View>(
    initialView === 'list' || initialView === 'board' || initialView === 'calendar' ? initialView : 'calendar'
  );
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [attachmentMessage, setAttachmentMessage] = useState<string | null>(null);
  const [scheduleTask, setScheduleTask] = useState<PlannerItem | null>(null);
  const [calendarContext, setCalendarContext] = useState<CalendarProjectOption | undefined>();
  const [calendarInitial, setCalendarInitial] = useState<{
    title?: string;
    dateYmd?: string;
    timeHm?: string;
    allDay?: boolean;
    location?: string;
    description?: string;
    projectId?: string;
  }>({});
  const appOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const projectOptions: CalendarProjectOption[] = useMemo(
    () =>
      getHqProjectDirectory().map((p) => ({
        id: p.id,
        title: p.title,
        clientName: p.clientName,
        contactEmail: p.contactEmail,
      })),
    [hqTick]
  );
  const onAddPlannerToGoogle = useCallback(
    (t: PlannerItem) => {
      if (!appOrigin) return;
      openGoogleCalendarInNewTab(payloadFromPlannerItem(t, appOrigin));
    },
    [appOrigin]
  );
  const openCalendarForItem = useCallback(
    (t: PlannerItem) => {
      const p = getProjectById(t.projectId);
      if (p) {
        setCalendarContext({ id: p.id, title: p.title, clientName: p.clientName, contactEmail: p.contactEmail });
        setCalendarInitial({
          title: t.title,
          dateYmd: t.dueDate,
          allDay: true,
          description: t.description || t.notes || '',
        });
      } else {
        setCalendarContext(undefined);
        setCalendarInitial({
          title: t.title,
          dateYmd: t.dueDate,
          allDay: true,
          description: t.description || t.notes || '',
          projectId: t.projectId,
        });
      }
      setCalendarOpen(true);
    },
    []
  );
  const openCalendarQuick = useCallback(() => {
    setCalendarContext(undefined);
    setCalendarInitial({});
    setCalendarOpen(true);
  }, []);

  const items = useMemo(() => getPlannerItemsSync(), [plannerVersion, hqTick]);
  const shootsCalendar = useMemo(() => getShootsSync(), [plannerVersion, hqTick]);
  const meetingsCalendar = useMemo(() => getMeetingsSync(), [plannerVersion, hqTick]);
  const defaultPolicy = createDefaultStoragePolicy(actorName);

  const board = useMemo(() => {
    const out: Record<PlannerBoardColumn, PlannerItem[]> = {
      queue: [],
      active: [],
      post: [],
      client_review: [],
      complete: [],
    };
    for (const t of items) {
      if (t.done) {
        out.complete.push(t);
      } else {
        out[t.column].push(t);
      }
    }
    return out;
  }, [items]);

  const onBoardStatus = useCallback(
    (task: PlannerItem, next: PlannerTaskStatus) => {
      if (updatePlannerTask(task.id, { status: next }, actorName)) {
        setPlannerVersion((n) => n + 1);
      }
    },
    [actorName]
  );

  const onRescheduleItem = useCallback(
    (
      task: PlannerItem,
      next: { dueDate: string; startTime?: string; endTime?: string; allDay?: boolean }
    ) => {
      if (!canEditPlannerItem(user?.role, task, { crewId: user?.crewId })) {
        setAttachmentMessage('You do not have permission to reschedule this task.');
        return;
      }
      const allDay = next.allDay ?? !next.startTime;
      const patch: Partial<PlannerItem> = {
        dueDate: next.dueDate,
        startTime: allDay ? undefined : next.startTime,
        endTime: allDay ? undefined : next.endTime,
        allDay,
      };
      const result = updatePlannerTask(task.id, patch, actorName);
      if (result.ok) {
        setPlannerVersion((n) => n + 1);
        setAttachmentMessage(
          `Rescheduled "${task.title}" to ${
            allDay ? 'all day' : `${next.startTime}${next.endTime ? '–' + next.endTime : ''}`
          } on ${next.dueDate}.`
        );
      }
    },
    [actorName, user?.role, user?.crewId]
  );

  const openScheduleDrawer = useCallback((task: PlannerItem) => {
    setScheduleTask(task);
  }, []);

  const onAttachExisting = (task: PlannerItem, assetId: string) => {
    const result = attachAssetToPlannerItem(task.id, assetId, actorName);
    if (result.ok) {
      setPlannerVersion((n) => n + 1);
      setAttachmentMessage('Asset attached to planner item.');
    } else {
      setAttachmentMessage(result.error || 'Could not attach asset.');
    }
  };

  const onDetachExisting = (task: PlannerItem, assetId: string) => {
    const result = removeAssetFromPlannerItem(task.id, assetId, actorName);
    if (result.ok) {
      setPlannerVersion((n) => n + 1);
      setAttachmentMessage('Attachment removed.');
    } else {
      setAttachmentMessage(result.error || 'Could not remove attachment.');
    }
  };

  const onUploadLightweight = async (task: PlannerItem, file: File | null) => {
    if (!file) return;
    const isImage = file.type.startsWith('image/');
    const isDoc = file.type.startsWith('application/') || file.type === 'text/plain';
    if (!isImage && !isDoc) {
      setAttachmentMessage('Only lightweight image or document uploads are supported here.');
      return;
    }
    const maxMb = isImage ? defaultPolicy.maxSizeByMimeGroup.imageMb : defaultPolicy.maxSizeByMimeGroup.documentMb;
    const sizeMb = file.size / (1024 * 1024);
    if (sizeMb > maxMb) {
      setAttachmentMessage(`File exceeds policy limit (${maxMb}MB).`);
      return;
    }
    const created = createProjectAsset(
      {
        projectId: task.projectId,
        label: file.name,
        version: 'v0.1',
        type: isImage ? 'still' : 'doc',
        sourceType: 'upload',
        status: 'internal',
        clientVisible: false,
        notes: 'Planner lightweight upload',
        storage: {
          filename: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
        },
      },
      actorName
    );
    const attachResult = attachAssetToPlannerItem(task.id, created.id, actorName);
    if (attachResult.ok) {
      setPlannerVersion((n) => n + 1);
      setAttachmentMessage('Lightweight attachment uploaded and linked.');
    } else {
      setAttachmentMessage(attachResult.error || 'Uploaded but could not attach file.');
    }
  };

  const canEditScheduleTask = scheduleTask
    ? canEditPlannerItem(user?.role, scheduleTask, { crewId: user?.crewId })
    : false;

  return (
    <div className="max-w-[1200px] min-w-0 space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between min-w-0" data-tour="planner-header">
        <div>
          <p className="text-xs font-mono uppercase text-zinc-500">Planner</p>
          <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>All projects — tasks &amp; deliverables</h2>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end min-w-0">
          <button
            type="button"
            onClick={openCalendarQuick}
            data-tour="planner-quick-calendar"
            className={`inline-flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-xs font-bold uppercase tracking-wide w-full sm:w-auto ${
              isDark
                ? 'border-zinc-600 bg-zinc-900 text-zinc-100 hover:bg-zinc-800'
                : 'border-zinc-900 bg-zinc-900 text-white hover:bg-zinc-800'
            }`}
          >
            <Share2 size={14} className="shrink-0" />
            Quick add to calendar
          </button>
          <div
            data-tour="planner-view-modes"
            className={`flex rounded-lg border p-0.5 w-full sm:w-fit min-w-0 overflow-x-auto ${
              isDark ? 'border-zinc-800 bg-zinc-950/80' : 'border-zinc-200 bg-zinc-100/80'
            }`}
          >
            {(['calendar', 'list', 'board'] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={`px-3 py-1.5 text-xs font-bold uppercase rounded-md transition-colors shrink-0 ${
                  view === v
                    ? isDark
                      ? 'bg-white text-black'
                      : 'bg-zinc-900 text-white'
                    : isDark
                      ? 'text-zinc-500 hover:text-zinc-200'
                      : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>
      {attachmentMessage && (
        <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>{attachmentMessage}</p>
      )}

      {view === 'list' && (
        <div className={`rounded-xl overflow-x-auto min-w-0 ${appPanelClass(isDark)}`} data-tour="planner-main-content">
          <table className="w-full text-sm min-w-[880px]">
            <thead
              className={`text-xs uppercase border-b ${
                isDark
                  ? 'text-zinc-500 border-zinc-800 bg-zinc-950/60'
                  : 'text-zinc-600 border-zinc-200 bg-zinc-100'
              }`}
            >
              <tr>
                <th className="text-left px-3 py-2">Task</th>
                <th className="text-left px-3 py-2">Project</th>
                <th className="text-left px-3 py-2">Type</th>
                <th className="text-left px-3 py-2">Column</th>
                <th className="text-left px-3 py-2">Assignee</th>
                <th className="text-left px-3 py-2">Due</th>
                <th className="text-left px-3 py-2">Priority</th>
                <th className="text-left px-3 py-2">Attachments</th>
                <th className="text-left px-3 py-2 whitespace-nowrap">Calendar</th>
              </tr>
            </thead>
            <tbody className={isDark ? 'divide-y divide-zinc-800/80' : 'divide-y divide-zinc-200'}>
              {items.map((t) => (
                <tr
                  key={t.id}
                  className={isDark ? 'hover:bg-zinc-900/20' : 'hover:bg-zinc-100/80'}
                >
                  <td
                    className={`px-3 py-2.5 ${
                      isDark ? 'text-white' : 'text-zinc-900'
                    }`}
                  >
                    {t.title}
                    {t.done && (
                      <span className="ml-1 text-zinc-500 text-xs">· done</span>
                    )}
                  </td>
                  <td
                    className={`px-3 py-2.5 ${
                      isDark ? 'text-zinc-300' : 'text-zinc-800'
                    }`}
                  >
                    <Link
                      to={`/hq/admin/projects/${t.projectId}`}
                      className={`hover:underline ${
                        isDark ? 'text-zinc-200' : 'text-zinc-800'
                      }`}
                    >
                      {t.projectTitle}
                    </Link>
                  </td>
                  <td
                    className={`px-3 py-2.5 ${
                      isDark ? 'text-zinc-500' : 'text-zinc-600'
                    }`}
                  >
                    {typeLabel(t.type)}
                  </td>
                  <td
                    className={`px-3 py-2.5 ${
                      isDark ? 'text-zinc-500' : 'text-zinc-600'
                    }`}
                  >
                    {columnLabel(t.column)}
                  </td>
                  <td
                    className={`px-3 py-2.5 ${
                      isDark ? 'text-zinc-300' : 'text-zinc-800'
                    }`}
                  >
                    {t.assigneeName}
                  </td>
                  <td
                    className={`px-3 py-2.5 font-mono text-xs ${
                      isDark ? 'text-zinc-500' : 'text-zinc-600'
                    }`}
                  >
                    {formatAdminDate(t.dueDate)}
                  </td>
                  <td
                    className={`px-3 py-2.5 text-xs uppercase ${
                      isDark ? 'text-zinc-500' : 'text-zinc-600'
                    }`}
                  >
                    {t.priority}
                  </td>
                  <td className="px-3 py-2.5 min-w-0">
                    <div className="space-y-1">
                      <div className="flex flex-wrap gap-1">
                        {(t.attachmentAssetIds || []).map((assetId) => {
                          const asset = getAssetsByProject(t.projectId).find((item) => item.id === assetId);
                          return (
                            <button
                              key={assetId}
                              type="button"
                              onClick={() => onDetachExisting(t, assetId)}
                              className={`text-[10px] rounded px-1.5 py-0.5 border ${
                                asset
                                  ? isDark
                                    ? 'border-zinc-700 text-zinc-300'
                                    : 'border-zinc-300 text-zinc-700'
                                  : 'border-rose-600 text-rose-400'
                              }`}
                              title={asset ? 'Remove attachment' : 'Stale reference. Click to remove.'}
                            >
                              {asset ? asset.label : `Stale ${assetId}`}
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <select
                          onChange={(e) => {
                            const id = e.target.value;
                            if (!id) return;
                            onAttachExisting(t, id);
                            e.currentTarget.value = '';
                          }}
                          className={
                            isDark
                              ? 'rounded border border-zinc-700 bg-zinc-900 px-1.5 py-0.5 text-[10px] text-zinc-200'
                              : 'rounded border border-zinc-300 bg-white px-1.5 py-0.5 text-[10px] text-zinc-900'
                          }
                        >
                          <option value="">Attach existing</option>
                          {getAssetsByProject(t.projectId).map((asset) => (
                            <option key={asset.id} value={asset.id}>
                              {asset.label}
                            </option>
                          ))}
                        </select>
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,.txt,image/*"
                          onChange={(e) => {
                            void onUploadLightweight(t, e.target.files?.[0] || null);
                            e.currentTarget.value = '';
                          }}
                          className="text-[10px] max-w-[180px]"
                        />
                      </div>
                    </div>
                  </td>
                  <td className={`px-3 py-2.5 ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>
                    <div className="flex flex-wrap items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onAddPlannerToGoogle(t)}
                        className={
                          isDark
                            ? 'inline-flex items-center gap-0.5 text-[10px] font-bold uppercase text-zinc-300 hover:text-white border border-zinc-700 rounded px-1.5 py-0.5'
                            : 'inline-flex items-center gap-0.5 text-[10px] font-bold uppercase text-zinc-800 hover:text-zinc-900 border border-zinc-300 bg-white rounded px-1.5 py-0.5'
                        }
                        title="Add to Google Calendar"
                      >
                        <CalendarPlus size={12} />
                        Google
                      </button>
                      <button
                        type="button"
                        onClick={() => openCalendarForItem(t)}
                        className={`text-[10px] font-bold uppercase underline ${appLinkMutedClass(isDark)}`}
                      >
                        Invite
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {view === 'board' && (
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-3 min-w-0" data-tour="planner-main-content">
          {COLUMNS.map((col) => (
            <div
              key={col}
              className={`rounded-xl min-h-[200px] flex flex-col min-w-0 ${
                isDark
                  ? 'bg-zinc-900/20 border border-zinc-800'
                  : 'bg-zinc-100/80 border border-zinc-200'
              }`}
            >
              <div
                className={`px-3 py-2 border-b text-xs font-bold uppercase ${
                  isDark
                    ? 'border-zinc-800/80 text-zinc-400'
                    : 'border-zinc-200 text-zinc-600'
                }`}
              >
                {PLANNER_COLUMN_LABEL[col]}
                <span className="ml-1 text-zinc-500">({board[col].length})</span>
              </div>
              <div className="p-2 space-y-2 flex-1 min-w-0">
                {board[col].map((t) => {
                  const st = plannerStatusFromItem(t);
                  return (
                    <div
                      key={t.id}
                      className={`rounded-lg p-2.5 text-sm min-w-0 ${
                        isDark
                          ? 'bg-zinc-900/60 border border-zinc-800'
                          : 'bg-white border border-zinc-200 shadow-[0_1px_0_0_rgba(24,24,27,0.04)]'
                      }`}
                    >
                      <p
                        className={`font-medium leading-snug ${
                          isDark ? 'text-white' : 'text-zinc-900'
                        }`}
                      >
                        {t.title}
                      </p>
                      <p className="text-[10px] text-zinc-500 mt-1 truncate">{t.projectTitle}</p>
                      <p className="text-[10px] text-zinc-600 mt-0.5 font-mono">
                        {formatAdminDate(t.dueDate)}
                      </p>
                      <label className="mt-1.5 flex items-center gap-1.5 min-w-0">
                        <span className="text-[9px] uppercase text-zinc-500 shrink-0">Status</span>
                        <select
                          value={st}
                          onChange={(e) => onBoardStatus(t, e.target.value as PlannerTaskStatus)}
                          className={
                            isDark
                              ? 'min-w-0 flex-1 rounded border border-zinc-700 bg-zinc-900 px-1 py-0.5 text-[10px] text-zinc-200'
                              : 'min-w-0 flex-1 rounded border border-zinc-300 bg-white px-1 py-0.5 text-[10px] text-zinc-900'
                          }
                        >
                          {BOARD_STATUS_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1" data-tour="planner-task-actions">
                        <button
                          type="button"
                          onClick={() => onAddPlannerToGoogle(t)}
                          className={
                            isDark
                              ? 'inline-flex items-center gap-0.5 text-[9px] font-bold uppercase text-zinc-300 border border-zinc-700 rounded px-1 py-0.5 hover:bg-zinc-800'
                              : 'inline-flex items-center gap-0.5 text-[9px] font-bold uppercase text-zinc-800 border border-zinc-300 rounded px-1 py-0.5 bg-white hover:bg-zinc-100'
                          }
                          title="Add to Google Calendar"
                        >
                          <CalendarPlus size={10} />
                          GCal
                        </button>
                        <button
                          type="button"
                          onClick={() => openCalendarForItem(t)}
                          className={`text-[9px] font-bold uppercase ${appLinkMutedClass(isDark)}`}
                        >
                          Invite
                        </button>
                      </div>
                    </div>
                  );
                })}
                {board[col].length === 0 && (
                  <p className="text-xs text-zinc-500 p-1">—</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {view === 'calendar' && (
        <div data-tour="planner-main-content">
          <PlannerCalendar
            items={items}
            shoots={shootsCalendar}
            meetings={meetingsCalendar}
            onAddToGoogle={onAddPlannerToGoogle}
            onOpenCalendarSheet={openCalendarForItem}
            onScheduleItem={openScheduleDrawer}
            onRescheduleItem={onRescheduleItem}
            initialMode={initialMode === 'month' || initialMode === 'week' || initialMode === 'day' ? initialMode : undefined}
            initialCursorYmd={initialDate || undefined}
          />
        </div>
      )}

      <CalendarEventSheet
        open={calendarOpen}
        onClose={() => {
          setCalendarOpen(false);
          setCalendarContext(undefined);
        }}
        projectContext={calendarContext}
        initial={calendarInitial}
        projectOptions={projectOptions}
      />

      <PlannerTaskTimeDrawer
        open={Boolean(scheduleTask)}
        task={scheduleTask}
        canEdit={canEditScheduleTask}
        onClose={() => setScheduleTask(null)}
        onSave={(task, next) => onRescheduleItem(task, next)}
      />
    </div>
  );
};

export default AdminPlanner;
