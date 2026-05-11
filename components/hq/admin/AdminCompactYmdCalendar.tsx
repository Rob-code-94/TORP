import React, { useEffect, useId, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatAdminDate } from './adminFormat';

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** Local calendar date as YYYY-MM-DD (no UTC shift). */
export function dateToYmdLocal(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function parseYmdLocal(ymd: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const day = Number(m[3]);
  const d = new Date(y, mo, day);
  if (d.getFullYear() !== y || d.getMonth() !== mo || d.getDate() !== day) return null;
  return d;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] as const;

function buildMonthCells(visibleMonth: Date): { day: Date; inMonth: boolean }[] {
  const y = visibleMonth.getFullYear();
  const m = visibleMonth.getMonth();
  const firstDow = new Date(y, m, 1).getDay();
  const cells: { day: Date; inMonth: boolean }[] = [];
  let n = 1 - firstDow;
  for (let i = 0; i < 42; i += 1) {
    const day = new Date(y, m, n);
    cells.push({ day, inMonth: day.getMonth() === m });
    n += 1;
  }
  return cells;
}

function monthTitle(d: Date): string {
  return d.toLocaleString(undefined, { month: 'long', year: 'numeric' });
}

export interface AdminCompactYmdCalendarProps {
  value: string;
  onChange: (ymd: string) => void;
  isDark: boolean;
}

/**
 * Compact single-month picker for ISO dates (YYYY-MM-DD). Keeps a hidden input
 * for the stored value; primary interaction is an inline month grid (no new deps).
 */
const AdminCompactYmdCalendar: React.FC<AdminCompactYmdCalendarProps> = ({ value, onChange, isDark }) => {
  const baseId = useId();
  const gridId = `${baseId}-grid`;
  const [visibleMonth, setVisibleMonth] = useState<Date>(() => startOfMonth(parseYmdLocal(value) ?? new Date()));

  useEffect(() => {
    const d = parseYmdLocal(value);
    if (d) setVisibleMonth(startOfMonth(d));
  }, [value]);

  const cells = useMemo(() => buildMonthCells(visibleMonth), [visibleMonth]);
  const weeks = useMemo(() => {
    const rows: { day: Date; inMonth: boolean }[][] = [];
    for (let w = 0; w < 6; w += 1) rows.push(cells.slice(w * 7, w * 7 + 7));
    return rows;
  }, [cells]);
  const todayYmd = useMemo(() => dateToYmdLocal(new Date()), []);
  const vy = visibleMonth.getFullYear();
  const vm = visibleMonth.getMonth();

  const panel = isDark
    ? 'rounded-lg border border-zinc-800 bg-zinc-900/50'
    : 'rounded-lg border border-zinc-200 bg-zinc-50';

  return (
    <fieldset className={`min-w-0 max-w-full space-y-2 ${panel} p-3`}>
      <legend className={`px-1 text-xs font-medium uppercase tracking-wide ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>
        Date
      </legend>
      <input type="hidden" name="date-ymd" value={value} readOnly aria-hidden="true" tabIndex={-1} />
      <div
        className={`flex flex-wrap items-center justify-between gap-2 text-sm ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}
        aria-live="polite"
      >
        <span className="min-w-0 truncate font-medium">{value ? formatAdminDate(value) : 'Pick a day'}</span>
      </div>
      <div className="flex items-center justify-between gap-2 min-w-0">
        <button
          type="button"
          className={`shrink-0 rounded-md border p-2 touch-manipulation ${
            isDark ? 'border-zinc-700 text-zinc-300 hover:bg-zinc-800' : 'border-zinc-300 text-zinc-700 hover:bg-zinc-100'
          }`}
          aria-label="Previous month"
          onClick={() => setVisibleMonth(new Date(vy, vm - 1, 1))}
        >
          <ChevronLeft size={18} aria-hidden />
        </button>
        <span className="min-w-0 flex-1 text-center text-sm font-semibold truncate" id={`${gridId}-label`}>
          {monthTitle(visibleMonth)}
        </span>
        <button
          type="button"
          className={`shrink-0 rounded-md border p-2 touch-manipulation ${
            isDark ? 'border-zinc-700 text-zinc-300 hover:bg-zinc-800' : 'border-zinc-300 text-zinc-700 hover:bg-zinc-100'
          }`}
          aria-label="Next month"
          onClick={() => setVisibleMonth(new Date(vy, vm + 1, 1))}
        >
          <ChevronRight size={18} aria-hidden />
        </button>
      </div>
      <div
        role="grid"
        id={gridId}
        aria-labelledby={`${gridId}-label`}
        className="w-full min-w-0 space-y-1"
      >
        <div role="row" className="grid grid-cols-7 gap-0.5 w-full min-w-0">
          {WEEKDAY_LABELS.map((wd) => (
            <div
              key={wd}
              role="columnheader"
              className="text-center text-[10px] font-semibold uppercase tracking-wide py-1 text-zinc-500"
            >
              {wd}
            </div>
          ))}
        </div>
        {weeks.map((week, wi) => (
          <div key={wi} role="row" className="grid grid-cols-7 gap-0.5 w-full min-w-0">
            {week.map(({ day, inMonth }) => {
              const ymd = dateToYmdLocal(day);
              const isSelected = value === ymd;
              const isToday = ymd === todayYmd;
              const label = day.toLocaleDateString(undefined, {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              });
              return (
                <button
                  key={ymd}
                  type="button"
                  role="gridcell"
                  aria-label={label}
                  aria-selected={isSelected}
                  tabIndex={inMonth ? 0 : -1}
                  onClick={() => {
                    onChange(ymd);
                    setVisibleMonth(startOfMonth(day));
                  }}
                  className={[
                    'min-h-10 min-w-0 rounded-md text-sm touch-manipulation',
                    !inMonth ? (isDark ? 'text-zinc-600' : 'text-zinc-400') : isDark ? 'text-zinc-200' : 'text-zinc-800',
                    isSelected
                      ? 'bg-white font-semibold text-zinc-950 shadow-sm'
                      : isDark
                        ? 'hover:bg-zinc-800/80'
                        : 'hover:bg-zinc-200/80',
                    isToday && !isSelected ? (isDark ? 'ring-1 ring-zinc-500' : 'ring-1 ring-zinc-400') : '',
                  ].join(' ')}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </fieldset>
  );
};

export default AdminCompactYmdCalendar;
