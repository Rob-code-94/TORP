import React, { useEffect, useId, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import type { PlannerItem } from '../../../types';
import { adminDateTimeInputProps, useAdminTheme } from '../../../lib/adminTheme';

export interface PlannerTaskTimeDrawerProps {
  open: boolean;
  task: PlannerItem | null;
  onClose: () => void;
  onSave: (
    task: PlannerItem,
    next: { dueDate: string; startTime?: string; endTime?: string; allDay: boolean }
  ) => void;
  /** When false, inputs are disabled and a permission notice is shown. */
  canEdit?: boolean;
}

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function todayYmd(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function compareHm(a: string, b: string): number {
  const [ah, am] = a.split(':').map((s) => Number.parseInt(s, 10) || 0);
  const [bh, bm] = b.split(':').map((s) => Number.parseInt(s, 10) || 0);
  return ah * 60 + am - (bh * 60 + bm);
}

const PlannerTaskTimeDrawer: React.FC<PlannerTaskTimeDrawerProps> = ({
  open,
  task,
  onClose,
  onSave,
  canEdit = true,
}) => {
  const { theme } = useAdminTheme();
  const isDark = theme === 'dark';
  const dtInput = adminDateTimeInputProps(theme);
  const headingId = useId();

  const [dueDate, setDueDate] = useState<string>(task?.dueDate ?? todayYmd());
  const [allDay, setAllDay] = useState<boolean>(Boolean(task?.allDay) || !task?.startTime);
  const [startTime, setStartTime] = useState<string>(task?.startTime ?? '09:00');
  const [endTime, setEndTime] = useState<string>(task?.endTime ?? '09:30');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!task) return;
    setDueDate(task.dueDate);
    setAllDay(Boolean(task.allDay) || !task.startTime);
    setStartTime(task.startTime ?? '09:00');
    setEndTime(task.endTime ?? '09:30');
    setError(null);
  }, [task?.id]);

  const validationMessage = useMemo<string | null>(() => {
    if (allDay) return null;
    if (!startTime || !endTime) return 'Start and end time are required when not all-day.';
    if (compareHm(endTime, startTime) <= 0) return 'End time must be after start time.';
    return null;
  }, [allDay, startTime, endTime]);

  if (!open || !task) return null;

  const handleSave = () => {
    if (!canEdit) {
      setError('You do not have permission to edit this task.');
      return;
    }
    if (validationMessage) {
      setError(validationMessage);
      return;
    }
    onSave(task, {
      dueDate,
      startTime: allDay ? undefined : startTime,
      endTime: allDay ? undefined : endTime,
      allDay,
    });
    onClose();
  };

  const fieldClass = (disabled?: boolean) =>
    [
      'w-full rounded-md border px-2 py-1.5 text-sm',
      isDark
        ? 'border-zinc-700 bg-zinc-900 text-white placeholder-zinc-500'
        : 'border-zinc-300 bg-white text-zinc-900 placeholder-zinc-400',
      disabled ? 'opacity-50 cursor-not-allowed' : '',
    ]
      .filter(Boolean)
      .join(' ');

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-2 py-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={headingId}
      onClick={onClose}
    >
      <div
        className={`w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border shadow-xl ${
          isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`flex items-center justify-between gap-2 px-4 py-3 border-b ${
            isDark ? 'border-zinc-800' : 'border-zinc-200'
          }`}
        >
          <div className="min-w-0">
            <p className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
              Schedule task
            </p>
            <h3 id={headingId} className="text-sm font-semibold truncate">
              {task.title}
            </h3>
            <p className={`text-[11px] truncate ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
              {task.projectTitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className={`shrink-0 rounded-md p-1 ${
              isDark ? 'text-zinc-400 hover:bg-zinc-800' : 'text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-4 py-4 space-y-4">
          {!canEdit && (
            <p
              className={`rounded-md border px-3 py-2 text-xs ${
                isDark
                  ? 'border-amber-500/50 bg-amber-500/10 text-amber-200'
                  : 'border-amber-400 bg-amber-50 text-amber-900'
              }`}
            >
              You can view this task but cannot reschedule it.
            </p>
          )}

          <label className="block">
            <span className={`text-[11px] font-bold uppercase tracking-wide ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>
              Due date
            </span>
            <input
              type="date"
              value={dueDate}
              disabled={!canEdit}
              onChange={(e) => {
                setDueDate(e.target.value);
                setError(null);
              }}
              className={`${fieldClass(!canEdit)} ${dtInput.className} mt-1`}
              style={dtInput.style}
            />
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={allDay}
              disabled={!canEdit}
              onChange={(e) => {
                setAllDay(e.target.checked);
                setError(null);
              }}
              className="h-4 w-4 rounded border-zinc-400"
            />
            <span className="text-sm">All day</span>
            <span className={`text-[11px] ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
              {allDay ? 'Shown on the all-day strip' : 'Shown in the day schedule gutter'}
            </span>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className={`text-[11px] font-bold uppercase tracking-wide ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>
                Start
              </span>
              <input
                type="time"
                inputMode="numeric"
                step={60 * 5}
                value={startTime}
                disabled={allDay || !canEdit}
                onChange={(e) => {
                  setStartTime(e.target.value);
                  setError(null);
                }}
                className={`${fieldClass(allDay || !canEdit)} ${dtInput.className} mt-1`}
                style={dtInput.style}
              />
            </label>
            <label className="block">
              <span className={`text-[11px] font-bold uppercase tracking-wide ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>
                End
              </span>
              <input
                type="time"
                inputMode="numeric"
                step={60 * 5}
                value={endTime}
                disabled={allDay || !canEdit}
                onChange={(e) => {
                  setEndTime(e.target.value);
                  setError(null);
                }}
                className={`${fieldClass(allDay || !canEdit)} ${dtInput.className} mt-1`}
                style={dtInput.style}
              />
            </label>
          </div>

          {(error || validationMessage) && (
            <p
              className={`rounded-md border px-3 py-2 text-xs ${
                isDark
                  ? 'border-rose-500/50 bg-rose-500/10 text-rose-200'
                  : 'border-rose-300 bg-rose-50 text-rose-900'
              }`}
              role="alert"
            >
              {error ?? validationMessage}
            </p>
          )}
        </div>

        <div
          className={`sticky bottom-0 flex items-center justify-end gap-2 border-t px-4 py-3 ${
            isDark ? 'border-zinc-800 bg-zinc-950' : 'border-zinc-200 bg-white'
          }`}
        >
          <button
            type="button"
            onClick={onClose}
            className={`rounded-md border px-3 py-1.5 text-sm ${
              isDark
                ? 'border-zinc-700 text-zinc-200 hover:bg-zinc-900'
                : 'border-zinc-300 text-zinc-800 hover:bg-zinc-100'
            }`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canEdit || Boolean(validationMessage)}
            className={`rounded-md px-3 py-1.5 text-sm font-semibold ${
              isDark ? 'bg-white text-black disabled:opacity-50' : 'bg-zinc-900 text-white disabled:opacity-50'
            }`}
          >
            Save schedule
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlannerTaskTimeDrawer;
