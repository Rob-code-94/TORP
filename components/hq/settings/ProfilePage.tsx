import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
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
  defaultUserProfile,
  loadUserProfile,
  saveUserProfile,
  type UserProfile,
} from '../../../data/userProfileRepository';
import { uploadAvatar, type AvatarUploadProgress } from '../../../lib/avatarStorage';
import { loadStoragePolicy } from '../../../data/storagePolicyRepository';
import { updateProfile as updateAuthProfile } from 'firebase/auth';
import { getFirebaseAuthInstance, isFirebaseConfigured } from '../../../lib/firebase';
import { resetHqGuideTip } from '../../../lib/hqGuideTipStorage';

interface ProfilePageProps {
  variant: 'admin' | 'staff';
}

const COMMON_TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'America/Anchorage',
  'Pacific/Honolulu',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Singapore',
  'Australia/Sydney',
  'UTC',
];

function tenantIdFromUser(tenantId: string | undefined): string {
  return tenantId && tenantId.length > 0 ? tenantId : 'torp-default';
}

const ProfilePage: React.FC<ProfilePageProps> = ({ variant }) => {
  const { user, updateSessionProfile } = useAuth();
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

  const [profile, setProfile] = useState<UserProfile>(() =>
    defaultUserProfile({
      uid,
      tenantId,
      email: user?.email,
      displayName: user?.displayName,
    }),
  );
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarProgress, setAvatarProgress] = useState<AvatarUploadProgress | null>(null);
  const [imageMaxBytes, setImageMaxBytes] = useState<number>(250 * 1024 * 1024);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let mounted = true;
    setState('loading');
    void loadUserProfile({
      uid,
      tenantId,
      email: user?.email,
      displayName: user?.displayName,
    }).then((p) => {
      if (!mounted) return;
      setProfile(p);
      setState('ready');
    });
    void loadStoragePolicy(tenantId).then((policy) => {
      if (!mounted) return;
      setImageMaxBytes(Math.max(1, policy.maxSizeByMimeGroup.imageMb) * 1024 * 1024);
    });
    return () => {
      mounted = false;
    };
  }, [uid, tenantId, user?.email, user?.displayName]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const next = await saveUserProfile(profile);
      setProfile(next);
      updateSessionProfile({ displayName: next.displayName, email: next.email });
      if (isFirebaseConfigured()) {
        const auth = getFirebaseAuthInstance();
        if (auth.currentUser) {
          await updateAuthProfile(auth.currentUser, {
            displayName: next.displayName || undefined,
            photoURL: next.avatarUrl || undefined,
          });
        }
      }
      setSuccess('Profile saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarPick = () => fileRef.current?.click();

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setAvatarBusy(true);
    setError(null);
    setSuccess(null);
    setAvatarProgress({ bytesTransferred: 0, totalBytes: file.size, percent: 0 });
    try {
      const result = await uploadAvatar({
        tenantId,
        uid,
        file,
        maxBytes: imageMaxBytes,
        onProgress: setAvatarProgress,
      });
      const next: UserProfile = {
        ...profile,
        avatarPath: result.path,
        avatarUrl: result.downloadUrl,
        avatarAssetId: profile.avatarAssetId || `avatar-${uid}`,
      };
      const saved = await saveUserProfile(next);
      setProfile(saved);
      if (isFirebaseConfigured()) {
        const auth = getFirebaseAuthInstance();
        if (auth.currentUser) {
          await updateAuthProfile(auth.currentUser, { photoURL: saved.avatarUrl || undefined });
        }
      }
      setSuccess('Avatar updated.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not upload avatar.');
    } finally {
      setAvatarBusy(false);
      setAvatarProgress(null);
    }
  };

  const initials = (profile.displayName || profile.email || 'U')
    .split(/[\s@]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s.charAt(0).toUpperCase())
    .join('') || 'U';

  return (
    <SettingsShell
      title="Profile"
      subtitle="Your identity, avatar, and preferences. Other people in your org never see your tokens."
      variant={variant}
    >
      <div className="space-y-4 min-w-0">
        {state === 'loading' && (
          <div className={`rounded-xl p-4 text-sm ${appCardClass(isDark)} ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
            Loading profile…
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
              <div className="flex flex-col sm:flex-row sm:items-start gap-4 min-w-0">
                <div className="flex flex-col items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleAvatarPick}
                    disabled={avatarBusy}
                    className={`relative h-24 w-24 rounded-full overflow-hidden border ${
                      isDark ? 'border-zinc-700 bg-zinc-900' : 'border-zinc-300 bg-zinc-100'
                    } flex items-center justify-center text-lg font-bold ${
                      isDark ? 'text-zinc-200' : 'text-zinc-700'
                    } disabled:opacity-60`}
                    aria-label="Change avatar"
                  >
                    {profile.avatarUrl ? (
                      <img
                        src={profile.avatarUrl}
                        alt={profile.displayName || profile.email}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span>{initials}</span>
                    )}
                    <span
                      className={`absolute inset-x-0 bottom-0 py-1 text-[10px] uppercase tracking-wide ${
                        isDark ? 'bg-black/60 text-white' : 'bg-white/80 text-zinc-900'
                      } flex items-center justify-center gap-1`}
                    >
                      {avatarBusy ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
                      {avatarBusy ? 'Uploading' : 'Change'}
                    </span>
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                  {avatarProgress && (
                    <p className="text-[11px] text-zinc-500">
                      {avatarProgress.percent}% of {Math.ceil(avatarProgress.totalBytes / 1024)} KB
                    </p>
                  )}
                </div>

                <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="text-xs text-zinc-500">
                    Display name
                    <input
                      type="text"
                      value={profile.displayName}
                      onChange={(e) => setProfile((p) => ({ ...p, displayName: e.target.value }))}
                      className={appInputClass(isDark)}
                    />
                  </label>
                  <label className="text-xs text-zinc-500">
                    Email
                    <input
                      type="email"
                      value={profile.email}
                      readOnly
                      className={`${appInputClass(isDark)} opacity-70 cursor-not-allowed`}
                    />
                    <span className={`block mt-1 ${isDark ? 'text-zinc-600' : 'text-zinc-500'}`}>
                      Change your sign-in email under Security.
                    </span>
                  </label>
                  <label className="text-xs text-zinc-500">
                    Phone
                    <input
                      type="tel"
                      value={profile.phone}
                      onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                      className={appInputClass(isDark)}
                      placeholder="(555) 555-1234"
                    />
                  </label>
                  <label className="text-xs text-zinc-500">
                    Time zone
                    <select
                      value={profile.timezone}
                      onChange={(e) => setProfile((p) => ({ ...p, timezone: e.target.value }))}
                      className={appInputClass(isDark)}
                    >
                      {[profile.timezone, ...COMMON_TIMEZONES.filter((tz) => tz !== profile.timezone)].map((tz) => (
                        <option key={tz} value={tz}>
                          {tz}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs text-zinc-500">
                    Language
                    <input
                      type="text"
                      value={profile.languagePref}
                      onChange={(e) => setProfile((p) => ({ ...p, languagePref: e.target.value }))}
                      className={appInputClass(isDark)}
                      placeholder="en-US"
                    />
                  </label>
                  <label className="text-xs text-zinc-500">
                    Theme preference
                    <select
                      value={profile.themePref}
                      onChange={(e) => setProfile((p) => ({ ...p, themePref: e.target.value as 'light' | 'dark' | 'auto' }))}
                      className={appInputClass(isDark)}
                    >
                      <option value="auto">Match system</option>
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                    </select>
                  </label>
                </div>
              </div>
            </section>

            <section className={`rounded-xl p-4 ${appCardClass(isDark)} min-w-0`}>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <p className={`text-xs uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>
                    Role
                  </p>
                  <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                    {user?.role || 'STAFF'}
                  </p>
                  {profile.lastSignInAt && (
                    <p className={`text-[11px] mt-1 ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>
                      Last sign-in {new Date(profile.lastSignInAt).toLocaleString()}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={saving}
                  className={appOutlineButtonClass(isDark)}
                >
                  {saving ? 'Saving…' : 'Save profile'}
                </button>
              </div>
            </section>

            <section className={`rounded-xl p-4 ${appCardClass(isDark)} min-w-0`}>
              <p className={`text-xs uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>
                Product guide tips
              </p>
              <p className={`text-sm mt-1 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                Show the Command home reminder for the in-app walkthrough again.
              </p>
              <button
                type="button"
                onClick={() => resetHqGuideTip()}
                className={`mt-3 ${appOutlineButtonClass(isDark)}`}
              >
                Reset product tips
              </button>
            </section>
          </>
        )}
      </div>
    </SettingsShell>
  );
};

export default ProfilePage;
