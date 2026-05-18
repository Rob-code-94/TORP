/** Wall-clock time helpers. Storage/API use 24h HH:mm; UI uses 12-hour display. */

export type TimeDisplayStyle = 'standard' | 'compact';

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** Parse "HH:mm" to minutes from midnight; null if invalid. */
export function parseHm(hm: string | undefined | null): number | null {
  if (!hm) return null;
  const [h, m] = hm.split(':').map((s) => Number.parseInt(s, 10));
  if (!Number.isFinite(h)) return null;
  const minutes = (h || 0) * 60 + (Number.isFinite(m) ? m : 0);
  if (minutes < 0 || minutes > 24 * 60) return null;
  return minutes;
}

/** Format minutes from midnight as compact 12h (e.g. 9a, 2:30p). */
export function formatMinutesCompact(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  const hour12 = ((h + 11) % 12) + 1;
  const ampm = h < 12 ? 'a' : 'p';
  return m === 0 ? `${hour12}${ampm}` : `${hour12}:${pad2(m)}${ampm}`;
}

const STANDARD_TIME_FMT = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

/** Format minutes from midnight as standard 12h (e.g. 8:00 AM). */
export function formatMinutesStandard(min: number): string {
  const d = new Date(2000, 0, 1, Math.floor(min / 60), min % 60, 0, 0);
  return STANDARD_TIME_FMT.format(d);
}

/** Format minutes from midnight in the given style. */
export function formatMinutes(min: number, style: TimeDisplayStyle = 'standard'): string {
  return style === 'compact' ? formatMinutesCompact(min) : formatMinutesStandard(min);
}

/** Format an HH:mm string for display. Returns empty string if invalid. */
export function formatHm(hm: string | undefined | null, style: TimeDisplayStyle = 'standard'): string {
  const min = parseHm(hm);
  if (min == null) return '';
  return formatMinutes(min, style);
}

/** Format a time range from HH:mm start/end. */
export function formatHmRange(
  startHm: string | undefined | null,
  endHm?: string | undefined | null,
  style: TimeDisplayStyle = 'standard',
): string {
  const sm = parseHm(startHm);
  if (sm == null) return '';
  const em = parseHm(endHm);
  if (em != null && em >= sm) {
    return `${formatMinutes(sm, style)} – ${formatMinutes(em, style)}`;
  }
  return formatMinutes(sm, style);
}

/** Planner chip label using internal minutes (avoids round-trip bugs). */
export function plannerScheduleTimeLabel(
  startHm: string | undefined,
  endHm: string | undefined | null,
  defaultSpanMin: number,
): { timeLabel: string; sortKey: number } {
  const sm = parseHm(startHm);
  if (sm == null) return { timeLabel: '', sortKey: 99_999 };
  const emExplicit = parseHm(endHm);
  const end =
    emExplicit != null && emExplicit >= sm ? emExplicit : Math.min(24 * 60, sm + defaultSpanMin);
  return {
    timeLabel: `${formatMinutesCompact(sm)}–${formatMinutesCompact(end)}`,
    sortKey: sm,
  };
}

export function formatHourLabel(hour: number): string {
  if (hour === 0) return '12am';
  if (hour < 12) return `${hour}am`;
  if (hour === 12) return '12pm';
  return `${hour - 12}pm`;
}

/** Convert minutes from midnight to storage HH:mm (24h). */
export function minutesToHm(min: number): string {
  const clamped = Math.max(0, Math.min(24 * 60 - 1, Math.round(min)));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${pad2(h)}:${pad2(m)}`;
}
