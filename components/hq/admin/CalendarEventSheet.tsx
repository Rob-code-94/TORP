import React, { useEffect, useId, useState } from 'react';
import { X } from 'lucide-react';
import type { CalendarEventPayload } from '../../../types';
import { createMeeting, createShoot } from '../../../data/hqPlannerCalendarOps';
import { getProjectById } from '../../../data/hqOrgRead';
import {
  buildGoogleCalendarTemplateUrl,
  buildIcsFileContent,
  downloadIcsFile,
  openGoogleCalendarInNewTab,
} from '../../../lib/calendarEvent';
import { useAuth } from '../../../lib/auth';
import { adminDateTimeInputProps, useAdminTheme } from '../../../lib/adminTheme';

function parseDateInput(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

function defaultDateString(): string {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
}

function pad2Cal(n: number): string {
  return String(n).padStart(2, '0');
}

function hmToMinCal(hm: string): number | null {
  if (!hm || !/^\d{1,2}:\d{2}$/.test(hm.trim())) return null;
  const [hRaw, mRaw] = hm.trim().split(':');
  const h = Number.parseInt(hRaw, 10);
  const m = Number.parseInt(mRaw, 10);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  const t = h * 60 + m;
  if (t < 0 || t > 24 * 60) return null;
  return t;
}

function minToHmCal(min: number): string {
  const c = Math.max(0, Math.min(24 * 60 - 1, Math.round(min)));
  return `${pad2Cal(Math.floor(c / 60))}:${pad2Cal(c % 60)}`;
}

/** Same defaults as project schedule drawer / planner gutter (8h shoot, 1h meeting). */
function defaultEndHmForSheet(startHm: string, kind: 'shoot' | 'meeting'): string {
  const s = hmToMinCal(startHm);
  if (s == null) return kind === 'shoot' ? '17:00' : '11:00';
  const delta = kind === 'shoot' ? 8 * 60 : 60;
  return minToHmCal(s + delta);
}

export type CalendarProjectOption = {
  id: string;
  title: string;
  clientName: string;
  contactEmail: string;
};

export interface CalendarEventSheetProps {
  open: boolean;
  onClose: () => void;
  /** When set, schedule tab: fixed project, client email from record */
  projectContext?: CalendarProjectOption;
  /** Pre-fill title, date, time, location, description. `projectId` pairs with `projectOptions` to preselect. */
  initial?: {
    title?: string;
    dateYmd?: string;
    timeHm?: string;
    allDay?: boolean;
    location?: string;
    description?: string;
    projectId?: string;
  };
  /** Planner: show project dropdown */
  projectOptions?: CalendarProjectOption[];
  /** App base for deep links in description */
  appOrigin?: string;
}

const CalendarEventSheet: React.FC<CalendarEventSheetProps> = ({
  open,
  onClose,
  projectContext,
  initial,
  projectOptions = [],
  appOrigin = typeof window !== 'undefined' ? window.location.origin : '',
}) => {
  const { theme } = useAdminTheme();
  const { user } = useAuth();
  const actorName = user?.displayName?.trim() || user?.email || 'HQ';
  const isDark = theme === 'dark';
  const dateTimeInput = adminDateTimeInputProps(theme);
  const allDayId = useId();
  const includeClientId = useId();
  const [title, setTitle] = useState('');
  const [dateYmd, setDateYmd] = useState(defaultDateString);
  const [timeHm, setTimeHm] = useState('10:00');
  const [allDay, setAllDay] = useState(true);
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [includeClient, setIncludeClient] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [saveKind, setSaveKind] = useState<'meeting' | 'shoot'>('meeting');

  const allowPicker = !projectContext && projectOptions.length > 0;
  const selectedProject = projectContext ?? projectOptions.find((p) => p.id === selectedProjectId);
  const canIncludeClient = Boolean(selectedProject?.contactEmail?.trim());

  const buildPayload = (): CalendarEventPayload | null => {
    const t = title.trim();
    if (!t) {
      setFormError('Title is required.');
      return null;
    }
    if (!dateYmd) {
      setFormError('Date is required.');
      return null;
    }
    setFormError(null);
    let start: Date;
    if (allDay) {
      start = parseDateInput(dateYmd);
    } else {
      const [hh, mm] = (timeHm || '10:00').split(':').map((x) => parseInt(x, 10));
      start = parseDateInput(dateYmd);
      start.setHours(hh || 0, mm || 0, 0, 0);
    }
    const linkLine =
      selectedProject && appOrigin
        ? `\n\nProject: ${selectedProject.title} (${appOrigin}/hq/admin/projects/${selectedProject.id})`
        : '';
    const fullDescription = (description.trim() + linkLine).trim();
    const attendeeEmails =
      includeClient && canIncludeClient && selectedProject
        ? [selectedProject.contactEmail.trim()]
        : undefined;
    return {
      title: t,
      start,
      allDay,
      location: location.trim() || undefined,
      description: fullDescription || undefined,
      attendeeEmails,
    };
  };

  useEffect(() => {
    if (!open) return;
    setFormError(null);
    setBanner(null);
    setTitle(initial?.title ?? '');
    setDateYmd(initial?.dateYmd ?? defaultDateString());
    setTimeHm(initial?.timeHm ?? '10:00');
    setAllDay(initial?.allDay ?? true);
    setLocation(initial?.location ?? '');
    setDescription(initial?.description ?? '');
    if (projectContext) {
      setSelectedProjectId(projectContext.id);
      setIncludeClient(Boolean(projectContext.contactEmail));
    } else {
      setSelectedProjectId(initial?.projectId ?? projectOptions[0]?.id ?? '');
      setIncludeClient(false);
    }
  }, [open, projectContext, initial, projectOptions]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const fieldClass = isDark
    ? 'border-zinc-700 bg-zinc-900 text-zinc-100'
    : 'border-zinc-300 bg-white text-zinc-900';

  if (!open) return null;

  const onOpenGoogle = () => {
    const p = buildPayload();
    if (!p) return;
    openGoogleCalendarInNewTab(p);
    setBanner('Google Calendar should open in a new tab.');
  };

  const onCopyLink = async () => {
    const p = buildPayload();
    if (!p) return;
    const url = buildGoogleCalendarTemplateUrl(p);
    try {
      await navigator.clipboard.writeText(url);
      setBanner('Calendar link copied to clipboard.');
    } catch {
      setBanner('Could not copy — try again or use Open in Google Calendar.');
    }
  };

  const onDownloadIcs = () => {
    const p = buildPayload();
    if (!p) return;
    const ics = buildIcsFileContent(p, { productId: '-//TORP//Calendar//EN' });
    const safe = p.title.replace(/[^\w\s-]/g, '').slice(0, 40) || 'event';
    downloadIcsFile(`${safe}.ics`, ics);
    setBanner('.ics file download started. Open it in Apple Calendar or Outlook.');
  };

  const onEmailInvite = () => {
    const p = buildPayload();
    if (!p) return;
    const url = buildGoogleCalendarTemplateUrl(p);
    const subject = encodeURIComponent(p.title);
    const body = encodeURIComponent(
      `Add this to your calendar (opens Google Calendar):\n\n${url}\n\n${p.description ?? ''}`
    );
    const clientAddr = includeClient && canIncludeClient && selectedProject ? selectedProject.contactEmail.trim() : '';
    const href = clientAddr
      ? `mailto:${clientAddr}?subject=${subject}&body=${body}`
      : `mailto:?subject=${subject}&body=${body}`;
    window.location.href = href;
  };

  const onSaveToProjectSchedule = async () => {
    const p = buildPayload();
    if (!p) return;
    const projectId = projectContext?.id || selectedProjectId;
    if (!projectId) {
      setFormError('Select a project to save to the production schedule.');
      return;
    }
    const project = getProjectById(projectId);
    if (!project) {
      setFormError('That project was not found.');
      return;
    }
    setFormError(null);
    try {
      if (saveKind === 'meeting') {
        const startTime = p.allDay ? '10:00' : (timeHm || '10:00');
        const endTime = defaultEndHmForSheet(startTime, 'meeting');
        await createMeeting(
          {
            projectId: project.id,
            projectTitle: project.title,
            title: p.title,
            date: dateYmd,
            startTime,
            endTime,
            location: p.location || 'TBD',
            participants: [],
            description: p.description,
          },
          actorName
        );
      } else {
        const callTime = p.allDay ? '09:00' : (timeHm || '09:00');
        const endTime = defaultEndHmForSheet(callTime, 'shoot');
        await createShoot(
          {
            projectId: project.id,
            projectTitle: project.title,
            title: p.title,
            date: dateYmd,
            callTime,
            endTime,
            location: p.location || 'TBD',
            crew: [],
            gearSummary: 'Details TBD',
          },
          actorName
        );
      }
      setBanner('Saved to the project schedule. Open the project to review or adjust crew.');
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Could not save to the project schedule.');
    }
  };

  return (
    <div className="fixed inset-0 z-50">
      <button type="button" onClick={onClose} className="absolute inset-0 bg-black/70" aria-label="Close" />
      <aside
        className={`absolute right-0 top-0 h-full w-full sm:max-w-[min(100vw,560px)] min-w-0 border-l flex flex-col ${
          isDark ? 'border-zinc-800 bg-zinc-950' : 'border-zinc-300 bg-white'
        }`}
      >
        <div
          className={`sticky top-0 z-10 border-b px-4 py-4 sm:px-5 flex items-start justify-between gap-3 shrink-0 ${
            isDark ? 'border-zinc-800 bg-zinc-950/95' : 'border-zinc-300 bg-white/95'
          }`}
        >
          <div className="min-w-0">
            <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-zinc-900'}`}>Add to calendar</h3>
            <p className="text-xs text-zinc-500 mt-0.5">Create a Google Calendar draft, download .ics, or email a link</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-md border shrink-0 ${isDark ? 'border-zinc-700 text-zinc-400' : 'border-zinc-300 text-zinc-600'}`}
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto min-w-0 px-4 py-4 sm:px-5 sm:py-5">
          <div className="space-y-3 max-w-full">
            {banner && (
              <p className="text-xs text-emerald-400 border border-emerald-900/50 rounded-md px-2 py-1.5 bg-emerald-950/20">{banner}</p>
            )}
            {formError && <p className="text-xs text-red-400">{formError}</p>}

            {allowPicker && (
              <div>
                <label className="text-[11px] uppercase tracking-wide text-zinc-500">Project (optional)</label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className={`mt-1 w-full rounded-md border px-2.5 py-2 text-sm ${fieldClass}`}
                >
                  <option value="">— None —</option>
                  {projectOptions.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.title} · {o.clientName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {projectContext && (
              <p className="text-xs text-zinc-500">
                Project: <span className="text-zinc-300">{projectContext.title}</span> · {projectContext.clientName}
              </p>
            )}

            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Event title"
              className={`w-full rounded-md border px-2.5 py-2 text-sm min-w-0 ${fieldClass}`}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="date"
                value={dateYmd}
                onChange={(e) => setDateYmd(e.target.value)}
                style={dateTimeInput.style}
                className={`rounded-md border px-2.5 py-2 text-sm min-w-0 ${fieldClass} ${dateTimeInput.className}`}
              />
              {!allDay && (
                <input
                  type="time"
                  value={timeHm}
                  onChange={(e) => setTimeHm(e.target.value)}
                  style={dateTimeInput.style}
                  className={`rounded-md border px-2.5 py-2 text-sm min-w-0 ${fieldClass} ${dateTimeInput.className}`}
                />
              )}
            </div>
            <label className="flex items-center gap-2 text-xs text-zinc-300">
              <input id={allDayId} type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} />
              All day
            </label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Location or video link"
              className={`w-full rounded-md border px-2.5 py-2 text-sm min-w-0 ${fieldClass}`}
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Notes (project link is appended when a project is selected)"
              className={`w-full rounded-md border px-2.5 py-2 text-sm min-w-0 ${fieldClass}`}
            />
            {(selectedProject || projectContext) && (
              <label className="flex items-start gap-2 text-xs text-zinc-400">
                <input
                  id={includeClientId}
                  type="checkbox"
                  checked={includeClient}
                  onChange={(e) => setIncludeClient(e.target.checked)}
                  disabled={!canIncludeClient}
                />
                <span>
                  Include client on Google Calendar link ({selectedProject?.contactEmail || 'no email'}){!canIncludeClient && ' — add contact email on the project to enable.'}
                </span>
              </label>
            )}

            <div className="border border-zinc-800 rounded-md p-2.5 space-y-2">
              <p className="text-[11px] uppercase tracking-wide text-zinc-500">Save to project</p>
              <div className="flex flex-wrap gap-2 text-xs text-zinc-300">
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="saveKind"
                    checked={saveKind === 'meeting'}
                    onChange={() => setSaveKind('meeting')}
                  />
                  Meeting
                </label>
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="saveKind"
                    checked={saveKind === 'shoot'}
                    onChange={() => setSaveKind('shoot')}
                  />
                  Shoot day
                </label>
              </div>
            </div>
          </div>
        </div>

        <div
          className={`sticky bottom-0 z-10 border-t px-4 py-3 sm:px-5 shrink-0 flex flex-col gap-2 ${
            isDark ? 'border-zinc-800 bg-zinc-950/95' : 'border-zinc-300 bg-white/95'
          }`}
        >
          <button
            type="button"
            onClick={onSaveToProjectSchedule}
            className="w-full rounded-md border border-zinc-600 bg-zinc-100 text-zinc-900 px-3 py-2 text-xs font-semibold"
          >
            Save to project schedule
          </button>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onOpenGoogle}
              className="rounded-md border border-white bg-white text-black px-3 py-2 text-xs font-bold uppercase tracking-wide"
            >
              Open in Google Calendar
            </button>
            <button
              type="button"
              onClick={onCopyLink}
              className="rounded-md border border-zinc-700 px-3 py-2 text-xs text-zinc-200"
            >
              Copy link
            </button>
            <button
              type="button"
              onClick={onDownloadIcs}
              className="rounded-md border border-zinc-700 px-3 py-2 text-xs text-zinc-200"
            >
              Download .ics
            </button>
            <button
              type="button"
              onClick={onEmailInvite}
              className="rounded-md border border-zinc-700 px-3 py-2 text-xs text-zinc-200"
            >
              Email link…
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
};

export default CalendarEventSheet;
