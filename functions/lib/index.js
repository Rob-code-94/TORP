import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { setGlobalOptions } from 'firebase-functions/v2';
setGlobalOptions({ maxInstances: 5, region: 'us-central1' });
if (!getApps().length) {
    initializeApp();
}
function assertIsAdmin(req) {
    const role = req.auth?.token?.role;
    if (role !== 'ADMIN') {
        throw new HttpsError('permission-denied', 'Admins only.');
    }
}
/**
 * Validates that a Firebase user exists for this email, then the client
 * can call `sendPasswordResetEmail` for the same address.
 */
export const adminSendCrewPasswordReset = onCall(async (req) => {
    assertIsAdmin(req);
    const email = (req.data?.email || '').trim().toLowerCase();
    if (!email)
        throw new HttpsError('invalid-argument', 'email is required');
    const auth = getAuth();
    try {
        const user = await auth.getUserByEmail(email);
        return { email: user.email || email };
    }
    catch (e) {
        const err = e;
        if (err?.code === 'auth/user-not-found') {
            throw new HttpsError('not-found', 'No Auth user for that email.');
        }
        throw new HttpsError('internal', 'Auth lookup failed.');
    }
});
export const adminSetCrewTempPassword = onCall(async (req) => {
    assertIsAdmin(req);
    const email = (req.data?.email || '').trim().toLowerCase();
    const password = (req.data?.password || '').trim();
    if (!email || !password)
        throw new HttpsError('invalid-argument', 'email and password are required');
    if (password.length < 8) {
        throw new HttpsError('invalid-argument', 'Password must be at least 8 characters.');
    }
    const auth = getAuth();
    try {
        const user = await auth.getUserByEmail(email);
        await auth.updateUser(user.uid, {
            password,
        });
        return { ok: true };
    }
    catch (e) {
        const err = e;
        if (err?.code === 'auth/user-not-found') {
            throw new HttpsError('not-found', 'No Auth user for that email.');
        }
        throw new HttpsError('internal', 'Could not update password.');
    }
});
export { getMyCalendarConnection, setMyCalendarPreferences, googleCalendarOAuthStart, googleCalendarOAuthCallback, disconnectGoogleCalendar, getMyFeedToken, rotateMyFeedToken, calendarFeed, listOrgCalendarConnections, forceResyncForUser, retryMyCalendarSync, getMyCalendarFreeBusy, } from './calendar/functions.js';
export { onShootWritten, onShootUpdated, onShootDeleted, onMeetingWritten, onMeetingUpdated, onMeetingDeleted, onPlannerItemWritten, onPlannerItemUpdated, onPlannerItemDeleted, } from './calendar/triggers.js';
export { startCalendarWatchForMe, googleCalendarWebhook, refreshCalendarWatchChannels, } from './calendar/watch.js';
