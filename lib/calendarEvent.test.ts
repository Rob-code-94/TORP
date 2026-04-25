import { describe, expect, it } from 'vitest';
import { buildGoogleCalendarTemplateUrl, buildGoogleTemplateDatesString, buildIcsFileContent, withResolvedRange } from './calendarEvent';

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
