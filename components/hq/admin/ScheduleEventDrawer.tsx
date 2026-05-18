import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { AdminMeeting, AdminShoot, CrewProfile } from '../../../types';
import { adminDateTimeInputProps, useAdminTheme } from '../../../lib/adminTheme';
import { appInputClass } from '../../../lib/appThemeClasses';
import { projectAssignableCrew } from '../../../data/hqSchedulingGuards';
import {
  createMeeting,
  createShoot,
  updateMeeting,
  updateShoot,
} from '../../../data/hqPlannerCalendarOps';
import { formatHmRange, parseHm } from '../../../lib/timeFormat';
import {
  emptyScheduleDraft,
  ensureEndTimeFromStored,
  type ScheduleEventDraft,
  type ScheduleFormType,
} from '../../../lib/scheduleEventForm';
import AdminFormDrawer from './AdminFormDrawer';
import AdminCompactYmdCalendar from './AdminCompactYmdCalendar';
import ScheduleLocationInput from './ScheduleLocationInput';

export type { ScheduleFormType, ScheduleEventDraft };

export interface ScheduleEventDrawerProps {
  open: boolean;
  kind: ScheduleFormType;
  /** `__new__` or existing entity id */
  entityId: string;
  projectId: string;
  projectTitle: string;
  ownerCrewId: string;
  shoot?: AdminShoot | null;
  meeting?: AdminMeeting | null;
  actorName: string;
  onClose: () => void;
  onSaved: () => void;
  onMessage: (text: string, tone: 'ok' | 'error') => void;
}

function draftFromShoot(shoot: AdminShoot): ScheduleEventDraft {
  return {
    title: shoot.title,
    date: shoot.date,
    time: shoot.callTime,
    endTime: ensureEndTimeFromStored(shoot.callTime, shoot.endTime, 'shoot'),
    location: shoot.location,
    description: shoot.description || '',
    gearSummary: shoot.gearSummary || '',
    participants: shoot.crewIds ?? [],
  };
}

function draftFromMeeting(meeting: AdminMeeting): ScheduleEventDraft {
  return {
    title: meeting.title,
    date: meeting.date,
    time: meeting.startTime,
    endTime: ensureEndTimeFromStored(meeting.startTime, meeting.endTime, 'meeting'),
    location: meeting.location,
    description: meeting.description || '',
    gearSummary: '',
    participants: meeting.participantCrewIds ?? [],
  };
}

