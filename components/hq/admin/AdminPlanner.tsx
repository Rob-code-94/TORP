import React, { useCallback, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CalendarPlus, Share2 } from 'lucide-react';
import { getProjectById, MOCK_ADMIN_PROJECTS, MOCK_PLANNER, PLANNER_COLUMN_LABEL } from '../../../data/adminMock';
import { openGoogleCalendarInNewTab, payloadFromPlannerItem } from '../../../lib/calendarEvent';
import { useAdminTheme } from '../../../lib/adminTheme';
import { columnLabel, formatAdminDate, typeLabel } from './adminFormat';
import CalendarEventSheet from './CalendarEventSheet';
import type { CalendarProjectOption } from './CalendarEventSheet';
import PlannerCalendar from './PlannerCalendar';
import type { PlannerBoardColumn, PlannerItem } from '../../../types';

const COLUMNS: PlannerBoardColumn[] = ['queue', 'active', 'post', 'client_review', 'complete'];

type View = 'list' | 'board' | 'calendar';

const AdminPlanner: React.FC = () => {
  const { search } = useLocation();
  const { theme } = useAdminTheme();
  const isDark = theme === 'dark';
  const initialParams = useMemo(() => new URLSearchParams(search), [search]);
  const initialView = initialParams.get('view');
  const initialMode = initialParams.get('mode');
  const initialDate = initialParams.get('date');
  const [view, setView] = useState<View>(
    initialView === 'list' || initialView === 'board' || initialView === 'calendar' ? initialView : 'calendar'
  );
  const [calendarOpen, setCalendarOpen] = useState(false);
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
  const items = MOCK_PLANNER;
  const appOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const projectOptions: CalendarProjectOption[] = useMemo(
    () =>
      MOCK_ADMIN_PROJECTS.map((p) => ({
        id: p.id,
        title: p.title,
        clientName: p.clientName,
        contactEmail: p.contactEmail,
      })),
    []
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

  return (
    <div className="max-w-[1200px] min-w-0 space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between min-w-0">
        <div>
          <p className="text-xs font-mono uppercase text-zinc-500">Planner</p>
          <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>All projects — tasks &amp; deliverables</h2>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end min-w-0">
          <button
            type="button"
            onClick={openCalendarQuick}
            className="inline-flex items-center justify-center gap-1.5 rounded-md border border-zinc-600 bg-zinc-900 px-3 py-2 text-xs font-bold uppercase tracking-wide text-zinc-100 w-full sm:w-auto"
          >
            <Share2 size={14} className="shrink-0" />
            Quick add to calendar
          </button>
          <div className="flex rounded-lg border border-zinc-800 p-0.5 bg-zinc-950/80 w-full sm:w-fit min-w-0 overflow-x-auto">
            {(['calendar', 'list', 'board'] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={`px-3 py-1.5 text-xs font-bold uppercase rounded-md transition-colors shrink-0 ${
                  view === v ? 'bg-white text-black' : 'text-zinc-500 hover:text-zinc-200'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {view === 'list' && (
        <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl overflow-x-auto min-w-0">
          <table className="w-full text-sm min-w-[880px]">
            <thead className="text-xs text-zinc-500 uppercase border-b border-zinc-800 bg-zinc-950/60">
              <tr>
                <th className="text-left px-3 py-2">Task</th>
                <th className="text-left px-3 py-2">Project</th>
                <th className="text-left px-3 py-2">Type</th>
                <th className="text-left px-3 py-2">Column</th>
                <th className="text-left px-3 py-2">Assignee</th>
                <th className="text-left px-3 py-2">Due</th>
                <th className="text-left px-3 py-2">Priority</th>
                <th className="text-left px-3 py-2 whitespace-nowrap">Calendar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80">
              {items.map((t) => (
                <tr key={t.id} className="hover:bg-zinc-900/30">
                  <td className="px-3 py-2.5 text-white">
                    {t.title}
                    {t.done && <span className="ml-1 text-zinc-500 text-xs">· done</span>}
                  </td>
                  <td className="px-3 py-2.5 text-zinc-300">
                    <Link to={`/hq/admin/projects/${t.projectId}`} className="hover:underline text-zinc-200">
                      {t.projectTitle}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 text-zinc-500">{typeLabel(t.type)}</td>
                  <td className="px-3 py-2.5 text-zinc-500">{columnLabel(t.column)}</td>
                  <td className="px-3 py-2.5 text-zinc-300">{t.assigneeName}</td>
                  <td className="px-3 py-2.5 text-zinc-500 font-mono text-xs">{formatAdminDate(t.dueDate)}</td>
                  <td className="px-3 py-2.5 text-zinc-500 text-xs uppercase">{t.priority}</td>
                  <td className="px-3 py-2.5 text-zinc-500">
                    <div className="flex flex-wrap items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onAddPlannerToGoogle(t)}
                        className="inline-flex items-center gap-0.5 text-[10px] font-bold uppercase text-zinc-300 hover:text-white border border-zinc-700 rounded px-1.5 py-0.5"
                        title="Add to Google Calendar"
                      >
                        <CalendarPlus size={12} />
                        Google
                      </button>
                      <button
                        type="button"
                        onClick={() => openCalendarForItem(t)}
                        className="text-[10px] font-bold uppercase text-zinc-500 hover:text-zinc-200 underline"
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
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-3">
          {COLUMNS.map((col) => (
            <div key={col} className="bg-zinc-900/20 border border-zinc-800 rounded-xl min-h-[200px] flex flex-col">
              <div className="px-3 py-2 border-b border-zinc-800/80 text-xs font-bold text-zinc-400 uppercase">
                {PLANNER_COLUMN_LABEL[col]}
                <span className="ml-1 text-zinc-600">({board[col].length})</span>
              </div>
              <div className="p-2 space-y-2 flex-1">
                {board[col].map((t) => (
                  <div
                    key={t.id}
                    className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-2.5 text-sm min-w-0"
                  >
                    <p className="text-white font-medium leading-snug">{t.title}</p>
                    <p className="text-[10px] text-zinc-500 mt-1 truncate">{t.projectTitle}</p>
                    <p className="text-[10px] text-zinc-600 mt-0.5 font-mono">{formatAdminDate(t.dueDate)}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onAddPlannerToGoogle(t)}
                        className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase text-zinc-300 border border-zinc-700 rounded px-1 py-0.5 hover:bg-zinc-800"
                        title="Add to Google Calendar"
                      >
                        <CalendarPlus size={10} />
                        GCal
                      </button>
                      <button
                        type="button"
                        onClick={() => openCalendarForItem(t)}
                        className="text-[9px] font-bold uppercase text-zinc-500 hover:text-zinc-200"
                      >
                        Invite
                      </button>
                    </div>
                  </div>
                ))}
                {board[col].length === 0 && <p className="text-xs text-zinc-600 p-1">—</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {view === 'calendar' && (
        <PlannerCalendar
          items={items}
          onAddToGoogle={onAddPlannerToGoogle}
          onOpenCalendarSheet={openCalendarForItem}
          initialMode={initialMode === 'month' || initialMode === 'week' || initialMode === 'day' ? initialMode : undefined}
          initialCursorYmd={initialDate || undefined}
        />
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
    </div>
  );
};

export default AdminPlanner;
