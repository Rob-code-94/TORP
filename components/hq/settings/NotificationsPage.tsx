import React, { useEffect, useMemo, useState } from 'react';
import SettingsShell from './SettingsShell';
import { useAuth } from '../../../lib/auth';
import { useAdminTheme } from '../../../lib/adminTheme';
import {
  appCardClass,
  appErrorBannerClass,
  appInputClass,
  appOutlineButtonClass,
  appSuccessBannerClass,
} from '../../../lib/appThemeClasses';
import {
  defaultNotificationPrefs,
  listNotificationEvents,
  loadNotificationPrefs,
  saveNotificationPrefs,
  type NotificationChannel,
  type NotificationEventId,
  type NotificationPrefs,
} from '../../../data/userProfileRepository';
import { getMyCalendarConnection } from '../../../lib/calendarIntegrations';
import { getFirebaseAuthInstance, isFirebaseConfigured } from '../../../lib/firebase';

interface NotificationsPageProps {
  variant: 'admin' | 'staff';
}

const CHANNELS: { id: NotificationChannel; label: string }[] = [
  { id: 'inApp', label: 'In-app' },
  { id: 'email', label: 'Email' },
  { id: 'calendar', label: 'Calendar' },
];

function tenantIdFromUser(tenantId: string | undefined): string {
  return tenantId && tenantId.length > 0 ? tenantId : 'torp-default';
}

function minutesToHM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function hmToMinutes(value: string): number {
  const [h, m] = value.split(':').map((p) => Number(p));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
  return Math.max(0, Math.min(24 * 60, h * 60 + m));
}

