/**
 * ICS feed builder used by the public subscribe endpoint.
 * Mirrors the logic in `lib/calendarEvent.ts` but operates on already-resolved
 * server-side payloads.
 */
function pad2(n) {
    return String(n).padStart(2, '0');
}
function toUtcStamp(date) {
    return `${date.getUTCFullYear()}${pad2(date.getUTCMonth() + 1)}${pad2(date.getUTCDate())}T${pad2(date.getUTCHours())}${pad2(date.getUTCMinutes())}${pad2(date.getUTCSeconds())}Z`;
}
function toUtcDate(date) {
    return `${date.getUTCFullYear()}${pad2(date.getUTCMonth() + 1)}${pad2(date.getUTCDate())}`;
}
function escapeText(text) {
    return text
        .replace(/\\/g, '\\\\')
        .replace(/\n/g, '\\n')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,');
}
/** Folds long lines to <= 75 octets per RFC 5545 §3.1. */
function foldLine(line) {
    if (line.length <= 75)
        return line;
    const parts = [];
    let remaining = line;
    parts.push(remaining.slice(0, 75));
    remaining = remaining.slice(75);
    while (remaining.length > 0) {
        parts.push(' ' + remaining.slice(0, 74));
        remaining = remaining.slice(74);
    }
    return parts.join('\r\n');
}
export function buildIcsFeed(events, options) {
    const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        `PRODID:${options.productId ?? '-//TORP//Calendar Feed//EN'}`,
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        `X-WR-CALNAME:${escapeText(options.calName)}`,
    ];
    if (options.calDescription) {
        lines.push(`X-WR-CALDESC:${escapeText(options.calDescription)}`);
    }
    const dtStamp = toUtcStamp(new Date());
    for (const event of events) {
        lines.push('BEGIN:VEVENT');
        lines.push(`UID:${event.torpEntityKey}@torp`);
        lines.push(`DTSTAMP:${dtStamp}`);
        if (event.allDay) {
            const start = new Date(event.startIso);
            const end = new Date(event.endIso);
            lines.push(`DTSTART;VALUE=DATE:${toUtcDate(start)}`);
            lines.push(`DTEND;VALUE=DATE:${toUtcDate(end)}`);
        }
        else {
            const start = new Date(event.startIso);
            const end = new Date(event.endIso);
            lines.push(`DTSTART:${toUtcStamp(start)}`);
            lines.push(`DTEND:${toUtcStamp(end)}`);
        }
        lines.push(`SUMMARY:${escapeText(event.title)}`);
        if (event.location)
            lines.push(`LOCATION:${escapeText(event.location)}`);
        if (event.description)
            lines.push(`DESCRIPTION:${escapeText(event.description)}`);
        lines.push('END:VEVENT');
    }
    lines.push('END:VCALENDAR');
    return lines.map(foldLine).join('\r\n');
}