const ScheduleEventDrawer: React.FC<ScheduleEventDrawerProps> = ({
  open,
  kind: kindProp,
  entityId,
  projectId,
  projectTitle,
  ownerCrewId,
  shoot,
  meeting,
  actorName,
  onClose,
  onSaved,
  onMessage,
}) => {
  const { theme } = useAdminTheme();
  const isDark = theme === 'dark';
  const dateTimeInput = adminDateTimeInputProps(theme);
  const isNew = entityId === '__new__';
  const [kind, setKind] = useState<ScheduleFormType>(kindProp);
  const [draft, setDraft] = useState<ScheduleEventDraft>(() => emptyScheduleDraft(kindProp, ownerCrewId));

  const assignableCrew = useMemo(
    () => projectAssignableCrew(projectId) as CrewProfile[],
    [projectId],
  );

  const hydrationKey = open ? `${kindProp}:${entityId}` : null;
  const lastHydrationKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open) {
      lastHydrationKeyRef.current = null;
      return;
    }
    if (!hydrationKey || lastHydrationKeyRef.current === hydrationKey) return;
    lastHydrationKeyRef.current = hydrationKey;
    setKind(kindProp);
    if (entityId === '__new__') {
      setDraft(emptyScheduleDraft(kindProp, ownerCrewId));
      return;
    }
    if (kindProp === 'shoot' && shoot) {
      setDraft(draftFromShoot(shoot));
    } else if (kindProp === 'meeting' && meeting) {
      setDraft(draftFromMeeting(meeting));
    }
  }, [open, hydrationKey, kindProp, entityId, ownerCrewId, shoot, meeting]);

  const toggleParticipant = (crewId: string) => {
    setDraft((current) => ({
      ...current,
      participants: current.participants.includes(crewId)
        ? current.participants.filter((id) => id !== crewId)
        : [...current.participants, crewId],
    }));
  };

  const timePreview = draft.time && draft.endTime ? formatHmRange(draft.time, draft.endTime) : '';

  const handleSave = async () => {
    const startM = parseHm(draft.time);
    const endM = parseHm(draft.endTime);
    if (startM == null || endM == null) {
      onMessage('Enter valid start and end times.', 'error');
      return;
    }
    if (endM < startM) {
      onMessage('End time must be on or after start time.', 'error');
      return;
    }
    try {
      if (kind === 'shoot') {
        if (isNew) {
          await createShoot(
            {
              projectId,
              projectTitle,
              title: draft.title,
              date: draft.date,
              callTime: draft.time,
              endTime: draft.endTime,
              location: draft.location,
              gearSummary: draft.gearSummary.trim() || draft.description,
              description: draft.description,
              crew: draft.participants,
            },
            actorName,
          );
        } else {
          const sr = await updateShoot(
            entityId,
            {
              title: draft.title,
              date: draft.date,
              callTime: draft.time,
              endTime: draft.endTime,
              location: draft.location,
              gearSummary: draft.gearSummary.trim() || draft.description,
              description: draft.description,
              crew: draft.participants,
            },
            actorName,
          );
          if (!sr.ok) {
            onMessage(sr.error || 'Could not update shoot.', 'error');
            return;
          }
        }
      } else if (isNew) {
        await createMeeting(
          {
            projectId,
            projectTitle,
            title: draft.title,
            date: draft.date,
            startTime: draft.time,
            endTime: draft.endTime,
            location: draft.location,
            description: draft.description,
            participants: draft.participants,
          },
          actorName,
        );
      } else {
        const mr = await updateMeeting(
          entityId,
          {
            title: draft.title,
            date: draft.date,
            startTime: draft.time,
            endTime: draft.endTime,
            location: draft.location,
            description: draft.description,
            participants: draft.participants,
          },
          actorName,
        );
        if (!mr.ok) {
          onMessage(mr.error || 'Could not update meeting.', 'error');
          return;
        }
      }
      onSaved();
      onMessage(`${kind === 'shoot' ? 'Shoot' : 'Meeting'} ${isNew ? 'created' : 'updated'}.`, 'ok');
      onClose();
    } catch (error) {
      onMessage(error instanceof Error ? error.message : 'Could not save schedule item.', 'error');
    }
  };

  return (
    <AdminFormDrawer
      open={open}
      onClose={onClose}
      title={isNew ? 'Schedule Event' : kind === 'shoot' ? 'Edit Shoot' : 'Edit Meeting'}
      subtitle="Set timing, location, and participants"
      footer={
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-100"
          >
            {isNew ? `Create ${kind}` : `Save ${kind}`}
          </button>
        </div>
      }
    >
      <div className="space-y-3 min-w-0">
        <div className="space-y-1">
          <label className="block text-xs font-medium uppercase tracking-wide text-zinc-500">Event Type</label>
          <select
            value={kind}
            onChange={(e) => {
              const next = e.target.value as ScheduleFormType;
              setKind(next);
              setDraft((current) => {
                const start = current.time || (next === 'shoot' ? '08:00' : '10:00');
                return {
                  ...current,
                  time: start,
                  endTime: ensureEndTimeFromStored(start, current.endTime, next),
                };
              });
            }}
            disabled={!isNew}
            className={`${appInputClass(isDark)} disabled:opacity-50`}
          >
            <option value="shoot">Shoot</option>
            <option value="meeting">Meeting</option>
          </select>
        </div>
        <input
          value={draft.title}
          onChange={(e) => setDraft((c) => ({ ...c, title: e.target.value }))}
          className={appInputClass(isDark)}
          placeholder="Title"
        />
        <AdminCompactYmdCalendar
          value={draft.date}
          onChange={(date) => setDraft((c) => ({ ...c, date }))}
          isDark={isDark}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 min-w-0">
          <div className="space-y-0.5 min-w-0">
            <label className="block text-[10px] font-bold uppercase tracking-wide text-zinc-500">Start</label>
            <input
              type="time"
              value={draft.time}
              onChange={(e) => setDraft((c) => ({ ...c, time: e.target.value }))}
              style={dateTimeInput.style}
              className={`${appInputClass(isDark)} ${dateTimeInput.className} w-full`}
            />
          </div>
          <div className="space-y-0.5 min-w-0">
            <label className="block text-[10px] font-bold uppercase tracking-wide text-zinc-500">End</label>
            <input
              type="time"
              value={draft.endTime}
              onChange={(e) => setDraft((c) => ({ ...c, endTime: e.target.value }))}
              style={dateTimeInput.style}
              className={`${appInputClass(isDark)} ${dateTimeInput.className} w-full`}
            />
          </div>
        </div>
        {timePreview && <p className="text-[11px] text-zinc-500">{timePreview}</p>}
        <ScheduleLocationInput
          enabled={open}
          value={draft.location}
          onChange={(location) => setDraft((c) => ({ ...c, location }))}
          className={appInputClass(isDark)}
          placeholder="Location/Link"
        />
        <textarea
          value={draft.description}
          onChange={(e) => setDraft((c) => ({ ...c, description: e.target.value }))}
          rows={3}
          className={appInputClass(isDark)}
          placeholder="Description / context"
        />
        {kind === 'shoot' && (
          <textarea
            value={draft.gearSummary}
            onChange={(e) => setDraft((c) => ({ ...c, gearSummary: e.target.value }))}
            rows={2}
            className={appInputClass(isDark)}
            placeholder="Gear / logistics summary"
          />
        )}
        <div className="flex flex-wrap gap-2">
          {assignableCrew.map((crew) => (
            <button
              key={crew.id}
              type="button"
              onClick={() => toggleParticipant(crew.id)}
              className={`rounded-full border px-2.5 py-1 text-xs ${
                draft.participants.includes(crew.id)
                  ? 'border-white bg-white text-black'
                  : 'border-zinc-700 text-zinc-300'
              }`}
            >
              {crew.displayName}
            </button>
          ))}
        </div>
      </div>
    </AdminFormDrawer>
  );
};

export default ScheduleEventDrawer;
