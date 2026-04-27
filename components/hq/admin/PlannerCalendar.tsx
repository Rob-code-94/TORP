import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarPlus, ChevronLeft, ChevronRight } from 'lucide-react';
import type { AdminMeeting, AdminShoot, PlannerItem } from '../../../types';
import { useAdminTheme } from '../../../lib/adminTheme';
import { columnLabel, formatAdminDate, typeLabel } from './adminFormat';
import {
  getMyCalendarFreeBusy,
  isCalendarBackendAvailable,
  type FreeBusyInterval,
} from '../../../lib/calendarIntegrations';

type CalMode = 'month' | 'week' | 'day';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function toYMD(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function parseYMD(s: string): Date {
  const [y, m, day] = s.split('-').map(Number);
  return new Date(y, m - 1, day);
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function startOfWeekSun(d: Date): Date {
  const x = new Date(d);
  const dow = x.getDay();
  x.setDate(x.getDate() - dow);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** First Sunday on or before the 1st of the month, then 42 cells. */
function buildMonthGrid(visibleMonth: Date): { date: Date; inMonth: boolean }[] {
  const y = visibleMonth.getFullYear();
  const m = visibleMonth.getMonth();
  const first = new Date(y, m, 1);
  const firstGrid = new Date(y, m, 1);
  firstGrid.setDate(1 - first.getDay());
  const cells: { date: Date; inMonth: boolean }[] = [];
  for (let i = 0; i < 42; i++) {
    const d = addDays(firstGrid, i);
    cells.push({ date: d, inMonth: d.getMonth() === m });
  }
  return cells;
}

function buildWeek(anchor: Date): Date[] {
  const s = startOfWeekSun(anchor);
  return Array.from({ length: 7 }, (_, i) => addDays(s, i));
}

function longTitle(d: Date) {
  return `${d.toLocaleDateString(undefined, { weekday: 'long' })}, ${formatAdminDate(toYMD(d))}`;
}

function monthTitle(d: Date) {
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

interface PlannerCalendarProps {
  items: PlannerItem[];
  /** Shoots to render in the day-view gutter as positioned blocks. */
  shoots?: AdminShoot[];
  /** Meetings to render in the day-view gutter as positioned blocks. */
  meetings?: AdminMeeting[];
  onAddToGoogle?: (item: PlannerItem) => void;
  onOpenCalendarSheet?: (item: PlannerItem) => void;
  /** Open the time drawer for a planner task. Use this for click + mobile entry. */
  onScheduleItem?: (item: PlannerItem) => void;
  /** Optional drag-to-reschedule. When set, gated on `canEditPlannerItem` upstream. */
  onRescheduleItem?: (
    item: PlannerItem,
    next: { dueDate: string; startTime?: string; endTime?: string; allDay?: boolean }
  ) => void;
  initialMode?: CalMode;
  initialCursorYmd?: string;
}

type GutterEventKind = 'shoot' | 'meeting' | 'task';

interface GutterEvent {
  id: string;
  kind: GutterEventKind;
  startMin: number;
  endMin: number;
  title: string;
  subtitle?: string;
  /** When set, hovering the block exposes a follow-link target. */
  href?: string;
  /** Used for drag-to-reschedule. */
  task?: PlannerItem;
}

function hmToMinutes(hm: string | undefined | null): number | null {
  if (!hm) return null;
  const [h, m] = hm.split(':').map((s) => Number.parseInt(s, 10));
  if (!Number.isFinite(h)) return null;
  const minutes = (h || 0) * 60 + (Number.isFinite(m) ? m : 0);
  if (minutes < 0 || minutes > 24 * 60) return null;
  return minutes;
}

function minutesToHm(min: number): string {
  const clamped = Math.max(0, Math.min(24 * 60 - 1, Math.round(min)));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${pad2(h)}:${pad2(m)}`;
}

function formatHourLabel(hour: number): string {
  if (hour === 0) return '12am';
  if (hour < 12) return `${hour}am`;
  if (hour === 12) return '12pm';
  return `${hour - 12}pm`;
}

function formatTimeRange(startMin: number, endMin: number): string {
  return `${formatTime(startMin)} – ${formatTime(endMin)}`;
}

function formatTime(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  const hour12 = ((h + 11) % 12) + 1;
  const ampm = h < 12 ? 'a' : 'p';
  return m === 0 ? `${hour12}${ampm}` : `${hour12}:${pad2(m)}${ampm}`;
}

const PlannerCalendar: React.FC<PlannerCalendarProps> = ({
  items,
  shoots,
  meetings,
  onAddToGoogle,
  onOpenCalendarSheet,
  onScheduleItem,
  onRescheduleItem,
  initialMode,
  initialCursorYmd,
}) => {
  const { theme } = useAdminTheme();
  const isDark = theme === 'dark';
  const [mode, setMode] = useState<CalMode>(initialMode || 'month');
  const [cursor, setCursor] = useState(() => {
    if (initialCursorYmd) return startOfDay(parseYMD(initialCursorYmd));
    if (items.length) return startOfDay(parseYMD(items[0].dueDate));
    return startOfDay(new Date());
  });

  const monthAnchor = useMemo(
    () => new Date(cursor.getFullYear(), cursor.getMonth(), 1),
    [cursor.getFullYear(), cursor.getMonth()]
  );

  function startOfDay(d: Date) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  }

  useEffect(() => {
    if (initialMode) setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    if (!initialCursorYmd) return;
    setCursor(startOfDay(parseYMD(initialCursorYmd)));
  }, [initialCursorYmd]);

  const byKey = useMemo(() => {
    const m = new Map<string, PlannerItem[]>();
    for (const t of items) {
      if (!m.has(t.dueDate)) m.set(t.dueDate, []);
      m.get(t.dueDate)!.push(t);
    }
    return m;
  }, [items]);

  const todayYMD = toYMD(startOfDay(new Date()));

  const getItemsForYmd = (ymd: string) => byKey.get(ymd) ?? [];

  /**
   * Compute the visible date window so we can request just enough free/busy.
   * Month view spans the 6×7 grid; week view spans 7 days; day view spans 1.
   */
  const { windowStartIso, windowEndIso, busyKeyDays } = useMemo(() => {
    let startMs: number;
    let endMs: number;
    if (mode === 'month') {
      const grid = buildMonthGrid(monthAnchor);
      const first = grid[0].date;
      const last = addDays(grid[grid.length - 1].date, 1);
      startMs = first.getTime();
      endMs = last.getTime();
    } else if (mode === 'week') {
      const week = buildWeek(cursor);
      startMs = week[0].getTime();
      endMs = addDays(week[6], 1).getTime();
    } else {
      const day = startOfDay(cursor);
      startMs = day.getTime();
      endMs = addDays(day, 1).getTime();
    }
    return {
      windowStartIso: new Date(startMs).toISOString(),
      windowEndIso: new Date(endMs).toISOString(),
      busyKeyDays: `${startMs}-${endMs}`,
    };
  }, [mode, monthAnchor.getTime(), cursor.getTime()]);

  const [busyIntervals, setBusyIntervals] = useState<FreeBusyInterval[]>([]);
  useEffect(() => {
    let cancelled = false;
    if (!isCalendarBackendAvailable()) {
      setBusyIntervals([]);
      return () => {
        cancelled = true;
      };
    }
    void getMyCalendarFreeBusy(windowStartIso, windowEndIso).then((result) => {
      if (cancelled) return;
      if (result.ok && result.data.available) setBusyIntervals(result.data.busy);
      else setBusyIntervals([]);
    });
    return () => {
      cancelled = true;
    };
  }, [busyKeyDays, windowStartIso, windowEndIso]);

  /** Map "yyyy-mm-dd" → number of busy minutes on that local-day. */
  const busyByDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of busyIntervals) {
      const start = new Date(b.startIso);
      const end = new Date(b.endIso);
      const day = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const dayKey = toYMD(day);
      const minutes = Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000));
      map.set(dayKey, (map.get(dayKey) ?? 0) + minutes);
    }
    return map;
  }, [busyIntervals]);

  const dayBusyForYmd = (ymd: string): { startMs: number; endMs: number }[] => {
    const dayStart = startOfDay(parseYMD(ymd)).getTime();
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;
    const out: { startMs: number; endMs: number }[] = [];
    for (const b of busyIntervals) {
      const bs = Date.parse(b.startIso);
      const be = Date.parse(b.endIso);
      if (!Number.isFinite(bs) || !Number.isFinite(be)) continue;
      if (be <= dayStart || bs >= dayEnd) continue;
      out.push({ startMs: Math.max(bs, dayStart), endMs: Math.min(be, dayEnd) });
    }
    return out;
  };

  const navPrev = () => {
    if (mode === 'month') {
      setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1));
    } else if (mode === 'week') {
      setCursor((c) => addDays(c, -7));
    } else {
      setCursor((c) => addDays(c, -1));
    }
  };

  const navNext = () => {
    if (mode === 'month') {
      setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1));
    } else if (mode === 'week') {
      setCursor((c) => addDays(c, 7));
    } else {
      setCursor((c) => addDays(c, 1));
    }
  };

  const goToday = () => setCursor(startOfDay(new Date()));

  const monthGrid = useMemo(() => buildMonthGrid(monthAnchor), [monthAnchor.getTime()]);

  const weekDays = useMemo(() => buildWeek(cursor), [toYMD(cursor)]);

  const dayRangeTitle =
    mode === 'month'
      ? monthTitle(monthAnchor)
      : mode === 'week'
        ? (() => {
            const a = weekDays[0];
            const b = weekDays[6];
            return `${formatAdminDate(toYMD(a))} – ${formatAdminDate(toYMD(b))}`;
          })()
        : longTitle(cursor);

  const cursorYmd = toYMD(startOfDay(cursor));

  /** Build positioned gutter events for the visible day from items + shoots + meetings. */
  const gutterEvents = useMemo<GutterEvent[]>(() => {
    if (mode !== 'day') return [];
    const out: GutterEvent[] = [];
    const DEFAULT_SHOOT_MIN = 8 * 60;
    const DEFAULT_MEETING_MIN = 60;
    const DEFAULT_TASK_MIN = 30;
    for (const s of shoots ?? []) {
      if (s.date !== cursorYmd) continue;
      const start = hmToMinutes(s.callTime);
      if (start == null) continue;
      const end = Math.min(24 * 60, hmToMinutes(s.endTime) ?? start + DEFAULT_SHOOT_MIN);
      out.push({
        id: `shoot:${s.id}`,
        kind: 'shoot',
        startMin: start,
        endMin: Math.max(end, start + 30),
        title: s.title,
        subtitle: s.projectTitle,
        href: `/hq/admin/projects/${s.projectId}`,
      });
    }
    for (const m of meetings ?? []) {
      if (m.date !== cursorYmd) continue;
      const start = hmToMinutes(m.startTime);
      if (start == null) continue;
      const end = Math.min(24 * 60, hmToMinutes(m.endTime) ?? start + DEFAULT_MEETING_MIN);
      out.push({
        id: `meeting:${m.id}`,
        kind: 'meeting',
        startMin: start,
        endMin: Math.max(end, start + 15),
        title: m.title,
        subtitle: m.projectTitle,
        href: `/hq/admin/projects/${m.projectId}`,
      });
    }
    for (const t of items) {
      if (t.dueDate !== cursorYmd) continue;
      if (t.allDay) continue;
      const start = hmToMinutes(t.startTime);
      if (start == null) continue;
      const end = Math.min(24 * 60, hmToMinutes(t.endTime) ?? start + DEFAULT_TASK_MIN);
      out.push({
        id: `task:${t.id}`,
        kind: 'task',
        startMin: start,
        endMin: Math.max(end, start + 15),
        title: t.title,
        subtitle: t.projectTitle,
        href: `/hq/admin/projects/${t.projectId}`,
        task: t,
      });
    }
    return out.sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);
  }, [mode, cursorYmd, items, shoots, meetings]);

  /** Hour window auto-extends around event extents and Google busy bands; clamped 6am–11pm. */
  const dayBusy = useMemo(
    () => (mode === 'day' ? dayBusyForYmd(cursorYmd) : []),
    [mode, cursorYmd, busyIntervals]
  );

  const { startHour, endHour } = useMemo(() => {
    const baseStart = 8;
    const baseEnd = 19;
    if (mode !== 'day') return { startHour: baseStart, endHour: baseEnd };
    let minMin = baseStart * 60;
    let maxMin = baseEnd * 60;
    for (const e of gutterEvents) {
      minMin = Math.min(minMin, e.startMin);
      maxMin = Math.max(maxMin, e.endMin);
    }
    for (const b of dayBusy) {
      const startOfDayMs = startOfDay(parseYMD(cursorYmd)).getTime();
      const sMin = Math.max(0, Math.round((b.startMs - startOfDayMs) / 60000));
      const eMin = Math.min(24 * 60, Math.round((b.endMs - startOfDayMs) / 60000));
      minMin = Math.min(minMin, sMin);
      maxMin = Math.max(maxMin, eMin);
    }
    return {
      startHour: Math.max(6, Math.floor(minMin / 60) - 1),
      endHour: Math.min(23, Math.ceil(maxMin / 60) + 1),
    };
  }, [mode, gutterEvents, dayBusy, cursorYmd]);

  const HOURS = useMemo(() => {
    if (mode !== 'day') return Array.from({ length: 12 }, (_, i) => 8 + i);
    const span = Math.max(1, endHour - startHour);
    return Array.from({ length: span }, (_, i) => startHour + i);
  }, [mode, startHour, endHour]);

  /** Lay out blocks in non-overlapping columns; returns a column index per event. */
  const gutterLayout = useMemo(() => {
    const map = new Map<string, { column: number; columns: number }>();
    if (gutterEvents.length === 0) return map;
    type Active = { id: string; endMin: number; column: number };
    const sorted = [...gutterEvents].sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);
    let cluster: GutterEvent[] = [];
    let active: Active[] = [];
    let clusterMaxColumns = 0;
    const flush = () => {
      for (const ev of cluster) {
        const existing = map.get(ev.id);
        if (existing) map.set(ev.id, { column: existing.column, columns: clusterMaxColumns });
      }
      cluster = [];
      clusterMaxColumns = 0;
      active = [];
    };
    for (const ev of sorted) {
      active = active.filter((a) => a.endMin > ev.startMin);
      if (active.length === 0 && cluster.length > 0) flush();
      const usedColumns = new Set(active.map((a) => a.column));
      let column = 0;
      while (usedColumns.has(column)) column += 1;
      active.push({ id: ev.id, endMin: ev.endMin, column });
      cluster.push(ev);
      clusterMaxColumns = Math.max(clusterMaxColumns, column + 1);
      map.set(ev.id, { column, columns: clusterMaxColumns });
    }
    flush();
    return map;
  }, [gutterEvents]);

  /** Now-line position. Pauses when tab is hidden so we don't wake on minute boundaries needlessly. */
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (mode !== 'day') return;
    let interval: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (interval) return;
      setNow(new Date());
      interval = setInterval(() => setNow(new Date()), 60_000);
    };
    const stop = () => {
      if (interval) clearInterval(interval);
      interval = null;
    };
    const onVisibility = () => {
      if (typeof document === 'undefined') return;
      if (document.visibilityState === 'visible') start();
      else stop();
    };
    if (typeof document === 'undefined' || document.visibilityState === 'visible') start();
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibility);
    }
    return () => {
      stop();
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibility);
      }
    };
  }, [mode]);

  const isViewingToday = cursorYmd === todayYMD;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const nowVisible =
    mode === 'day' && isViewingToday && nowMin >= startHour * 60 && nowMin <= endHour * 60;

  /** All-day strip = items dated for `cursor` with no startTime (or allDay=true). */
  const allDayItems = useMemo(() => {
    if (mode !== 'day') return [];
    return items.filter(
      (t) => t.dueDate === cursorYmd && (t.allDay || !t.startTime)
    );
  }, [mode, cursorYmd, items]);

  /** Drag-to-reschedule (desktop only). */
  const gutterRef = useRef<HTMLDivElement | null>(null);
  const [dragState, setDragState] = useState<{
    eventId: string;
    durationMin: number;
    proposedStartMin: number;
  } | null>(null);

  const beginDragTask = (ev: GutterEvent, pointerEvent: React.PointerEvent<HTMLElement>) => {
    if (!onRescheduleItem || ev.kind !== 'task' || !ev.task) return;
    if (pointerEvent.pointerType === 'touch') return;
    pointerEvent.preventDefault();
    const target = pointerEvent.currentTarget as HTMLElement;
    target.setPointerCapture?.(pointerEvent.pointerId);
    const duration = Math.max(15, ev.endMin - ev.startMin);
    setDragState({ eventId: ev.id, durationMin: duration, proposedStartMin: ev.startMin });
  };

  const updateDragFromPointer = (clientY: number) => {
    if (!dragState || !gutterRef.current) return;
    const rect = gutterRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    const totalSpan = (endHour - startHour) * 60;
    const rawMin = startHour * 60 + ratio * totalSpan;
    const snapped = Math.round(rawMin / 15) * 15;
    const clamped = Math.max(startHour * 60, Math.min(endHour * 60 - dragState.durationMin, snapped));
    setDragState((prev) => (prev ? { ...prev, proposedStartMin: clamped } : prev));
  };

  const completeDrag = () => {
    if (!dragState || !onRescheduleItem) {
      setDragState(null);
      return;
    }
    const event = gutterEvents.find((e) => e.id === dragState.eventId);
    if (!event?.task) {
      setDragState(null);
      return;
    }
    const newStart = dragState.proposedStartMin;
    const newEnd = newStart + dragState.durationMin;
    if (newStart === event.startMin && newEnd === event.endMin) {
      setDragState(null);
      return;
    }
    onRescheduleItem(event.task, {
      dueDate: event.task.dueDate,
      startTime: minutesToHm(newStart),
      endTime: minutesToHm(newEnd),
    });
    setDragState(null);
  };

  const cancelDrag = () => setDragState(null);

  return (
    <div className="space-y-4 w-full min-w-0 max-w-6xl overflow-x-hidden">
      <p className={`text-sm ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>
        Month, week, and day grids — shoots and meetings render at their call/start time. Tasks with a time appear in the day schedule; date-only tasks live on the all-day strip.
      </p>

      <div
        className={`flex flex-wrap items-center justify-between gap-2 border-b pb-3 min-w-0 ${
          isDark ? 'border-zinc-800' : 'border-zinc-200'
        }`}
      >
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={navPrev}
            className={
              isDark
                ? 'p-1.5 rounded-md border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600'
                : 'p-1.5 rounded-md border border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:border-zinc-400'
            }
            aria-label="Previous"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={navNext}
            className={
              isDark
                ? 'p-1.5 rounded-md border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600'
                : 'p-1.5 rounded-md border border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:border-zinc-400'
            }
            aria-label="Next"
          >
            <ChevronRight size={18} />
          </button>
        </div>
        <h3
          className={`text-sm font-semibold text-center flex-1 min-w-[180px] truncate px-2 ${
            isDark ? 'text-white' : 'text-zinc-900'
          }`}
        >
          {dayRangeTitle}
        </h3>
        <div className="flex items-center gap-2 shrink-0">
          <div
            className={`flex rounded-lg border p-0.5 ${
              isDark
                ? 'border-zinc-800 bg-zinc-950/80'
                : 'border-zinc-200 bg-zinc-100/80'
            }`}
          >
            {(['month', 'week', 'day'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`px-2.5 py-1.5 text-[10px] font-bold uppercase rounded-md transition-colors ${
                  mode === m
                    ? isDark
                      ? 'bg-white text-black'
                      : 'bg-zinc-900 text-white'
                    : isDark
                      ? 'text-zinc-500 hover:text-zinc-200'
                      : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={goToday}
            className={
              isDark
                ? 'text-xs font-bold text-zinc-500 hover:text-white border border-zinc-800 rounded-md px-2.5 py-1.5'
                : 'text-xs font-bold text-zinc-600 hover:text-zinc-900 border border-zinc-200 rounded-md px-2.5 py-1.5'
            }
          >
            Today
          </button>
        </div>
      </div>

      {mode === 'month' && (
        <div
          className={`border rounded-xl overflow-hidden ${
            isDark
              ? 'border-zinc-800 bg-zinc-950/40'
              : 'border-zinc-200 bg-white/90 shadow-sm'
          }`}
        >
          <div
            className={`grid grid-cols-7 border-b text-[10px] font-bold uppercase text-center py-1.5 ${
              isDark
                ? 'border-zinc-800/80 text-zinc-500 bg-zinc-900/50'
                : 'border-zinc-200 text-zinc-600 bg-zinc-100'
            }`}
          >
            {WEEKDAYS.map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 text-[10px] sm:text-xs">
            {monthGrid.map(({ date, inMonth }, idx) => {
              const ymd = toYMD(date);
              const isToday = ymd === todayYMD;
              const list = getItemsForYmd(ymd);
              return (
                <div
                  key={idx}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setMode('day');
                    setCursor(startOfDay(date));
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setMode('day');
                      setCursor(startOfDay(date));
                    }
                  }}
                  className={[
                    'min-h-[88px] sm:min-h-[100px] border-b border-r p-1 sm:p-1.5 flex flex-col gap-0.5',
                    isDark ? 'border-zinc-800/80' : 'border-zinc-200/90',
                    inMonth &&
                      (isDark
                        ? 'bg-zinc-900/20 cursor-pointer hover:bg-zinc-800/30 transition-colors'
                        : 'bg-zinc-50/90 cursor-pointer hover:bg-zinc-100/90 transition-colors'),
                    !inMonth &&
                      (isDark
                        ? 'bg-zinc-950/50 text-zinc-600 cursor-pointer hover:bg-zinc-900/40'
                        : 'bg-zinc-100/60 text-zinc-500 cursor-pointer hover:bg-zinc-200/50'),
                    idx % 7 === 6 && 'border-r-0',
                  ].filter(Boolean).join(' ')}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={[
                        'inline-flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full text-[10px] sm:text-[11px] font-mono',
                        isToday
                          ? isDark
                            ? 'bg-white text-black font-bold'
                            : 'bg-zinc-900 text-white font-bold'
                          : inMonth
                            ? isDark
                              ? 'text-zinc-200'
                              : 'text-zinc-800'
                            : 'text-zinc-600',
                      ].join(' ')}
                    >
                      {date.getDate()}
                    </span>
                    {busyByDay.has(ymd) && (
                      <span
                        title="You appear busy on Google Calendar that day"
                        className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                          isDark ? 'bg-amber-300/90' : 'bg-amber-500'
                        }`}
                        aria-hidden
                      />
                    )}
                  </div>
                  <div className="space-y-0.5 min-h-0 flex-1 overflow-hidden">
                    {list.slice(0, 3).map((t) => (
                      <div
                        key={t.id}
                        title={t.title}
                        className={
                          isDark
                            ? 'flex items-start gap-0.5 rounded border border-zinc-700/60 bg-zinc-900/80 px-0.5 py-0.5 text-zinc-200 leading-tight min-w-0'
                            : 'flex items-start gap-0.5 rounded border border-zinc-200 bg-white px-0.5 py-0.5 text-zinc-800 leading-tight min-w-0 shadow-[0_1px_0_0_rgba(24,24,27,0.04)]'
                        }
                      >
                        <span className="truncate min-w-0">
                          <span className="text-zinc-500">{t.projectTitle.split(':')[0]}</span> · {t.title}
                        </span>
                        {onAddToGoogle && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onAddToGoogle(t);
                            }}
                            className="shrink-0 p-0.5 rounded text-zinc-500 hover:text-white hover:bg-zinc-800"
                            title="Add to Google Calendar"
                            aria-label="Add to Google Calendar"
                          >
                            <CalendarPlus size={10} />
                          </button>
                        )}
                        {onOpenCalendarSheet && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenCalendarSheet(t);
                            }}
                            className="shrink-0 p-0.5 text-[9px] font-bold text-zinc-500 hover:text-zinc-200"
                            title="Invite / compose"
                          >
                            +
                          </button>
                        )}
                      </div>
                    ))}
                    {list.length > 3 && <div className="text-[9px] text-zinc-500">+{list.length - 3} more</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {mode === 'week' && (
        <div
          className={`border rounded-xl overflow-x-auto ${
            isDark ? 'border-zinc-800' : 'border-zinc-200 bg-white/90 shadow-sm'
          }`}
        >
          <div
            className={`grid grid-cols-7 min-w-[700px] ${
              isDark ? 'divide-x divide-zinc-800/80' : 'divide-x divide-zinc-200'
            }`}
          >
            {weekDays.map((d) => {
              const ymd = toYMD(d);
              const list = getItemsForYmd(ymd);
              const isToday = ymd === todayYMD;
              const busyMinutes = busyByDay.get(ymd) ?? 0;
              return (
                <div
                  key={ymd}
                  className={[
                    'min-h-[280px] flex flex-col',
                    isToday && (isDark ? 'bg-zinc-900/30' : 'bg-zinc-100/80'),
                  ].filter(Boolean).join(' ')}
                >
                  <div
                    className={[
                      'px-2 py-2 border-b text-center',
                      isDark ? 'border-zinc-800/80' : 'border-zinc-200',
                      isToday && (isDark ? 'text-white' : 'text-zinc-900'),
                      !isToday && (isDark ? 'text-zinc-400' : 'text-zinc-600'),
                    ].filter(Boolean).join(' ')}
                  >
                    <div className="text-[10px] font-bold uppercase text-zinc-500">
                      {d.toLocaleDateString(undefined, { weekday: 'short' })}
                    </div>
                    <div
                      className={`text-sm font-mono ${
                        isToday ? (isDark ? 'text-white' : 'text-zinc-900') : isDark ? 'text-zinc-300' : 'text-zinc-800'
                      }`}
                    >
                      {formatAdminDate(ymd)}
                    </div>
                    {busyMinutes > 0 && (
                      <div
                        className={`mt-1 text-[10px] font-semibold ${
                          isDark ? 'text-amber-300' : 'text-amber-700'
                        }`}
                        title="Aggregated busy time from your Google calendar."
                      >
                        Busy {Math.round(busyMinutes / 60)}h on Google
                      </div>
                    )}
                  </div>
                  <div className="p-1.5 space-y-1.5 flex-1">
                    {list.length === 0 && <p className="text-[10px] text-zinc-600 text-center py-2">—</p>}
                    {list.map((t) => (
                      <div
                        key={t.id}
                        className={
                          isDark
                            ? 'rounded-lg border border-zinc-800 bg-zinc-900/70 p-2 text-left'
                            : 'rounded-lg border border-zinc-200 bg-white p-2 text-left shadow-sm'
                        }
                      >
                        <div className="flex items-start justify-between gap-1">
                          <p
                            className={`text-xs font-medium leading-snug min-w-0 ${
                              isDark ? 'text-white' : 'text-zinc-900'
                            }`}
                          >
                            {t.title}
                          </p>
                          <div className="flex shrink-0 items-center gap-0.5">
                            {onAddToGoogle && (
                              <button
                                type="button"
                                onClick={() => onAddToGoogle(t)}
                                className="p-0.5 rounded text-zinc-500 hover:text-white hover:bg-zinc-800"
                                title="Add to Google Calendar"
                                aria-label="Add to Google Calendar"
                              >
                                <CalendarPlus size={12} />
                              </button>
                            )}
                            {onOpenCalendarSheet && (
                              <button
                                type="button"
                                onClick={() => onOpenCalendarSheet(t)}
                                className="text-[9px] font-bold text-zinc-500 px-0.5 hover:text-zinc-200"
                                title="Invite / compose"
                              >
                                +
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-[10px] text-zinc-500 mt-0.5">
                          <Link to={`/hq/admin/projects/${t.projectId}`} className="hover:underline text-zinc-400">
                            {t.projectTitle}
                          </Link>
                        </p>
                        <p className="text-[9px] text-zinc-600 mt-1">
                          {typeLabel(t.type)} · {columnLabel(t.column)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {mode === 'day' && (() => {
        const ymd = cursorYmd;
        const list = getItemsForYmd(ymd);
        const timedTaskIds = new Set(
          gutterEvents.filter((e) => e.kind === 'task').map((e) => e.task?.id).filter(Boolean) as string[]
        );
        const totalSpanMin = (endHour - startHour) * 60;
        const minutesToTopPct = (m: number) => ((m - startHour * 60) / totalSpanMin) * 100;
        const draggedEvent = dragState
          ? gutterEvents.find((e) => e.id === dragState.eventId)
          : undefined;
        const overlaysBusyBand = (s: number, e: number) =>
          dayBusy.some((b) => {
            const dayStartMs = startOfDay(parseYMD(ymd)).getTime();
            const bs = Math.round((b.startMs - dayStartMs) / 60000);
            const be = Math.round((b.endMs - dayStartMs) / 60000);
            return s < be && bs < e;
          });
        return (
          <div
            className={`border rounded-xl overflow-hidden ${
              isDark ? 'border-zinc-800' : 'border-zinc-200 bg-white/90'
            }`}
          >
            <div
              className={`flex flex-wrap items-center justify-between gap-2 px-4 py-2 border-b text-sm font-mono ${
                isDark
                  ? 'border-zinc-800/80 text-zinc-300 bg-zinc-900/30'
                  : 'border-zinc-200 text-zinc-800 bg-zinc-50'
              }`}
            >
              <span>{formatAdminDate(ymd)} · {list.length} item(s)</span>
              {gutterEvents.length > 0 && (
                <span className={`text-[10px] uppercase tracking-wide font-semibold ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
                  {gutterEvents.length} scheduled
                </span>
              )}
            </div>

            {allDayItems.length > 0 && (
              <div
                className={`px-3 py-2 border-b ${
                  isDark ? 'border-zinc-800/80 bg-zinc-900/20' : 'border-zinc-200 bg-zinc-50'
                }`}
              >
                <div className="flex items-start gap-2 min-w-0">
                  <span
                    className={`text-[9px] font-bold uppercase tracking-widest shrink-0 pt-1 ${
                      isDark ? 'text-zinc-500' : 'text-zinc-500'
                    }`}
                  >
                    All day
                  </span>
                  <div className="flex flex-wrap gap-1.5 min-w-0">
                    {allDayItems.slice(0, 6).map((t) => (
                      <Link
                        key={t.id}
                        to={`/hq/admin/projects/${t.projectId}`}
                        className={
                          isDark
                            ? 'inline-flex max-w-full items-center gap-1 rounded border border-zinc-700 bg-zinc-900/70 px-1.5 py-0.5 text-[10px] text-zinc-200 hover:border-zinc-500'
                            : 'inline-flex max-w-full items-center gap-1 rounded border border-zinc-200 bg-white px-1.5 py-0.5 text-[10px] text-zinc-800 hover:border-zinc-400 shadow-sm'
                        }
                        title={`${t.title} · ${t.projectTitle}`}
                      >
                        <span className="truncate">{t.title}</span>
                        <span className={`shrink-0 text-[9px] ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
                          · {t.projectTitle.split(':')[0]}
                        </span>
                      </Link>
                    ))}
                    {allDayItems.length > 6 && (
                      <span className={`text-[10px] ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
                        +{allDayItems.length - 6} more
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(260px,320px)]">
              <div
                className={`border-b md:border-b-0 md:border-r ${
                  isDark ? 'border-zinc-800/80' : 'border-zinc-200'
                }`}
              >
                {list.length === 0 && (
                  <p className={`p-4 text-sm ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
                    No items due on this day.
                  </p>
                )}
                <ul className={isDark ? 'divide-y divide-zinc-800/80' : 'divide-y divide-zinc-200'}>
                  {list.map((t) => {
                    const timed = timedTaskIds.has(t.id);
                    return (
                      <li key={t.id} className="p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 min-w-0">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                            <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                              {t.title}
                            </p>
                            {timed && (
                              <span
                                className={`text-[9px] font-bold uppercase tracking-wide rounded px-1 py-0.5 ${
                                  isDark
                                    ? 'border border-zinc-700 bg-zinc-900 text-zinc-300'
                                    : 'border border-zinc-300 bg-white text-zinc-700'
                                }`}
                              >
                                {t.startTime}
                                {t.endTime ? `–${t.endTime}` : ''}
                              </span>
                            )}
                            {!timed && (t.allDay || !t.startTime) && (
                              <span
                                className={`text-[9px] font-semibold uppercase tracking-wide rounded px-1 py-0.5 ${
                                  isDark ? 'text-zinc-500' : 'text-zinc-500'
                                }`}
                              >
                                All day
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-zinc-500">
                            <Link
                              to={`/hq/admin/projects/${t.projectId}`}
                              className={isDark ? 'hover:underline text-zinc-300' : 'hover:underline text-zinc-700'}
                            >
                              {t.projectTitle}
                            </Link>
                          </p>
                          <p className={`text-[10px] mt-0.5 ${isDark ? 'text-zinc-600' : 'text-zinc-500'}`}>
                            {t.assigneeName} · {t.priority}
                          </p>
                        </div>
                        <div className="flex flex-col items-start sm:items-end gap-1 shrink-0 text-left sm:text-right">
                          <div className={`text-[10px] ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
                            {typeLabel(t.type)}
                            <br />
                            {columnLabel(t.column)}
                          </div>
                          <div className="flex items-center gap-1">
                            {onScheduleItem && (
                              <button
                                type="button"
                                onClick={() => onScheduleItem(t)}
                                className={
                                  isDark
                                    ? 'rounded border border-zinc-700 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-200 hover:bg-zinc-800'
                                    : 'rounded border border-zinc-300 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-800 hover:bg-zinc-100'
                                }
                              >
                                {timed ? 'Edit time' : 'Schedule'}
                              </button>
                            )}
                            {onAddToGoogle && (
                              <button
                                type="button"
                                onClick={() => onAddToGoogle(t)}
                                className={
                                  isDark
                                    ? 'inline-flex items-center gap-0.5 rounded border border-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-300 hover:bg-zinc-800'
                                    : 'inline-flex items-center gap-0.5 rounded border border-zinc-300 px-1.5 py-0.5 text-[10px] text-zinc-700 hover:bg-zinc-100'
                                }
                              >
                                <CalendarPlus size={10} />
                                GCal
                              </button>
                            )}
                            {onOpenCalendarSheet && (
                              <button
                                type="button"
                                onClick={() => onOpenCalendarSheet(t)}
                                className={
                                  isDark
                                    ? 'rounded border border-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-300 hover:bg-zinc-800'
                                    : 'rounded border border-zinc-300 px-1.5 py-0.5 text-[10px] text-zinc-700 hover:bg-zinc-100'
                                }
                              >
                                Invite
                              </button>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className={isDark ? 'bg-zinc-950/40 p-2' : 'bg-zinc-50/60 p-2'}>
                <div className="flex items-baseline justify-between mb-1 px-1">
                  <p className={`text-[9px] font-bold uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
                    Schedule
                  </p>
                  {gutterEvents.length === 0 && (
                    <span className={`text-[9px] ${isDark ? 'text-zinc-600' : 'text-zinc-500'}`}>—</span>
                  )}
                </div>
                <div
                  ref={gutterRef}
                  className="relative"
                  onPointerMove={(e) => {
                    if (!dragState) return;
                    e.preventDefault();
                    updateDragFromPointer(e.clientY);
                  }}
                  onPointerUp={() => {
                    if (dragState) completeDrag();
                  }}
                  onPointerCancel={cancelDrag}
                >
                  <div className="space-y-0">
                    {HOURS.map((h) => (
                      <div
                        key={h}
                        className={`flex h-9 sm:h-10 text-[9px] border-b ${
                          isDark ? 'text-zinc-600 border-zinc-800/40' : 'text-zinc-500 border-zinc-200'
                        }`}
                      >
                        <div
                          className={`w-9 shrink-0 pr-1 text-right pt-0.5 ${
                            isDark ? 'text-zinc-500' : 'text-zinc-500'
                          }`}
                        >
                          {formatHourLabel(h)}
                        </div>
                        <div
                          className={`flex-1 border-l border-dashed ${
                            isDark ? 'border-zinc-800/50' : 'border-zinc-300'
                          }`}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Busy bands (Google free/busy) — clamped to visible window. */}
                  {dayBusy.map((b, i) => {
                    const dayStartMs = startOfDay(parseYMD(ymd)).getTime();
                    const sMin = Math.max(startHour * 60, Math.round((b.startMs - dayStartMs) / 60000));
                    const eMin = Math.min(endHour * 60, Math.round((b.endMs - dayStartMs) / 60000));
                    if (eMin <= sMin) return null;
                    return (
                      <div
                        key={`busy-${i}`}
                        className={`absolute left-9 right-1 rounded pointer-events-none ${
                          isDark
                            ? 'bg-amber-500/15 border border-amber-500/40'
                            : 'bg-amber-200/70 border border-amber-400'
                        }`}
                        style={{
                          top: `${minutesToTopPct(sMin)}%`,
                          height: `${((eMin - sMin) / totalSpanMin) * 100}%`,
                        }}
                        title="Busy on Google Calendar"
                        aria-hidden
                      />
                    );
                  })}

                  {/* Gutter events: shoots, meetings, timed tasks. */}
                  {gutterEvents.map((ev) => {
                    const layout = gutterLayout.get(ev.id);
                    const columns = layout?.columns ?? 1;
                    const column = layout?.column ?? 0;
                    const isDragging = dragState?.eventId === ev.id;
                    const startMin = isDragging && dragState ? dragState.proposedStartMin : ev.startMin;
                    const duration = ev.endMin - ev.startMin;
                    const endMin = startMin + duration;
                    const sClamp = Math.max(startHour * 60, startMin);
                    const eClamp = Math.min(endHour * 60, endMin);
                    if (eClamp <= sClamp) return null;
                    const topPct = minutesToTopPct(sClamp);
                    const heightPct = ((eClamp - sClamp) / totalSpanMin) * 100;
                    const widthPct = 100 / columns;
                    const leftPct = column * widthPct;
                    const conflict = ev.kind === 'task' && overlaysBusyBand(startMin, endMin);
                    const baseToneDark =
                      ev.kind === 'shoot'
                        ? 'border-zinc-500/70 bg-zinc-800/80 text-white'
                        : ev.kind === 'meeting'
                          ? 'border-zinc-400/60 bg-zinc-900 text-zinc-100'
                          : 'border-dashed border-zinc-400/70 bg-zinc-900/70 text-zinc-100';
                    const baseToneLight =
                      ev.kind === 'shoot'
                        ? 'border-zinc-700 bg-zinc-100 text-zinc-900'
                        : ev.kind === 'meeting'
                          ? 'border-zinc-400 bg-white text-zinc-900'
                          : 'border-dashed border-zinc-500 bg-white text-zinc-900';
                    const conflictTone = conflict ? (isDark ? 'ring-1 ring-amber-400/70' : 'ring-1 ring-amber-500') : '';
                    const isDraggable = ev.kind === 'task' && Boolean(onRescheduleItem);
                    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
                      if (isDraggable) beginDragTask(ev, e);
                    };
                    const handleClick = () => {
                      if (!ev.task) return;
                      if (onScheduleItem) onScheduleItem(ev.task);
                      else if (onOpenCalendarSheet) onOpenCalendarSheet(ev.task);
                    };
                    return (
                      <div
                        key={ev.id}
                        role={ev.task ? 'button' : undefined}
                        tabIndex={ev.task ? 0 : undefined}
                        onClick={ev.task ? handleClick : undefined}
                        onKeyDown={(e) => {
                          if (!ev.task) return;
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleClick();
                          }
                        }}
                        onPointerDown={handlePointerDown}
                        className={[
                          'absolute rounded-md border px-1.5 py-1 text-[10px] leading-tight overflow-hidden min-w-0',
                          isDark ? baseToneDark : baseToneLight,
                          conflictTone,
                          isDraggable ? 'cursor-grab active:cursor-grabbing select-none' : ev.task ? 'cursor-pointer' : '',
                          isDragging ? 'opacity-90 shadow-lg z-30' : 'z-10',
                        ].filter(Boolean).join(' ')}
                        style={{
                          top: `${topPct}%`,
                          height: `${Math.max(heightPct, 3)}%`,
                          left: `calc(2.25rem + (100% - 2.5rem) * ${leftPct / 100})`,
                          width: `calc((100% - 2.5rem) * ${widthPct / 100} - 2px)`,
                        }}
                        title={`${ev.title}${ev.subtitle ? ' — ' + ev.subtitle : ''} · ${formatTimeRange(startMin, endMin)}`}
                      >
                        <p className="font-semibold truncate">{ev.title}</p>
                        {ev.subtitle && (
                          <p className={`truncate ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                            {ev.subtitle}
                          </p>
                        )}
                        <p className={`text-[9px] ${isDark ? 'text-zinc-500' : 'text-zinc-500'} mt-0.5`}>
                          {formatTime(startMin)}–{formatTime(endMin)}
                          {conflict ? ' · busy' : ''}
                        </p>
                      </div>
                    );
                  })}

                  {/* Now-line (today only). */}
                  {nowVisible && (
                    <div
                      className="absolute left-9 right-1 z-40 pointer-events-none"
                      style={{ top: `${minutesToTopPct(nowMin)}%` }}
                      aria-hidden
                    >
                      <div
                        className={`absolute -left-1.5 -top-[3px] h-1.5 w-1.5 rounded-full ${
                          isDark ? 'bg-rose-400' : 'bg-rose-500'
                        }`}
                      />
                      <div
                        className={`h-[1px] ${isDark ? 'bg-rose-400/80' : 'bg-rose-500/80'}`}
                      />
                    </div>
                  )}

                  {/* Drag preview tooltip. */}
                  {dragState && draggedEvent && (
                    <div
                      className={`absolute left-9 right-1 z-50 pointer-events-none text-[9px] font-mono ${
                        isDark ? 'text-zinc-200' : 'text-zinc-900'
                      }`}
                      style={{
                        top: `calc(${minutesToTopPct(dragState.proposedStartMin)}% - 14px)`,
                      }}
                    >
                      <span className={isDark ? 'rounded bg-zinc-900 px-1 py-0.5 border border-zinc-700' : 'rounded bg-white px-1 py-0.5 border border-zinc-300 shadow-sm'}>
                        {minutesToHm(dragState.proposedStartMin)} – {minutesToHm(dragState.proposedStartMin + dragState.durationMin)}
                      </span>
                    </div>
                  )}
                </div>
                <p className={`text-[9px] mt-2 px-1 ${isDark ? 'text-zinc-600' : 'text-zinc-500'}`}>
                  {onRescheduleItem
                    ? 'Drag a task block to reschedule (15-min snap). Use the drawer on touch.'
                    : 'Open a task to set or change its time.'}
                </p>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default PlannerCalendar;
