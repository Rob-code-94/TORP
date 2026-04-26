import { logger } from 'firebase-functions/v2';
import {
  onDocumentCreated,
  onDocumentUpdated,
  onDocumentDeleted,
} from 'firebase-functions/v2/firestore';
import { getFirestore } from 'firebase-admin/firestore';
import { CALENDAR_SECRETS, CALENDAR_TOKEN_ENC_KEY, GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET } from './secrets.js';
import { deleteEventForUid, pushEventForUid } from './sync.js';
import type { GoogleEnv } from './google.js';
import type { SyncEventPayload } from './types.js';

/**
 * Fan-out push triggers. Whenever a TORP entity is written, look up every
 * connected crew member that should see the event and call the sync helper
 * for each one. The sync helper short-circuits when nothing has changed.
 *
 * Failures for one user must not block the others. We log and continue.
 */

interface CrewLookup {
  uid: string | null;
  crewId: string;
}

async function uidForCrewIds(crewIds: string[]): Promise<CrewLookup[]> {
  if (crewIds.length === 0) return [];
  const db = getFirestore();
  const results: CrewLookup[] = [];
  // Firestore `in` queries cap at 30 elements; chunk defensively.
  for (let i = 0; i < crewIds.length; i += 10) {
    const chunk = crewIds.slice(i, i + 10);
    const snap = await db.collection('crew').where('id', 'in', chunk).get().catch(() => null);
    if (!snap) continue;
    for (const doc of snap.docs) {
      const d = doc.data() as { id?: string; uid?: string };
      results.push({ uid: d.uid ?? null, crewId: d.id ?? doc.id });
    }
  }
  return results;
}

function envFromRuntime(): GoogleEnv {
  const projectId = process.env.GCLOUD_PROJECT ?? '';
  const region = process.env.FUNCTION_REGION ?? 'us-central1';
  return {
    clientId: GOOGLE_OAUTH_CLIENT_ID.value(),
    clientSecret: GOOGLE_OAUTH_CLIENT_SECRET.value(),
    redirectUri: `https://${region}-${projectId}.cloudfunctions.net/googleCalendarOAuthCallback`,
    encKey: CALENDAR_TOKEN_ENC_KEY.value(),
  };
}

function isoFromYmdHm(ymd: string, hm: string | undefined): string {
  const [y, m, d] = ymd.split('-').map((s) => Number.parseInt(s, 10));
  const [hh, mm] = (hm ?? '00:00').split(':').map((s) => Number.parseInt(s, 10));
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0)).toISOString();
}

function shootPayload(id: string, data: Record<string, unknown>): SyncEventPayload | null {
  const date = data.date as string | undefined;
  if (!date) return null;
  const startIso = isoFromYmdHm(date, data.callTime as string | undefined);
  const end = new Date(startIso);
  end.setUTCHours(end.getUTCHours() + 4);
  return {
    title: (data.title as string | undefined) ?? 'Shoot',
    startIso,
    endIso: end.toISOString(),
    allDay: false,
    location: data.location as string | undefined,
    description: [data.projectTitle as string | undefined, data.description as string | undefined]
      .filter(Boolean)
      .join('\n'),
    torpEntityKey: `shoot:${id}`,
  };
}

function meetingPayload(id: string, data: Record<string, unknown>): SyncEventPayload | null {
  const date = data.date as string | undefined;
  if (!date) return null;
  const startIso = isoFromYmdHm(date, data.startTime as string | undefined);
  let endIso: string;
  if (data.endTime) {
    const e = new Date(startIso);
    const [eh, em] = String(data.endTime).split(':').map((s) => Number.parseInt(s, 10));
    e.setUTCHours(eh || 0, em || 0, 0, 0);
    endIso = e.toISOString();
  } else {
    const e = new Date(startIso);
    e.setUTCHours(e.getUTCHours() + 1);
    endIso = e.toISOString();
  }
  return {
    title: (data.title as string | undefined) ?? 'Meeting',
    startIso,
    endIso,
    allDay: false,
    location: data.location as string | undefined,
    description: [data.projectTitle as string | undefined, data.description as string | undefined]
      .filter(Boolean)
      .join('\n'),
    torpEntityKey: `meeting:${id}`,
  };
}

function plannerPayload(id: string, data: Record<string, unknown>): SyncEventPayload | null {
  const due = data.dueDate as string | undefined;
  if (!due) return null;
  const startIso = isoFromYmdHm(due, '00:00');
  const end = new Date(startIso);
  end.setUTCDate(end.getUTCDate() + 1);
  return {
    title: (data.title as string | undefined) ?? 'Task',
    startIso,
    endIso: end.toISOString(),
    allDay: true,
    description: [data.projectTitle as string | undefined, data.type as string | undefined]
      .filter(Boolean)
      .join(' · '),
    torpEntityKey: `planner:${id}`,
  };
}

async function fanoutUpsert(
  entityType: 'shoot' | 'meeting' | 'planner',
  entityId: string,
  payload: SyncEventPayload,
  crewIds: string[],
): Promise<void> {
  const env = envFromRuntime();
  const lookup = await uidForCrewIds(crewIds);
  await Promise.allSettled(
    lookup
      .filter((c): c is { uid: string; crewId: string } => Boolean(c.uid))
      .map(async (c) => {
        try {
          await pushEventForUid(env, c.uid, entityId, entityType, payload);
        } catch (e) {
          logger.warn('calendar.fanout.upsert.failed', {
            uid: c.uid,
            entityType,
            entityId,
            error: (e as Error).message,
          });
        }
      }),
  );
}

