import type { AdminMeeting, AdminShoot, PlannerItem } from '../types';
import type { CalendarEventPayload } from '../types';

const GCAL_BASE = 'https://calendar.google.com/calendar/render';

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

/** YYYYMMDD in local time */
function toYmdLocal(d: Date): string {
  return `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}`;
}

/** YYYYMMDDTHHmmss in local time (GCal TEMPLATE) */
function toYmdThmLocal(d: Date): string {
  return `${toYmdLocal(d)}T${pad2(d.getHours())}${pad2(d.getMinutes())}${pad2(d.getSeconds())}`;
}

/**
 * Fills `end` when missing: all-day → next calendar day (exclusive end for ICS/GCal);
 * timed → +1 hour.
 */
export function withResolvedRange(payload: CalendarEventPayload): CalendarEventPayload & { end: Date } {
  const { start, allDay } = payload;
  let end = payload.end;
  if (!end) {
    if (allDay) {
      const e = new Date(start);
      e.setHours(0, 0, 0, 0);
      e.setDate(e.getDate() + 1);
      end = e;
    } else {
      end = new Date(start.getTime() + 60 * 60 * 1000);
    }
  }
  return { ...payload, end };
}

/**
 * Builds `dates` query value for GCal TEMPLATE: all-day uses YYYYMMDD/YYYYMMDD (end exclusive);
 * timed uses YYYYMMDDTHHmmss/... in local time.
 */
export function buildGoogleTemplateDatesString(payload: CalendarEventPayload): string {
  const p = withResolvedRange(payload);
  if (p.allDay) {
    const startD = new Date(p.start);
    startD.setHours(0, 0, 0, 0);
    const endExclusive = new Date(p.end);
    endExclusive.setHours(0, 0, 0, 0);
    if (endExclusive <= startD) {
      const next = new Date(startD);
      next.setDate(next.getDate() + 1);
      return `${toYmdLocal(startD)}/${toYmdLocal(next)}`;
    }
    return `${toYmdLocal(startD)}/${toYmdLocal(endExclusive)}`;
  }
  return `${toYmdThmLocal(p.start)}/${toYmdThmLocal(p.end)}`;
}

/**
 * Open-in-Google-Calendar link (no OAuth). `add` = comma-separated emails (best effort).
 * @see https://calendar.google.com/calendar/render?action=TEMPLATE&...
 */
export function buildGoogleCalendarTemplateUrl(payload: CalendarEventPayload): string {
  const p = withResolvedRange(payload);
  const params = new URLSearchParams();
  params.set('action', 'TEMPLATE');
  params.set('text', p.title);
  params.set('dates', buildGoogleTemplateDatesString(p));
  if (p.location) params.set('location', p.location);
  if (p.description) params.set('details', p.description);
  const add = p.attendeeEmails?.map((e) => e.trim()).filter(Boolean);
  if (add?.length) params.set('add', add.join(','));
  return `${GCAL_BASE}?${params.toString()}`;
}

function icsEscape(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');
}

/** All-day: local calendar date. Timed: local floating time (no Z) for import simplicity. */
function icsFormatDate(d: Date, allDay: boolean): string {
  if (allDay) {
    return toYmdLocal(d);
  }
  return toYmdThmLocal(d);
}