const NotificationsPage: React.FC<NotificationsPageProps> = ({ variant }) => {
  const { user } = useAuth();
  const { theme } = useAdminTheme();
  const isDark = theme === 'dark';
  const tenantId = tenantIdFromUser(user?.tenantId);
  const uid = useMemo(() => {
    try {
      const auth = isFirebaseConfigured() ? getFirebaseAuthInstance() : null;
      return auth?.currentUser?.uid || `demo-${user?.email || 'user'}`;
    } catch {
      return `demo-${user?.email || 'user'}`;
    }
  }, [user?.email]);

  const [prefs, setPrefs] = useState<NotificationPrefs>(() => defaultNotificationPrefs({ uid, tenantId }));
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [calendarConnected, setCalendarConnected] = useState<boolean>(false);
  const [testSent, setTestSent] = useState(false);

  const events = useMemo(() => listNotificationEvents(user?.role), [user?.role]);

  useEffect(() => {
    let mounted = true;
    setState('loading');
    void loadNotificationPrefs({ uid, tenantId }).then((p) => {
      if (!mounted) return;
      setPrefs(p);
      setState('ready');
    });
    if (isFirebaseConfigured()) {
      void getMyCalendarConnection()
        .then((res) => {
          if (!mounted) return;
          setCalendarConnected(res.ok && !!res.data && res.data.status === 'connected');
        })
        .catch(() => {
          if (!mounted) return;
          setCalendarConnected(false);
        });
    }
    return () => {
      mounted = false;
    };
  }, [uid, tenantId]);

  const toggleChannel = (eventId: NotificationEventId, channel: NotificationChannel) => {
    setPrefs((current) => {
      const eventRow = current.matrix[eventId] || { inApp: true, email: false, calendar: false };
      const nextRow = { ...eventRow, [channel]: !eventRow[channel] };
      if (channel !== 'inApp' && !nextRow.inApp && !nextRow.email && !nextRow.calendar) {
        nextRow.inApp = true;
      }
      return {
        ...current,
        matrix: { ...current.matrix, [eventId]: nextRow },
      };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const next = await saveNotificationPrefs(prefs);
      setPrefs(next);
      setSuccess('Notification preferences saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save preferences.');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = () => {
    setTestSent(true);
    setSuccess('Sent a test toast — check the bottom-right corner.');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('torp:test-notification', {
          detail: { source: 'settings.notifications', timestamp: Date.now() },
        }),
      );
    }
    setTimeout(() => setTestSent(false), 3000);
  };

  return (
    <SettingsShell
      title="Notifications"
      subtitle="Choose how each event reaches you. In-app is always available; other channels light up as integrations connect."
      variant={variant}
    >
      <div className="space-y-4 min-w-0">
        {state === 'loading' && (
          <div className={`rounded-xl p-4 text-sm ${appCardClass(isDark)} ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
            Loading notification preferences…
          </div>
        )}

        {state !== 'loading' && (
          <>
            {error && (
              <div className={`rounded-lg px-3 py-2 text-xs ${appErrorBannerClass(isDark)}`}>{error}</div>
            )}
            {success && (
              <div className={`rounded-lg px-3 py-2 text-xs ${appSuccessBannerClass(isDark)}`}>{success}</div>
            )}

            <section className={`rounded-xl p-4 ${appCardClass(isDark)} min-w-0`}>
              <div className="hidden md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={`text-left ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>
                      <th className="font-mono text-xs uppercase tracking-widest pb-2">Event</th>
                      {CHANNELS.map((c) => (
                        <th key={c.id} className="font-mono text-xs uppercase tracking-widest pb-2 px-2">
                          {c.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((event) => {
                      const row = prefs.matrix[event.id] || { inApp: true, email: false, calendar: false };
                      return (
                        <tr key={event.id} className={`border-t ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
                          <td className="py-2 pr-2 align-top">
                            <p className={`font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{event.label}</p>
                            <p className={`text-xs mt-0.5 ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>
                              {event.blurb}
                            </p>
                          </td>
                          {CHANNELS.map((c) => {
                            const isCalendarRow = c.id === 'calendar';
                            const calendarDisabled = isCalendarRow && !calendarConnected;
                            return (
                              <td key={c.id} className="px-2 py-2 align-top">
                                <label
                                  className={`inline-flex items-center gap-2 ${
                                    calendarDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={!!row[c.id]}
                                    disabled={calendarDisabled}
                                    onChange={() => toggleChannel(event.id, c.id)}
                                  />
                                  <span className={isDark ? 'text-zinc-400' : 'text-zinc-600'}>
                                    {calendarDisabled ? 'Connect cal' : c.label}
                                  </span>
                                </label>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden space-y-2">
                {events.map((event) => {
                  const row = prefs.matrix[event.id] || { inApp: true, email: false, calendar: false };
                  return (
                    <div
                      key={event.id}
                      className={`rounded-lg border px-3 py-2 ${
                        isDark ? 'border-zinc-800' : 'border-zinc-200'
                      }`}
                    >
                      <p className={`text-sm font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                        {event.label}
                      </p>
                      <p className={`text-xs mt-0.5 ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>
                        {event.blurb}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-3">
                        {CHANNELS.map((c) => {
                          const calendarDisabled = c.id === 'calendar' && !calendarConnected;
                          return (
                            <label
                              key={c.id}
                              className={`inline-flex items-center gap-1.5 text-xs ${
                                calendarDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={!!row[c.id]}
                                disabled={calendarDisabled}
                                onChange={() => toggleChannel(event.id, c.id)}
                              />
                              <span className={isDark ? 'text-zinc-400' : 'text-zinc-600'}>
                                {calendarDisabled ? 'Connect cal' : c.label}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className={`rounded-xl p-4 ${appCardClass(isDark)} min-w-0`}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>Quiet hours</h3>
                  <p className={`text-xs mt-1 ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>
                    Pause non-critical notifications during a window each day. Reminders within 2h of a shoot
                    always come through.
                  </p>
                </div>
                <label className="inline-flex items-center gap-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prefs.quietHours.enabled}
                    onChange={(e) =>
                      setPrefs((current) => ({
                        ...current,
                        quietHours: { ...current.quietHours, enabled: e.target.checked },
                      }))
                    }
                  />
                  <span className={isDark ? 'text-zinc-300' : 'text-zinc-700'}>Enabled</span>
                </label>
              </div>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="text-xs text-zinc-500">
                  Start
                  <input
                    type="time"
                    disabled={!prefs.quietHours.enabled}
                    value={minutesToHM(prefs.quietHours.startMinutes)}
                    onChange={(e) =>
                      setPrefs((current) => ({
                        ...current,
                        quietHours: { ...current.quietHours, startMinutes: hmToMinutes(e.target.value) },
                      }))
                    }
                    className={appInputClass(isDark)}
                  />
                </label>
                <label className="text-xs text-zinc-500">
                  End
                  <input
                    type="time"
                    disabled={!prefs.quietHours.enabled}
                    value={minutesToHM(prefs.quietHours.endMinutes)}
                    onChange={(e) =>
                      setPrefs((current) => ({
                        ...current,
                        quietHours: { ...current.quietHours, endMinutes: hmToMinutes(e.target.value) },
                      }))
                    }
                    className={appInputClass(isDark)}
                  />
                </label>
              </div>
            </section>

            <section className={`flex items-center justify-between gap-3 flex-wrap rounded-xl p-4 ${appCardClass(isDark)}`}>
              <button
                type="button"
                onClick={handleTest}
                className={appOutlineButtonClass(isDark)}
                disabled={testSent}
              >
                Send test notification
              </button>
              <button
                type="button"
                onClick={() => void handleSave()}
                className={appOutlineButtonClass(isDark)}
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Save preferences'}
              </button>
            </section>
          </>
        )}
      </div>
    </SettingsShell>
  );
};

export default NotificationsPage;
