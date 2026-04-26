import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarPlus, ChevronLeft, ChevronRight } from 'lucide-react';
import type { PlannerItem } from '../../../types';
import { columnLabel, formatAdminDate, typeLabel } from './adminFormat';

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
  onAddToGoogle?: (item: PlannerItem) => void;
  onOpenCalendarSheet?: (item: PlannerItem) => void;
  initialMode?: CalMode;
  initialCursorYmd?: string;
}

const PlannerCalendar: React.FC<PlannerCalendarProps> = ({
  items,
  onAddToGoogle,
  onOpenCalendarSheet,
  initialMode,
  initialCursorYmd,
}) => {
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

  const HOURS = useMemo(
    () => Array.from({ length: 12 }, (_, i) => 8 + i), // 8:00 – 19:00 visual slot end
    []
  );

  return (
    <div className="space-y-4 w-full min-w-0 max-w-6xl overflow-x-hidden">
      <p className="text-sm text-zinc-500">
        Month, week, and day grids — items are placed on their due date. Task times can be added in a later phase.
      </p>

      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-3 min-w-0">
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={navPrev}
            className="p-1.5 rounded-md border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600"
            aria-label="Previous"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={navNext}
            className="p-1.5 rounded-md border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600"
            aria-label="Next"
          >
            <ChevronRight size={18} />
          </button>
        </div>
        <h3 className="text-sm font-semibold text-white text-center flex-1 min-w-[180px] truncate px-2">{dayRangeTitle}</h3>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex rounded-lg border border-zinc-800 p-0.5 bg-zinc-950/80">
            {(['month', 'week', 'day'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`px-2.5 py-1.5 text-[10px] font-bold uppercase rounded-md transition-colors ${
                  mode === m ? 'bg-white text-black' : 'text-zinc-500 hover:text-zinc-200'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={goToday}
            className="text-xs font-bold text-zinc-500 hover:text-white border border-zinc-800 rounded-md px-2.5 py-1.5"
          >
            Today
          </button>
        </div>
      </div>

      {mode === 'month' && (
        <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950/40">
          <div className="grid grid-cols-7 border-b border-zinc-800/80 text-[10px] font-bold text-zinc-500 uppercase text-center py-1.5 bg-zinc-900/50">
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
                    'min-h-[88px] sm:min-h-[100px] border-b border-r border-zinc-800/80 p-1 sm:p-1.5 flex flex-col gap-0.5',
                    inMonth && 'bg-zinc-900/20 cursor-pointer hover:bg-zinc-800/30 transition-colors',
                    !inMonth && 'bg-zinc-950/50 text-zinc-600 cursor-pointer hover:bg-zinc-900/40',
                    idx % 7 === 6 && 'border-r-0',
                  ].filter(Boolean).join(' ')}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={[
                        'inline-flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full text-[10px] sm:text-[11px] font-mono',
                        isToday
                          ? 'bg-white text-black font-bold'
                          : inMonth
                            ? 'text-zinc-200'
                            : 'text-zinc-600',
                      ].join(' ')}
                    >
                      {date.getDate()}
                    </span>
                  </div>
                  <div className="space-y-0.5 min-h-0 flex-1 overflow-hidden">
                    {list.slice(0, 3).map((t) => (
                      <div
                        key={t.id}
                        title={t.title}
                        className="flex items-start gap-0.5 rounded border border-zinc-700/60 bg-zinc-900/80 px-0.5 py-0.5 text-zinc-200 leading-tight min-w-0"
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
        <div className="border border-zinc-800 rounded-xl overflow-x-auto">
          <div className="grid grid-cols-7 min-w-[700px] divide-x divide-zinc-800/80">
            {weekDays.map((d) => {
              const ymd = toYMD(d);
              const list = getItemsForYmd(ymd);
              const isToday = ymd === todayYMD;
              return (
                <div
                  key={ymd}
                  className={['min-h-[280px] flex flex-col', isToday && 'bg-zinc-900/30'].filter(Boolean).join(' ')}
                >
                  <div
                    className={[
                      'px-2 py-2 border-b border-zinc-800/80 text-center',
                      isToday && 'text-white',
                      !isToday && 'text-zinc-400',
                    ].filter(Boolean).join(' ')}
                  >
                    <div className="text-[10px] font-bold uppercase text-zinc-500">
                      {d.toLocaleDateString(undefined, { weekday: 'short' })}
                    </div>
                    <div className="text-sm font-mono text-white">{formatAdminDate(ymd)}</div>
                  </div>
                  <div className="p-1.5 space-y-1.5 flex-1">
                    {list.length === 0 && <p className="text-[10px] text-zinc-600 text-center py-2">—</p>}
                    {list.map((t) => (
                      <div
                        key={t.id}
                        className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-2 text-left"
                      >
                        <div className="flex items-start justify-between gap-1">
                          <p className="text-xs font-medium text-white leading-snug min-w-0">{t.title}</p>
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
        const ymd = toYMD(startOfDay(cursor));
        const list = getItemsForYmd(ymd);
        return (
          <div className="border border-zinc-800 rounded-xl overflow-hidden">
            <div className="px-4 py-2 border-b border-zinc-800/80 text-sm font-mono text-zinc-300 bg-zinc-900/30">
              {formatAdminDate(ymd)} · {getItemsForYmd(ymd).length} item(s)
            </div>
            <div className="grid grid-cols-1 md:grid-cols-[1fr,120px]">
              <div className="border-b md:border-b-0 md:border-r border-zinc-800/80">
                {list.length === 0 && (
                  <p className="p-4 text-sm text-zinc-500">No items due on this day.</p>
                )}
                <ul className="divide-y divide-zinc-800/80">
                  {list.map((t) => (
                    <li key={t.id} className="p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 min-w-0">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white">{t.title}</p>
                        <p className="text-xs text-zinc-500">
                          <Link to={`/hq/admin/projects/${t.projectId}`} className="hover:underline text-zinc-300">
                            {t.projectTitle}
                          </Link>
                        </p>
                        <p className="text-[10px] text-zinc-600 mt-0.5">
                          {t.assigneeName} · {t.priority}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0 text-right">
                        <div className="text-[10px] text-zinc-500">
                          {typeLabel(t.type)}
                          <br />
                          {columnLabel(t.column)}
                        </div>
                        <div className="flex items-center gap-1">
                          {onAddToGoogle && (
                            <button
                              type="button"
                              onClick={() => onAddToGoogle(t)}
                              className="inline-flex items-center gap-0.5 rounded border border-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-300 hover:bg-zinc-800"
                            >
                              <CalendarPlus size={10} />
                              GCal
                            </button>
                          )}
                          {onOpenCalendarSheet && (
                            <button
                              type="button"
                              onClick={() => onOpenCalendarSheet(t)}
                              className="rounded border border-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-300 hover:bg-zinc-800"
                            >
                              Invite
                            </button>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-zinc-950/40 p-2">
                <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1 px-1">Time (preview)</p>
                <div className="space-y-0">
                  {HOURS.map((h) => (
                    <div
                      key={h}
                      className="flex border-b border-zinc-800/40 h-9 sm:h-10 text-[9px] text-zinc-600"
                    >
                      <div className="w-8 shrink-0 pr-1 text-right text-zinc-500 pt-0.5">
                        {h > 12 ? `${h - 12}pm` : h === 12 ? '12pm' : `${h}am`}
                      </div>
                      <div className="flex-1 border-l border-dashed border-zinc-800/50" />
                    </div>
                  ))}
                </div>
                <p className="text-[9px] text-zinc-600 mt-2 px-1">
                  Tasks are date-only for now; time blocks are for layout until time-of-day is stored on each task.
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