async function fanoutDelete(
  entityType: 'shoot' | 'meeting' | 'planner',
  entityId: string,
  crewIds: string[],
): Promise<void> {
  const env = envFromRuntime();
  const lookup = await uidForCrewIds(crewIds);
  await Promise.allSettled(
    lookup
      .filter((c): c is { uid: string; crewId: string } => Boolean(c.uid))
      .map(async (c) => {
        try {
          await deleteEventForUid(env, c.uid, entityType, entityId);
        } catch (e) {
          logger.warn('calendar.fanout.delete.failed', {
            uid: c.uid,
            entityType,
            entityId,
            error: (e as Error).message,
          });
        }
      }),
  );
}

const TRIGGER_OPTS = { secrets: CALENDAR_SECRETS };

export const onShootWritten = onDocumentCreated(
  { document: 'shoots/{id}', ...TRIGGER_OPTS },
  async (event) => {
    const data = event.data?.data();
    if (!data) return;
    const id = event.params.id;
    const payload = shootPayload(id, data);
    if (!payload) return;
    await fanoutUpsert('shoot', id, payload, (data.crewIds as string[]) ?? []);
  },
);

export const onShootUpdated = onDocumentUpdated(
  { document: 'shoots/{id}', ...TRIGGER_OPTS },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!after) return;
    const id = event.params.id;
    const payload = shootPayload(id, after);
    if (!payload) return;
    const beforeCrew = (before?.crewIds as string[] | undefined) ?? [];
    const afterCrew = (after.crewIds as string[] | undefined) ?? [];
    const removed = beforeCrew.filter((c) => !afterCrew.includes(c));
    if (removed.length > 0) await fanoutDelete('shoot', id, removed);
    if (afterCrew.length > 0) await fanoutUpsert('shoot', id, payload, afterCrew);
  },
);

export const onShootDeleted = onDocumentDeleted(
  { document: 'shoots/{id}', ...TRIGGER_OPTS },
  async (event) => {
    const data = event.data?.data();
    if (!data) return;
    const id = event.params.id;
    await fanoutDelete('shoot', id, (data.crewIds as string[]) ?? []);
  },
);

export const onMeetingWritten = onDocumentCreated(
  { document: 'meetings/{id}', ...TRIGGER_OPTS },
  async (event) => {
    const data = event.data?.data();
    if (!data) return;
    const id = event.params.id;
    const payload = meetingPayload(id, data);
    if (!payload) return;
    await fanoutUpsert('meeting', id, payload, (data.participantCrewIds as string[]) ?? []);
  },
);

export const onMeetingUpdated = onDocumentUpdated(
  { document: 'meetings/{id}', ...TRIGGER_OPTS },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!after) return;
    const id = event.params.id;
    const payload = meetingPayload(id, after);
    if (!payload) return;
    const beforeCrew = (before?.participantCrewIds as string[] | undefined) ?? [];
    const afterCrew = (after.participantCrewIds as string[] | undefined) ?? [];
    const removed = beforeCrew.filter((c) => !afterCrew.includes(c));
    if (removed.length > 0) await fanoutDelete('meeting', id, removed);
    if (afterCrew.length > 0) await fanoutUpsert('meeting', id, payload, afterCrew);
  },
);

export const onMeetingDeleted = onDocumentDeleted(
  { document: 'meetings/{id}', ...TRIGGER_OPTS },
  async (event) => {
    const data = event.data?.data();
    if (!data) return;
    const id = event.params.id;
    await fanoutDelete('meeting', id, (data.participantCrewIds as string[]) ?? []);
  },
);

export const onPlannerItemWritten = onDocumentCreated(
  { document: 'plannerItems/{id}', ...TRIGGER_OPTS },
  async (event) => {
    const data = event.data?.data();
    if (!data) return;
    const id = event.params.id;
    const payload = plannerPayload(id, data);
    if (!payload) return;
    await fanoutUpsert('planner', id, payload, (data.assigneeCrewIds as string[]) ?? []);
  },
);

export const onPlannerItemUpdated = onDocumentUpdated(
  { document: 'plannerItems/{id}', ...TRIGGER_OPTS },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!after) return;
    const id = event.params.id;
    const payload = plannerPayload(id, after);
    if (!payload) return;
    const beforeCrew = (before?.assigneeCrewIds as string[] | undefined) ?? [];
    const afterCrew = (after.assigneeCrewIds as string[] | undefined) ?? [];
    const removed = beforeCrew.filter((c) => !afterCrew.includes(c));
    if (removed.length > 0) await fanoutDelete('planner', id, removed);
    if (afterCrew.length > 0) await fanoutUpsert('planner', id, payload, afterCrew);
  },
);

export const onPlannerItemDeleted = onDocumentDeleted(
  { document: 'plannerItems/{id}', ...TRIGGER_OPTS },
  async (event) => {
    const data = event.data?.data();
    if (!data) return;
    const id = event.params.id;
    await fanoutDelete('planner', id, (data.assigneeCrewIds as string[]) ?? []);
  },
);