/** Minimal VEVENT for Apple Calendar / others (import). */
export function buildIcsFileContent(
  payload: CalendarEventPayload,
  options?: { uid?: string; productId?: string }
): string {
  const p = withResolvedRange(payload);
  const nowStamp = (() => {
    const d = new Date();
    return `${d.getUTCFullYear()}${pad2(d.getUTCMonth() + 1)}${pad2(d.getUTCDate())}T${pad2(d.getUTCHours())}${pad2(d.getUTCMinutes())}${pad2(d.getUTCSeconds())}Z`;
  })();
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${options?.productId ?? '-//TORP//Calendar Export//EN'}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${options?.uid ?? `torp-${Date.now()}-${Math.random().toString(36).slice(2, 11)}@torp`}`,
    `DTSTAMP:${nowStamp}`,
  ];

  if (p.allDay) {
    const sd = new Date(p.start);
    sd.setHours(0, 0, 0, 0);
    const endExclusive = new Date(sd);
    endExclusive.setDate(endExclusive.getDate() + 1);
    if (p.end.getTime() > sd.getTime()) {
      const ed = new Date(p.end);
      ed.setHours(0, 0, 0, 0);
      lines.push(`DTSTART;VALUE=DATE:${toYmdLocal(sd)}`);
      lines.push(`DTEND;VALUE=DATE:${toYmdLocal(ed)}`);
    } else {
      lines.push(`DTSTART;VALUE=DATE:${toYmdLocal(sd)}`);
      lines.push(`DTEND;VALUE=DATE:${toYmdLocal(endExclusive)}`);
    }
  } else {
    lines.push(`DTSTART:${icsFormatDate(p.start, false)}`);
    lines.push(`DTEND:${icsFormatDate(p.end, false)}`);
  }

  lines.push(`SUMMARY:${icsEscape(p.title)}`);
  if (p.location) lines.push(`LOCATION:${icsEscape(p.location)}`);
  if (p.description) lines.push(`DESCRIPTION:${icsEscape(p.description)}`);
  if (p.attendeeEmails?.length) {
    for (const email of p.attendeeEmails) {
      const e = email.trim();
      if (e) lines.push(`ATTENDEE;RSVP=TRUE:mailto:${e}`);
    }
  }
  lines.push('END:VEVENT', 'END:VCALENDAR');
  return lines.join('\r\n');
}

/** Trigger a browser download of a .ics file. */
export function downloadIcsFile(filename: string, ics: string) {
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.ics') ? filename : `${filename}.ics`;
  a.rel = 'noopener';
  a.click();
  URL.revokeObjectURL(url);
}

export function openGoogleCalendarInNewTab(payload: CalendarEventPayload) {
  const url = buildGoogleCalendarTemplateUrl(payload);
  window.open(url, '_blank', 'noopener,noreferrer');
}

function parseYmd(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

function combineDateAndTime(ymd: string, timeHm: string): Date {
  const d = parseYmd(ymd);
  const [h, m] = timeHm.split(':').map((x) => parseInt(x, 10));
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}

/**
 * Calendar payload for a planner task.
 * - If `startTime` is set and `allDay` is not true, emit a timed event with
 *   `endTime` (defaults to startTime + 30 minutes when omitted).
 * - Otherwise, emit an all-day event on the task's due date.
 */
export function payloadFromPlannerItem(item: PlannerItem, appOrigin: string): CalendarEventPayload {
  const projectUrl = `${appOrigin}/hq/admin/projects/${item.projectId}`;
  const description = [item.projectTitle, item.clientName, item.type && `Type: ${item.type}`, `TORP: ${projectUrl}`]
    .filter(Boolean)
    .join('\n');
  const isTimed = !item.allDay && Boolean(item.startTime);
  if (isTimed && item.startTime) {
    const start = combineDateAndTime(item.dueDate, item.startTime);
    const end = item.endTime
      ? combineDateAndTime(item.dueDate, item.endTime)
      : new Date(start.getTime() + 30 * 60 * 1000);
    return {
      title: item.title,
      start,
      allDay: false,
      end,
      description,
    };
  }
  const start = parseYmd(item.dueDate);
  return {
    title: item.title,
    start,
    allDay: true,
    description,
  };
}

export function payloadFromAdminShoot(
  s: AdminShoot,
  appOrigin: string
): CalendarEventPayload {
  const start = combineDateAndTime(s.date, s.callTime);
  return {
    title: s.title,
    start,
    allDay: false,
    end: new Date(start.getTime() + 4 * 60 * 60 * 1000),
    location: s.location,
    description: [s.projectTitle, s.description, s.gearSummary, `${appOrigin}/hq/admin/projects/${s.projectId}`]
      .filter(Boolean)
      .join('\n'),
  };
}

export function payloadFromAdminMeeting(
  m: AdminMeeting,
  appOrigin: string
): CalendarEventPayload {
  const start = combineDateAndTime(m.date, m.startTime);
  return {
    title: m.title,
    start,
    allDay: false,
    end: new Date(start.getTime() + 60 * 60 * 1000),
    location: m.location,
    description: [m.projectTitle, m.description, m.participants.join(', '), `${appOrigin}/hq/admin/projects/${m.projectId}`]
      .filter(Boolean)
      .join('\n'),
  };
}
