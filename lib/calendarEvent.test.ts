import { describe, expect, it } from 'vitest';
import {
  buildGoogleCalendarTemplateUrl,
  buildGoogleTemplateDatesString,
  buildIcsFileContent,
  payloadFromPlannerItem,
  withResolvedRange,
} from './calendarEvent';
import type { PlannerItem } from '../types';

describe('withResolvedRange', () => {
  it('adds 1h end when timed and no end', () => {
    const start = new Date(2025, 3, 10, 14, 0, 0);
    const p = withResolvedRange({ title: 't', start, allDay: false });
    expect(p.end.getTime() - p.start.getTime()).toBe(60 * 60 * 1000);
  });

  it('adds next day for all-day when no end', () => {
    const start = new Date(2025, 3, 10, 0, 0, 0);
    const p = withResolvedRange({ title: 't', start, allDay: true });
    expect(p.end.getDate()).toBe(11);
  });
});

describe('buildGoogleTemplateDatesString', () => {
  it('uses local timed range', () => {
    const start = new Date(2025, 3, 10, 9, 0, 0);
    const s = buildGoogleTemplateDatesString({ title: 't', start, allDay: false });
    expect(s).toMatch(/20250410T090000\/20250410T100000/);
  });

  it('uses all-day range (end date exclusive in GCal)', () => {
    const start = new Date(2025, 3, 10, 12, 0, 0);
    const s = buildGoogleTemplateDatesString({ title: 't', start, allDay: true });
    expect(s).toBe('20250410/20250411');
  });
});

describe('buildGoogleCalendarTemplateUrl', () => {
  it('encodes TEMPLATE with text and add', () => {
    const start = new Date(2025, 3, 10, 10, 0, 0);
    const u = new URL(
      buildGoogleCalendarTemplateUrl({
        title: 'Test Event',
        start,
        allDay: false,
        location: 'Studio A',
        description: 'Line1\nLine2',
        attendeeEmails: ['a@b.com', 'c@d.com'],
      })
    );
    expect(u.searchParams.get('action')).toBe('TEMPLATE');
    expect(u.searchParams.get('text')).toBe('Test Event');
    expect(u.searchParams.get('location')).toBe('Studio A');
    expect(u.searchParams.get('add')).toBe('a@b.com,c@d.com');
  });
});

describe('buildIcsFileContent', () => {
  it('contains VEVENT and SUMMARY', () => {
    const start = new Date(2025, 3, 10, 11, 30, 0);
    const ics = buildIcsFileContent({ title: 'Hello', start, allDay: false });
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('SUMMARY:Hello');
    expect(ics).toContain('END:VEVENT');
  });
});

describe('payloadFromPlannerItem', () => {
  const baseTask = {
    id: 't1',
    projectId: 'p1',
    projectTitle: 'Demo project',
    clientName: 'ACME',
    type: 'edit',
    title: 'Color pass',
    column: 'post',
    priority: 'high',
    dueDate: '2025-04-10',
    assigneeCrewId: 'cr-1',
    assigneeName: 'A. Vance',
    done: false,
  } as unknown as PlannerItem;

  it('falls back to all-day when no startTime is set', () => {
    const p = payloadFromPlannerItem(baseTask, 'https://torp.test');
    expect(p.allDay).toBe(true);
    expect(p.start.getDate()).toBe(10);
  });

  it('emits a timed event when startTime/endTime are set', () => {
    const timed: PlannerItem = { ...baseTask, startTime: '13:00', endTime: '14:30', allDay: false };
    const p = payloadFromPlannerItem(timed, 'https://torp.test');
    expect(p.allDay).toBe(false);
    expect(p.start.getHours()).toBe(13);
    expect(p.start.getMinutes()).toBe(0);
    expect(p.end?.getHours()).toBe(14);
    expect(p.end?.getMinutes()).toBe(30);
  });

  it('treats allDay=true as all-day even when startTime is set', () => {
    const timed: PlannerItem = { ...baseTask, startTime: '09:00', allDay: true };
    const p = payloadFromPlannerItem(timed, 'https://torp.test');
    expect(p.allDay).toBe(true);
  });

  it('defaults to startTime + 30 minutes when endTime is omitted', () => {
    const timed: PlannerItem = { ...baseTask, startTime: '09:00', allDay: false };
    const p = payloadFromPlannerItem(timed, 'https://torp.test');
    expect(p.allDay).toBe(false);
    expect(p.end!.getTime() - p.start.getTime()).toBe(30 * 60 * 1000);
  });
});
