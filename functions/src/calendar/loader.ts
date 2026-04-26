import { getFirestore } from 'firebase-admin/firestore';
import type { SyncEventPayload } from './types.js';

/**
 * Reads shoots / meetings / planner items the active user is on.
 * The Firestore schema may not exist yet in early environments — every read is
 * defensive and returns an empty list when collections are missing or empty.
 */

interface ShootDoc {
  id?: string;
  projectId?: string;
  projectTitle?: string;
  title?: string;
  date?: string;
  callTime?: string;
  location?: string;
  description?: string;
  crewIds?: string[];
}

interface MeetingDoc {
  id?: string;
  projectId?: string;
  projectTitle?: string;
  title?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  description?: string;
  participantCrewIds?: string[];
}

interface PlannerDoc {
  id?: string;
  projectId?: string;
  projectTitle?: string;
  title?: string;
  dueDate?: string;
  assigneeCrewIds?: string[];
  type?: string;
}

interface CrewDoc {
  id?: string;
  uid?: string;
  email?: string;
}

function isoFromYmdHm(ymd: string, hm: string | undefined, timezoneOffsetHours = 0): string {
  const [y, m, d] = ymd.split('-').map((s) => Number.parseInt(s, 10));
  const [hh, mm] = (hm ?? '00:00').split(':').map((s) => Number.parseInt(s, 10));
  const date = new Date(Date.UTC(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0));
  date.setUTCHours(date.getUTCHours() - timezoneOffsetHours);
  return date.toISOString();
}

function endIsoFromShoot(startIso: string, durationHours = 4): string {
  const d = new Date(startIso);
  d.setUTCHours(d.getUTCHours() + durationHours);
  return d.toISOString();
}

function endIsoFromMeeting(startIso: string, endHm: string | undefined): string {
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

async function findCrewIdForUid(uid: string): Promise<string | null> {
  const db = getFirestore();
  const direct = await db.collection('crew').where('uid', '==', uid).limit(1).get();
  if (!direct.empty) {
    const data = direct.docs[0].data() as CrewDoc;
    return data.id ?? direct.docs[0].id;
  }
  return null;
}

/** Default loader wired to live Firestore collections. */
export async function loadCrewEvents(uid: string): Promise<SyncEventPayload[]> {
  const db = getFirestore();
  const crewId = await findCrewIdForUid(uid);
  if (!crewId) return [];
  const events: SyncEventPayload[] = [];

  const shoots = await db
    .collection('shoots')
    .where('crewIds', 'array-contains', crewId)
    .get()
    .catch(() => null);
  if (shoots) {
    for (const snap of shoots.docs) {
      const s = snap.data() as ShootDoc;
      if (!s.date) continue;
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
      const m = snap.data() as MeetingDoc;
      if (!m.date) continue;
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
      const p = snap.data() as PlannerDoc;
      if (!p.dueDate) continue;
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
