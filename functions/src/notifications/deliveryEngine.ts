import { logger } from 'firebase-functions/v2';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

type NotificationChannel = 'inApp' | 'email' | 'calendar';

interface NotificationPrefsDoc {
  matrix?: Record<string, Record<NotificationChannel, boolean>>;
}

async function tenantsToScan(): Promise<string[]> {
  const db = getFirestore();
  const ids = new Set<string>();
  const tenants = await db.collection('tenants').get().catch(() => null);
  tenants?.forEach((doc) => ids.add(doc.id));
  if (ids.size === 0) ids.add('torp-default');
  return Array.from(ids);
}

/**
 * V2 notification delivery engine scaffold.
 *
 * Every 10 minutes it reads notification preferences and materializes a
 * lightweight delivery queue row for enabled email/calendar channels. This
 * creates the fan-out surface needed by future channel workers.
 */
export const fanoutNotificationDeliveries = onSchedule(
  {
    region: 'us-central1',
    schedule: '*/10 * * * *',
    timeZone: 'UTC',
    timeoutSeconds: 300,
  },
  async () => {
    const db = getFirestore();
    const tenants = await tenantsToScan();
    for (const tenantId of tenants) {
      const users = await db.collection('tenants').doc(tenantId).collection('users').get().catch(() => null);
      if (!users) continue;
      for (const userDoc of users.docs) {
        const prefsRef = userDoc.ref.collection('prefs').doc('notifications');
        const prefsSnap = await prefsRef.get().catch(() => null);
        const prefs = (prefsSnap?.data() || {}) as NotificationPrefsDoc;
        const matrix = prefs.matrix || {};
        const hasEmail = Object.values(matrix).some((channels) => channels?.email);
        const hasCalendar = Object.values(matrix).some((channels) => channels?.calendar);
        const channels: NotificationChannel[] = [];
        if (hasEmail) channels.push('email');
        if (hasCalendar) channels.push('calendar');
        if (channels.length === 0) continue;
        await db.collection('tenants').doc(tenantId).collection('notificationDeliveryQueue').add({
          tenantId,
          uid: userDoc.id,
          channels,
          status: 'queued',
          createdAt: FieldValue.serverTimestamp(),
        });
      }
    }
    logger.info('notification-engine: fanout complete');
  },
);
