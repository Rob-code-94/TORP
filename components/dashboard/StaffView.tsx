import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MOCK_ADMIN_PROJECTS,
  MOCK_CREW,
  MOCK_PLANNER,
  MOCK_SHOOTS_ADMIN,
  plannerStatusFromItem,
  updatePlannerTask,
} from '../../data/adminMock';
import { updateCrew } from '../../data/adminProjectsApi';
import { useAuth } from '../../lib/auth';
import {
  buildIcsFileContent,
  downloadIcsFile,
  openGoogleCalendarInNewTab,
  payloadFromAdminShoot,
} from '../../lib/calendarEvent';
import { isShootVisibleToCrew } from '../../lib/staffShoots';
import type { AdminShoot, PlannerItem, PlannerTaskStatus } from '../../types';
import {
  CalendarPlus,
  CheckSquare,
  ClipboardList,
  Clock,
  Download,
  FileText,
  MapPin,
  User,
} from 'lucide-react';

const WEEKDAY_OPTIONS = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
] as const;

const STATUS_OPTIONS: { value: PlannerTaskStatus; label: string }[] = [
  { value: 'todo', label: 'To do' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'client_review', label: 'Client review' },
  { value: 'done', label: 'Done' },
];

function taskAssignedToCrew(task: PlannerItem, crewId: string): boolean {
  if (task.assigneeCrewIds?.includes(crewId)) return true;
  return task.assigneeCrewId === crewId;
}

function ymdToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const StaffView: React.FC = () => {
  const { user, loading } = useAuth();
  const [refresh, setRefresh] = useState(0);
  const [gearChecked, setGearChecked] = useState<Record<string, Record<string, boolean>>>({});
  const [staffMsg, setStaffMsg] = useState<string | null>(null);
  const [staffMsgTone, setStaffMsgTone] = useState<'ok' | 'error'>('ok');

  const crewId = user?.crewId ?? null;
  const crewProfile = useMemo(
    () => (crewId ? MOCK_CREW.find((c) => c.id === crewId) : undefined),
    [crewId, refresh],
  );

  const [avDraft, setAvDraft] = useState<{
    timezone: string;
    availableDays: Array<0 | 1 | 2 | 3 | 4 | 5 | 6>;
    weekdayStart: string;
    weekdayEnd: string;
    exceptionStart: string;
    exceptionEnd: string;
    availabilityNotes: string;
  } | null>(null);

  const availabilityRichness = useMemo(() => {
    if (!crewProfile) return { distinctWindows: 0, exceptions: 0 };
    const pairs = new Set(crewProfile.availabilityDetail.windows.map((w) => `${w.startTime}-${w.endTime}`));
    return { distinctWindows: pairs.size, exceptions: crewProfile.availabilityDetail.exceptions.length };
  }, [crewProfile]);
  const availabilityBlocked =
    availabilityRichness.distinctWindows > 1 || availabilityRichness.exceptions > 1;

  useEffect(() => {
    if (!crewId || !crewProfile) {
      setAvDraft(null);
      return;
    }
    setAvDraft({
      timezone: crewProfile.availabilityDetail.timezone,
      availableDays: Array.from(
        new Set(crewProfile.availabilityDetail.windows.map((w) => w.dayOfWeek)),
      ).sort() as Array<0 | 1 | 2 | 3 | 4 | 5 | 6>,
      weekdayStart: crewProfile.availabilityDetail.windows[0]?.startTime || '09:00',
      weekdayEnd: crewProfile.availabilityDetail.windows[0]?.endTime || '17:00',
      exceptionStart: crewProfile.availabilityDetail.exceptions[0]?.startDate || '',
      exceptionEnd: crewProfile.availabilityDetail.exceptions[0]?.endDate || '',
      availabilityNotes: crewProfile.availabilityDetail.notes || '',
    });
  }, [crewId, crewProfile, refresh]);

  const actorName = crewProfile?.displayName?.trim() || user?.displayName || user?.email || 'Crew';

  const bump = useCallback(() => setRefresh((n) => n + 1), []);

  const myTasks = useMemo(() => {
    if (!crewId) return [];
    return MOCK_PLANNER.filter((t) => taskAssignedToCrew(t, crewId));
  }, [crewId, refresh]);

  const myProjects = useMemo(() => {
    if (!crewId) return [];
    return MOCK_ADMIN_PROJECTS.filter(
      (p) => p.ownerCrewId === crewId || (p.assignedCrewIds || []).includes(crewId),
    );
  }, [crewId, refresh]);

  const myShoots = useMemo(() => {
    if (!crewId) return [];
    return MOCK_SHOOTS_ADMIN.filter((s) => isShootVisibleToCrew(s, crewId)).sort((a, b) =>
      a.date.localeCompare(b.date),
    );
  }, [crewId, refresh]);

  const today = ymdToday();
  const { upcomingShoots, pastShoots } = useMemo(() => {
    const up: AdminShoot[] = [];
    const past: AdminShoot[] = [];
    for (const s of myShoots) {
      if (s.date >= today) up.push(s);
      else past.push(s);
    }
    return { upcomingShoots: up, pastShoots: past };
  }, [myShoots, today]);

  const appOrigin = typeof window !== 'undefined' ? window.location.origin : '';

  const onTaskStatus = (t: PlannerItem, next: PlannerTaskStatus) => {
    if (!crewId) return;
    const ok = updatePlannerTask(t.id, { status: next }, actorName);
    if (!ok) {
      setStaffMsg('Could not update that assignment.');
      setStaffMsgTone('error');
      return;
    }
    setStaffMsg(null);
    bump();
  };

  const setGear = (shootId: string, label: string, on: boolean) => {
    setGearChecked((prev) => ({
      ...prev,
      [shootId]: { ...(prev[shootId] || {}), [label]: on },
    }));
  };

  const saveAvailability = () => {
    if (!crewId || !avDraft || !crewProfile) return;
    if (availabilityBlocked) {
      setStaffMsg('Your on-file hours use multiple windows or exceptions. HQ can adjust this so nothing is lost.');
      setStaffMsgTone('error');
      return;
    }
    if (!avDraft.availableDays.length) {
      setStaffMsg('Select at least one available weekday.');
      setStaffMsgTone('error');
      return;
    }
    const availabilityDetail = {
      timezone: avDraft.timezone,
      windows: avDraft.availableDays.map((day) => ({
        id: `window-${day}`,
        dayOfWeek: day,
        startTime: avDraft.weekdayStart,
        endTime: avDraft.weekdayEnd,
      })),
      exceptions:
        avDraft.exceptionStart && avDraft.exceptionEnd
          ? [
              {
                id: 'ex-1',
                startDate: avDraft.exceptionStart,
                endDate: avDraft.exceptionEnd,
                reason: 'Unavailable',
              },
            ]
          : [],
      notes: avDraft.availabilityNotes,
    };
    const result = updateCrew(crewId, { availabilityDetail });
    if (result.ok === false) {
      setStaffMsg(result.error);
      setStaffMsgTone('error');
      return;
    }
    setStaffMsg('Availability updated.');
    setStaffMsgTone('ok');
    bump();
  };

  const toggleDay = (day: 0 | 1 | 2 | 3 | 4 | 5 | 6) => {
    if (availabilityBlocked) return;
    setAvDraft((current) => {
      if (!current) return current;
      const next = current.availableDays.includes(day)
        ? current.availableDays.filter((d) => d !== day)
        : [...current.availableDays, day].sort();
      return { ...current, availableDays: next as Array<0 | 1 | 2 | 3 | 4 | 5 | 6> };
    });
  };

  if (loading) {
    return (
      <div className="max-w-4xl min-w-0 space-y-6" aria-busy>
        <div className="h-8 w-48 rounded bg-zinc-800/80 motion-safe:animate-pulse" />
        <div className="h-24 rounded-xl border border-zinc-800 bg-zinc-900/20 motion-safe:animate-pulse" />
        <div className="h-32 rounded-xl border border-zinc-800 bg-zinc-900/20 motion-safe:animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl min-w-0 space-y-10">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Crew home</h2>
        <p className="text-zinc-500 text-sm">Call sheets, project links, and your planner assignments in one place.</p>
      </div>

      {staffMsg && (
        <p
          className={
            staffMsgTone === 'ok' ? 'text-sm text-emerald-400' : 'text-sm text-rose-300'
          }
          role="status"
        >
          {staffMsg}
        </p>
      )}

      {!crewId && (
        <div className="rounded-xl border border-amber-900/50 bg-amber-950/30 px-4 py-3 text-sm text-amber-100/90 min-w-0">
          <p className="font-medium">No crew profile is linked to this sign-in</p>
          <p className="mt-1 text-amber-200/80">
            Use Continue as Crew on the login screen, or add a <code className="text-xs">crewId</code> custom claim for
            this account so we can show your shoots and tasks.
          </p>
        </div>
      )}

      {crewProfile && (
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5 min-w-0">
          <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3 flex items-center gap-2">
            <User size={14} /> Profile
          </h3>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 min-w-0">
            <div className="min-w-0">
              <p className="text-lg font-semibold text-white truncate">{crewProfile.displayName}</p>
              <p className="text-sm text-zinc-400 mt-1">
                Role: <span className="text-zinc-200">{crewProfile.role}</span>
                <span className="text-zinc-600 mx-2">·</span>
                <span className="text-zinc-200">{crewProfile.email}</span>
              </p>
            </div>
            <div className="text-sm text-zinc-400 shrink-0 min-w-0 max-w-sm">
              <p className="text-zinc-500 text-[11px] uppercase tracking-wide mb-1">Summary</p>
              <p className="text-zinc-300 break-words">{crewProfile.availability}</p>
            </div>
          </div>
        </section>
      )}

      {crewId && avDraft && (
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5 min-w-0">
          <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3">Availability</h3>
          {availabilityBlocked ? (
            <p className="text-sm text-amber-200/90 break-words">
              Your file has more than one working-hours window or more than one exception. Ask HQ to edit it so
              nothing is lost.
            </p>
          ) : (
            <>
              <p className="text-xs text-zinc-500 mb-3">
                You can set one daily window, optional one-off unavailability, and a short note.
              </p>
              <div className="space-y-3 min-w-0">
                <label className="block text-xs text-zinc-500">
                  Timezone
                  <input
                    value={avDraft.timezone}
                    onChange={(e) => setAvDraft((d) => (d ? { ...d, timezone: e.target.value } : d))}
                    className="mt-1 w-full min-w-0 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                  />
                </label>
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Available weekdays</p>
                  <div className="flex flex-wrap gap-2">
                    {WEEKDAY_OPTIONS.map((d) => (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() => toggleDay(d.value)}
                        className={
                          avDraft.availableDays.includes(d.value)
                            ? 'rounded-md bg-white px-2 py-1 text-xs font-medium text-zinc-900'
                            : 'rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-400'
                        }
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="text-xs text-zinc-500">
                    From
                    <input
                      type="time"
                      value={avDraft.weekdayStart}
                      onChange={(e) => setAvDraft((d) => (d ? { ...d, weekdayStart: e.target.value } : d))}
                      className="mt-1 w-full min-w-0 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="text-xs text-zinc-500">
                    To
                    <input
                      type="time"
                      value={avDraft.weekdayEnd}
                      onChange={(e) => setAvDraft((d) => (d ? { ...d, weekdayEnd: e.target.value } : d))}
                      className="mt-1 w-full min-w-0 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
                    />
                  </label>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="text-xs text-zinc-500">
                    Unavailable from (date)
                    <input
                      type="date"
                      value={avDraft.exceptionStart}
                      onChange={(e) => setAvDraft((d) => (d ? { ...d, exceptionStart: e.target.value } : d))}
                      className="mt-1 w-full min-w-0 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="text-xs text-zinc-500">
                    To
                    <input
                      type="date"
                      value={avDraft.exceptionEnd}
                      onChange={(e) => setAvDraft((d) => (d ? { ...d, exceptionEnd: e.target.value } : d))}
                      className="mt-1 w-full min-w-0 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
                    />
                  </label>
                </div>
                <label className="block text-xs text-zinc-500">
                  Note to producers
                  <textarea
                    value={avDraft.availabilityNotes}
                    onChange={(e) => setAvDraft((d) => (d ? { ...d, availabilityNotes: e.target.value } : d))}
                    rows={2}
                    className="mt-1 w-full min-w-0 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
                  />
                </label>
                <button
                  type="button"
                  onClick={saveAvailability}
                  className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-200"
                >
                  Save availability
                </button>
              </div>
            </>
          )}
        </section>
      )}

      {crewId && (
        <section className="min-w-0">
          <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3 flex items-center gap-2">
            <ClipboardList size={14} /> My assignments
          </h3>
          {myTasks.length === 0 ? (
            <p className="text-sm text-zinc-500">No planner tasks on your name yet.</p>
          ) : (
            <ul className="space-y-2">
              {myTasks.map((t) => {
                const st = plannerStatusFromItem(t);
                return (
                  <li
                    key={t.id}
                    className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-3 flex flex-col gap-3 min-w-0"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 min-w-0">
                      <div className="min-w-0">
                        <p className="font-medium text-white truncate">{t.title}</p>
                        <p className="text-xs text-zinc-500 truncate">
                          {t.projectTitle} · {t.clientName}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:shrink-0 text-xs text-zinc-400">
                        <span className="font-mono">Due {t.dueDate}</span>
                        <label className="flex items-center gap-1 text-zinc-500">
                          <span className="sr-only">Status</span>
                          <select
                            value={st}
                            onChange={(e) => onTaskStatus(t, e.target.value as PlannerTaskStatus)}
                            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-zinc-200 text-xs"
                          >
                            {STATUS_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                    </div>
                    {t.notes && <p className="text-xs text-zinc-500 break-words">{t.notes}</p>}
                    <p className="text-[10px] uppercase tracking-wide text-zinc-600">
                      Board: {t.column}
                      {t.done ? ' · complete' : ''}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {crewId && myProjects.length > 0 && (
        <section className="min-w-0">
          <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3">My projects</h3>
          <ul className="space-y-2">
            {myProjects.map((p) => (
              <li key={p.id} className="min-w-0">
                <Link
                  to={`/hq/admin/projects/${p.id}`}
                  className="text-sm text-white font-medium hover:underline break-words"
                >
                  {p.title}
                </Link>
                <span className="text-zinc-500"> — {p.clientName}</span>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-zinc-600 mt-2">
            You have read access to the project hub for your assignments.
          </p>
        </section>
      )}

      <div className="min-w-0">
        <h3 className="text-xl font-bold text-white mb-1">Call sheets</h3>
        <p className="text-zinc-500 text-sm mb-6">Shoots where you are on the team, from production scheduling.</p>

        {crewId && myShoots.length === 0 && (
          <p className="text-sm text-zinc-500">No scheduled shoots for your crew profile.</p>
        )}

        <div className="space-y-8">
          {upcomingShoots.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-emerald-500/90 mb-3">Upcoming</h4>
              <div className="space-y-6">
                {upcomingShoots.map((shoot) => (
                  <div key={shoot.id}>
                    <ShootCard
                      shoot={shoot}
                      appOrigin={appOrigin}
                      gearChecked={gearChecked[shoot.id] || {}}
                      setGear={setGear}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {pastShoots.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-600 mb-3">Earlier</h4>
              <div className="space-y-6">
                {pastShoots.map((shoot) => (
                  <div key={shoot.id}>
                    <ShootCard
                      shoot={shoot}
                      appOrigin={appOrigin}
                      gearChecked={gearChecked[shoot.id] || {}}
                      setGear={setGear}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

type ShootCardProps = {
  shoot: AdminShoot;
  appOrigin: string;
  gearChecked: Record<string, boolean>;
  setGear: (shootId: string, label: string, on: boolean) => void;
};

function ShootCard({ shoot, appOrigin, gearChecked, setGear }: ShootCardProps) {
  const payload = useMemo(
    () => (appOrigin ? payloadFromAdminShoot(shoot, appOrigin) : null),
    [shoot, appOrigin],
  );
  const gearList =
    shoot.gearItems && shoot.gearItems.length > 0
      ? shoot.gearItems
      : shoot.gearSummary
        ? [shoot.gearSummary]
        : [];

  return (
    <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl overflow-hidden min-w-0">
      <div className="p-4 sm:p-6 border-b border-zinc-800 flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 min-w-0">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <span className="bg-white text-black text-xs font-bold px-2 py-0.5 rounded uppercase shrink-0">
              Shoot
            </span>
            <h3 className="text-lg sm:text-xl font-bold text-white break-words">{shoot.title}</h3>
          </div>
          <p className="text-sm text-zinc-400 break-words">{shoot.projectTitle}</p>
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-sm text-zinc-400 mt-3 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <Clock size={16} className="shrink-0" />
              <span>
                {shoot.date} · Call {shoot.callTime}
              </span>
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <MapPin size={16} className="shrink-0" />
              <span className="break-words">{shoot.location}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2 w-full sm:w-auto sm:shrink-0 min-w-0">
          {payload && (
            <>
              <button
                type="button"
                onClick={() => openGoogleCalendarInNewTab(payload)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 hover:border-zinc-500"
              >
                <CalendarPlus size={16} />
                Add to Google Calendar
              </button>
              <button
                type="button"
                onClick={() =>
                  downloadIcsFile(
                    `torp-shoot-${shoot.id}.ics`,
                    buildIcsFileContent(payload, { uid: `torp-shoot-${shoot.id}@torp` }),
                  )
                }
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 hover:border-zinc-500"
              >
                <Download size={16} />
                Download .ics
              </button>
            </>
          )}
          <Link
            to={`/hq/staff/call-sheet/${shoot.id}/print`}
            target="_blank"
            rel="noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-200"
          >
            <FileText size={16} />
            Open print view
          </Link>
        </div>
      </div>

      <div className="p-4 sm:p-6 bg-zinc-950/30 grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 min-w-0">
        <div className="min-w-0">
          <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3 flex items-center gap-2">
            <User size={14} /> Crew
          </h4>
          <div className="flex flex-wrap gap-2">
            {shoot.crew.map((member) => (
              <div
                key={member}
                className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-3 py-2 rounded-lg min-w-0"
              >
                <div className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center text-[10px] text-white font-bold shrink-0">
                  {member.charAt(0)}
                </div>
                <span className="text-sm text-zinc-300 truncate">{member}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="min-w-0">
          <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3 flex items-center gap-2">
            <CheckSquare size={14} /> Gear
          </h4>
          {gearList.length === 0 ? (
            <p className="text-sm text-zinc-500">—</p>
          ) : (
            <ul className="space-y-2 text-sm text-zinc-300">
              {gearList.map((g) => (
                <li key={g} className="flex items-start gap-2 min-w-0 break-words">
                  <input
                    type="checkbox"
                    id={`${shoot.id}-${g}`}
                    checked={!!gearChecked[g]}
                    onChange={(e) => setGear(shoot.id, g, e.target.checked)}
                    className="mt-1 accent-white"
                  />
                  <label htmlFor={`${shoot.id}-${g}`} className="cursor-pointer">
                    {g}
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default StaffView;
