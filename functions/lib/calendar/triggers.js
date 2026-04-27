import { logger } from 'firebase-functions/v2';
import { onDocumentCreated, onDocumentUpdated, onDocumentDeleted, } from 'firebase-functions/v2/firestore';
import { getFirestore } from 'firebase-admin/firestore';
import { CALENDAR_SECRETS, CALENDAR_TOKEN_ENC_KEY, GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET } from './secrets.js';
import { deleteEventForUid, pushEventForUid } from './sync.js';
async function uidForCrewIds(crewIds) {
    if (crewIds.length === 0)
        return [];
    const db = getFirestore();
    const results = [];
    // Firestore `in` queries cap at 30 elements; chunk defensively.
    for (let i = 0; i < crewIds.length; i += 10) {
        const chunk = crewIds.slice(i, i + 10);
        const snap = await db.collection('crew').where('id', 'in', chunk).get().catch(() => null);
        if (!snap)
            continue;
        for (const doc of snap.docs) {
            const d = doc.data();
            results.push({ uid: d.uid ?? null, crewId: d.id ?? doc.id });
        }
    }
    return results;
}
function envFromRuntime() {
    const projectId = process.env.GCLOUD_PROJECT ?? '';
    const region = process.env.FUNCTION_REGION ?? 'us-central1';
    return {
        clientId: GOOGLE_OAUTH_CLIENT_ID.value(),
        clientSecret: GOOGLE_OAUTH_CLIENT_SECRET.value(),
        redirectUri: `https://${region}-${projectId}.cloudfunctions.net/googleCalendarOAuthCallback`,
        encKey: CALENDAR_TOKEN_ENC_KEY.value(),
    };
}
function isoFromYmdHm(ymd, hm) {
    const [y, m, d] = ymd.split('-').map((s) => Number.parseInt(s, 10));
    const [hh, mm] = (hm ?? '00:00').split(':').map((s) => Number.parseInt(s, 10));
    return new Date(Date.UTC(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0)).toISOString();
}
function shootPayload(id, data) {
    const date = data.date;
    if (!date)
        return null;
    const startIso = isoFromYmdHm(date, data.callTime);
    const end = new Date(startIso);
    end.setUTCHours(end.getUTCHours() + 4);
    return {
        title: data.title ?? 'Shoot',
        startIso,
        endIso: end.toISOString(),
        allDay: false,
        location: data.location,
        description: [data.projectTitle, data.description]
            .filter(Boolean)
            .join('\n'),
        torpEntityKey: `shoot:${id}`,
    };
}
function meetingPayload(id, data) {
    const date = data.date;
    if (!date)
        return null;
    const startIso = isoFromYmdHm(date, data.startTime);
    let endIso;
    if (data.endTime) {
        const e = new Date(startIso);
        const [eh, em] = String(data.endTime).split(':').map((s) => Number.parseInt(s, 10));
        e.setUTCHours(eh || 0, em || 0, 0, 0);
        endIso = e.toISOString();
    }
    else {
        const e = new Date(startIso);
        e.setUTCHours(e.getUTCHours() + 1);
        endIso = e.toISOString();
    }
    return {
        title: data.title ?? 'Meeting',
        startIso,
        endIso,
        allDay: false,
        location: data.location,
        description: [data.projectTitle, data.description]
            .filter(Boolean)
            .join('\n'),
        torpEntityKey: `meeting:${id}`,
    };
}
function plannerPayload(id, data) {
    const due = data.dueDate;
    if (!due)
        return null;
    const startIso = isoFromYmdHm(due, '00:00');
    const end = new Date(startIso);
    end.setUTCDate(end.getUTCDate() + 1);
    return {
        title: data.title ?? 'Task',
        startIso,
        endIso: end.toISOString(),
        allDay: true,
        description: [data.projectTitle, data.type]
            .filter(Boolean)
            .join(' · '),
        torpEntityKey: `planner:${id}`,
    };
}
async function fanoutUpsert(entityType, entityId, payload, crewIds) {
    const env = envFromRuntime();
    const lookup = await uidForCrewIds(crewIds);
    await Promise.allSettled(lookup
        .filter((c) => Boolean(c.uid))
        .map(async (c) => {
        try {
            await pushEventForUid(env, c.uid, entityId, entityType, payload);
        }
        catch (e) {
            logger.warn('calendar.fanout.upsert.failed', {
                uid: c.uid,
                entityType,
                entityId,
                error: e.message,
            });
        }
    }));
}
async function fanoutDelete(entityType, entityId, crewIds) {
    const env = envFromRuntime();
    const lookup = await uidForCrewIds(crewIds);
    await Promise.allSettled(lookup
        .filter((c) => Boolean(c.uid))
        .map(async (c) => {
        try {
            await deleteEventForUid(env, c.uid, entityType, entityId);
        }
        catch (e) {
            logger.warn('calendar.fanout.delete.failed', {
                uid: c.uid,
                entityType,
                entityId,
                error: e.message,
            });
        }
    }));
}
const TRIGGER_OPTS = { secrets: CALENDAR_SECRETS };
export const onShootWritten = onDocumentCreated({ document: 'shoots/{id}', ...TRIGGER_OPTS }, async (event) => {
    const data = event.data?.data();
    if (!data)
        return;
    const id = event.params.id;
    const payload = shootPayload(id, data);
    if (!payload)
        return;
    await fanoutUpsert('shoot', id, payload, data.crewIds ?? []);
});
export const onShootUpdated = onDocumentUpdated({ document: 'shoots/{id}', ...TRIGGER_OPTS }, async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!after)
        return;
    const id = event.params.id;
    const payload = shootPayload(id, after);
    if (!payload)
        return;
    const beforeCrew = before?.crewIds ?? [];
    const afterCrew = after.crewIds ?? [];
    const removed = beforeCrew.filter((c) => !afterCrew.includes(c));
    if (removed.length > 0)
        await fanoutDelete('shoot', id, removed);
    if (afterCrew.length > 0)
        await fanoutUpsert('shoot', id, payload, afterCrew);
});
export const onShootDeleted = onDocumentDeleted({ document: 'shoots/{id}', ...TRIGGER_OPTS }, async (event) => {
    const data = event.data?.data();
    if (!data)
        return;
    const id = event.params.id;
    await fanoutDelete('shoot', id, data.crewIds ?? []);
});
export const onMeetingWritten = onDocumentCreated({ document: 'meetings/{id}', ...TRIGGER_OPTS }, async (event) => {
    const data = event.data?.data();
    if (!data)
        return;
    const id = event.params.id;
    const payload = meetingPayload(id, data);
    if (!payload)
        return;
    await fanoutUpsert('meeting', id, payload, data.participantCrewIds ?? []);
});
export const onMeetingUpdated = onDocumentUpdated({ document: 'meetings/{id}', ...TRIGGER_OPTS }, async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!after)
        return;
    const id = event.params.id;
    const payload = meetingPayload(id, after);
    if (!payload)
        return;
    const beforeCrew = before?.participantCrewIds ?? [];
    const afterCrew = after.participantCrewIds ?? [];
    const removed = beforeCrew.filter((c) => !afterCrew.includes(c));
    if (removed.length > 0)
        await fanoutDelete('meeting', id, removed);
    if (afterCrew.length > 0)
        await fanoutUpsert('meeting', id, payload, afterCrew);
});
export const onMeetingDeleted = onDocumentDeleted({ document: 'meetings/{id}', ...TRIGGER_OPTS }, async (event) => {
    const data = event.data?.data();
    if (!data)
        return;
    const id = event.params.id;
    await fanoutDelete('meeting', id, data.participantCrewIds ?? []);
});
export const onPlannerItemWritten = onDocumentCreated({ document: 'plannerItems/{id}', ...TRIGGER_OPTS }, async (event) => {
    const data = event.data?.data();
    if (!data)
        return;
    const id = event.params.id;
    const payload = plannerPayload(id, data);
    if (!payload)
        return;
    await fanoutUpsert('planner', id, payload, data.assigneeCrewIds ?? []);
});
export const onPlannerItemUpdated = onDocumentUpdated({ document: 'plannerItems/{id}', ...TRIGGER_OPTS }, async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!after)
        return;
    const id = event.params.id;
    const payload = plannerPayload(id, after);
    if (!payload)
        return;
    const beforeCrew = before?.assigneeCrewIds ?? [];
    const afterCrew = after.assigneeCrewIds ?? [];
    const removed = beforeCrew.filter((c) => !afterCrew.includes(c));
    if (removed.length > 0)
        await fanoutDelete('planner', id, removed);
    if (afterCrew.length > 0)
        await fanoutUpsert('planner', id, payload, afterCrew);
});
export const onPlannerItemDeleted = onDocumentDeleted({ document: 'plannerItems/{id}', ...TRIGGER_OPTS }, async (event) => {
    const data = event.data?.data();
    if (!data)
        return;
    const id = event.params.id;
    await fanoutDelete('planner', id, data.assigneeCrewIds ?? []);
});
