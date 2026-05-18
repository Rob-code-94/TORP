import { describe, expect, it } from 'vitest';
import {
  formatHm,
  formatHmRange,
  formatMinutes,
  formatMinutesCompact,
  formatMinutesStandard,
  parseHm,
  plannerScheduleTimeLabel,
} from './timeFormat';

describe('parseHm', () => {
  it('parses valid times', () => {
    expect(parseHm('08:00')).toBe(8 * 60);
    expect(parseHm('13:30')).toBe(13 * 60 + 30);
    expect(parseHm('00:30')).toBe(30);
  });

  it('returns null for invalid', () => {
    expect(parseHm('')).toBeNull();
    expect(parseHm('bad')).toBeNull();
  });
});

describe('formatHm standard', () => {
  it('formats morning and afternoon', () => {
    expect(formatHm('08:00')).toMatch(/8:00\s*AM/i);
    expect(formatHm('13:30')).toMatch(/1:30\s*PM/i);
  });

  it('formats midnight and noon', () => {
    expect(formatHm('00:00')).toMatch(/12:00\s*AM/i);
    expect(formatHm('12:00')).toMatch(/12:00\s*PM/i);
  });
});

describe('formatHm compact', () => {
  it('formats compact labels', () => {
    expect(formatHm('09:00', 'compact')).toBe('9a');
    expect(formatHm('14:30', 'compact')).toBe('2:30p');
  });
});

describe('formatHmRange', () => {
  it('formats a range', () => {
    const s = formatHmRange('08:00', '17:00');
    expect(s).toMatch(/8:00\s*AM/i);
    expect(s).toMatch(/5:00\s*PM/i);
  });

  it('formats start only when end missing', () => {
    expect(formatHmRange('10:00')).toMatch(/10:00\s*AM/i);
  });
});

describe('plannerScheduleTimeLabel', () => {
  it('uses compact range with default span', () => {
    const { timeLabel, sortKey } = plannerScheduleTimeLabel('09:00', undefined, 8 * 60);
    expect(timeLabel).toBe('9a–5p');
    expect(sortKey).toBe(9 * 60);
  });
});

describe('formatMinutes', () => {
  it('matches compact and standard', () => {
    expect(formatMinutes(9 * 60, 'compact')).toBe('9a');
    expect(formatMinutesStandard(9 * 60)).toMatch(/9:00\s*AM/i);
    expect(formatMinutesCompact(14 * 60 + 30)).toBe('2:30p');
  });
});
