import { parseHm, minutesToHm } from './timeFormat';

export type ScheduleFormType = 'shoot' | 'meeting';

export interface ScheduleEventDraft {
  title: string;
  date: string;
  time: string;
  endTime: string;
  location: string;
  description: string;
  gearSummary: string;
  participants: string[];
}

export function defaultEndTimeForSchedule(start: string, kind: ScheduleFormType): string {
  const s = parseHm(start);
  if (s == null) return kind === 'shoot' ? '16:00' : '11:00';
  const delta = kind === 'shoot' ? 8 * 60 : 60;
  return minutesToHm(s + delta);
}

export function ensureEndTimeFromStored(
  start: string,
  end: string | undefined,
  kind: ScheduleFormType,
): string {
  const sm = parseHm(start);
  const em = end ? parseHm(end) : null;
  if (sm != null && em != null && em >= sm) return end!;
  return defaultEndTimeForSchedule(start, kind);
}

export function emptyScheduleDraft(kind: ScheduleFormType, ownerCrewId: string): ScheduleEventDraft {
  const start = kind === 'shoot' ? '08:00' : '10:00';
  return {
    title: '',
    date: '',
    time: start,
    endTime: defaultEndTimeForSchedule(start, kind),
    location: '',
    description: '',
    gearSummary: '',
    participants: ownerCrewId ? [ownerCrewId] : [],
  };
}
