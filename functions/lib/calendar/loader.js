import { getFirestore } from 'firebase-admin/firestore';
function isoFromYmdHm(ymd, hm, timezoneOffsetHours = 0) {
    const [y, m, d] = ymd.split('-').map((s) => Number.parseInt(s, 10));
    const [hh, mm] = (hm ?? '00:00').split(':').map((s) => Number.parseInt(s, 10));
    const date = new Date(Date.UTC(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0));
    date.setUTCHours(date.getUTCHours() - timezoneOffsetHours);
    return date.toISOString();
}
function endIsoFromShoot(startIso, durationHours = 4) {
    const d = new Date(startIso);
    d.setUTCHours(d.getUTCHours() + durationHours);
    return d.toISOString();
}
function endIsoFromMeeting(startIso, endHm) {
    if (!endHm) {
        const d = new Date(startIso);
        d.setUTCHours(d.getUTCHours() + 1);
        return d.toISOString();
    }
    const start = new Date(startIso);
    const [eh, em] = endHm.split(':').map((s) => Number.parseInt(s, 10));
    start.setUTCHours(eh || 0, em || 0, 0, 0);
    return start.toISOString();
}
async function findCrewIdForUid(uid) {
    const db = getFirestore();
    const direct = await db.collection('crew').where('uid', '==', uid).limit(1).get();
    if (!direct.empty) {
        const data = direct.docs[0].data();
        return data.id ?? direct.docs[0].id;
    }
    return null;
}
/** Default loader wired to live Firestore collections. */
export async function loadCrewEvents(uid) {
    const db = getFirestore();
    const crewId = await findCrewIdForUid(uid);
    if (!crewId)
        return [];
    const events = [];
    const shoots = await db
        .collection('shoots')
        .where('crewIds', 'array-contains', crewId)
        .get()
        .catch(() => null);
    if (shoots) {
        for (const snap of shoots.docs) {
            const s = snap.data();
            if (!s.date)
                continue;
            const startIso = isoFromYmdHm(s.date, s.callTime);
            events.push({
                title: s.title ?? 'Shoot',
                startIso,
                endIso: endIsoFromShoot(startIso),
                allDay: false,
                location: s.location,
                description: [s.projectTitle, s.description].filter(Boolean).join('\n'),
                torpEntityKey: `shoot:${snap.id}`,
            });
        }
    }
    const meetings = await db
        .collection('meetings')
        .where('participantCrewIds', 'array-contains', crewId)
        .get()
        .catch(() => null);
    if (meetings) {
        for (const snap of meetings.docs) {
            const m = snap.data();
            if (!m.date)
                continue;
            const startIso = isoFromYmdHm(m.date, m.startTime);
            events.push({
                title: m.title ?? 'Meeting',
                startIso,
                endIso: endIsoFromMeeting(startIso, m.endTime),
                allDay: false,
                location: m.location,
                description: [m.projectTitle, m.description].filter(Boolean).join('\n'),
                torpEntityKey: `meeting:${snap.id}`,
            });
        }
    }
    const planner = await db
        .collection('plannerItems')
        .where('assigneeCrewIds', 'array-contains', crewId)
        .get()
        .catch(() => null);
    if (planner) {
        for (const snap of planner.docs) {
            const p = snap.data();
            if (!p.dueDate)
                continue;
            const startIso = isoFromYmdHm(p.dueDate, '00:00');
            const end = new Date(startIso);
            end.setUTCDate(end.getUTCDate() + 1);
            events.push({
                title: p.title ?? 'Task',
                startIso,
                endIso: end.toISOString(),
                allDay: true,
                description: [p.projectTitle, p.type].filter(Boolean).join(' · '),
                torpEntityKey: `planner:${snap.id}`,
            });
        }
    }
    return events;
}
