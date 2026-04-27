import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  EmailAuthProvider,
  multiFactor,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  updatePassword,
} from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
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
  getFirebaseAuthInstance,
  getFirebaseFunctionsInstance,
  isFirebaseConfigured,
} from '../../../lib/firebase';
import {
  defaultUserProfile,
  loadUserProfile,
  patchUserProfile,
  type UserProfile,
} from '../../../data/userProfileRepository';

interface SecurityPageProps {
  variant: 'admin' | 'staff';
}

function tenantIdFromUser(tenantId: string | undefined): string {
  return tenantId && tenantId.length > 0 ? tenantId : 'torp-default';
}

const SecurityPage: React.FC<SecurityPageProps> = ({ variant }) => {
  const { user, logout } = useAuth();
  const { theme } = useAdminTheme();
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const tenantId = tenantIdFromUser(user?.tenantId);
  const uid = useMemo(() => {
    try {
      const auth = isFirebaseConfigured() ? getFirebaseAuthInstance() : null;
      return auth?.currentUser?.uid || `demo-${user?.email || 'user'}`;
    } catch {
      return `demo-${user?.email || 'user'}`;
    }
  }, [user?.email]);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [profile, setProfile] = useState<UserProfile>(() =>
    defaultUserProfile({ uid, tenantId, email: user?.email, displayName: user?.displayName }),
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pwBusy, setPwBusy] = useState(false);
  const [revokeBusy, setRevokeBusy] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [recoveryBusy, setRecoveryBusy] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [mfaCount, setMfaCount] = useState(0);
  const [lastSignInAt, setLastSignInAt] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    void loadUserProfile({
      uid,
      tenantId,
      email: user?.email,
      displayName: user?.displayName,
    }).then((p) => {
      if (!mounted) return;
      setProfile(p);
      setRecoveryEmail(p.recoveryEmail || '');
    });
    return () => {
      mounted = false;
    };
  }, [uid, tenantId, user?.email, user?.displayName]);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setMfaCount(0);
      setLastSignInAt(null);
      return;
    }
    try {
      const auth = getFirebaseAuthInstance();
      const current = auth.currentUser;
      setMfaCount(current ? multiFactor(current).enrolledFactors.length : 0);
      setLastSignInAt(current?.metadata?.lastSignInTime || null);
    } catch {
      setMfaCount(0);
      setLastSignInAt(null);
    }
  }, [user?.email]);

  const handleChangePassword = async () => {
    setError(null);
    setSuccess(null);
    if (!isFirebaseConfigured()) {
      setError('Sign-in is in demo mode. Connect Firebase to change your password.');
      return;
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }
    setPwBusy(true);
    try {
      const auth = getFirebaseAuthInstance();
      const u = auth.currentUser;
      if (!u || !u.email) {
        throw new Error('Not signed in.');
      }
      const cred = EmailAuthProvider.credential(u.email, currentPassword);
      await reauthenticateWithCredential(u, cred);
      await updatePassword(u, newPassword);
      setSuccess('Password updated. You may need to sign in again on other devices.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      const e = err as { code?: string; message?: string };
      if (e?.code === 'auth/wrong-password') {
        setError('Current password is incorrect.');
      } else if (e?.code === 'auth/weak-password') {
        setError('Password is too weak — pick at least 8 characters with mixed case.');
      } else if (e?.code === 'auth/requires-recent-login') {
        setError('Please sign out and back in, then try changing your password again.');
      } else {
        setError(e?.message || 'Could not update password.');
      }
    } finally {
      setPwBusy(false);
    }
  };

  const handleSendReset = async () => {
    setError(null);
    setSuccess(null);
    if (!isFirebaseConfigured()) {
      setError('Demo mode — connect Firebase to send password reset emails.');
      return;
    }
    if (!user?.email) {
      setError('No email on file.');
      return;
    }
    setResetBusy(true);
    try {
      const auth = getFirebaseAuthInstance();
      await sendPasswordResetEmail(auth, user.email);
      setSuccess(`Password reset email sent to ${user.email}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send reset email.');
    } finally {
      setResetBusy(false);
    }
  };

  const handleRevokeAll = async () => {
    setError(null);
    setSuccess(null);
    if (!isFirebaseConfigured()) {
      setError('Demo mode — connect Firebase to sign out everywhere.');
      return;
    }
    if (!confirmRevoke) {
      setConfirmRevoke(true);
      return;
    }
    setRevokeBusy(true);
    try {
      const fn = httpsCallable<Record<string, never>, { ok: true }>(
        getFirebaseFunctionsInstance(),
        'revokeAllUserSessions',
      );
      await fn({});
      logout();
      navigate('/hq/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not revoke sessions.');
    } finally {
      setRevokeBusy(false);
      setConfirmRevoke(false);
    }
  };

  const handleSaveRecoveryEmail = async () => {
    setError(null);
    setSuccess(null);
    setRecoveryBusy(true);
    try {
      const trimmed = recoveryEmail.trim();
      if (trimmed && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        throw new Error('Recovery email looks invalid.');
      }
      await patchUserProfile({ tenantId, uid }, { recoveryEmail: trimmed || null });
      setProfile((p) => ({ ...p, recoveryEmail: trimmed || null }));
      setSuccess('Recovery email saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save recovery email.');
    } finally {
      setRecoveryBusy(false);
    }
  };

  return (
    <SettingsShell
      title="Security"
      subtitle="Account safety controls. Admin password tools for crew live in the Crew tab."
      variant={variant}
    >
      <div className="space-y-4 min-w-0">
        {error && (
          <div className={`rounded-lg px-3 py-2 text-xs ${appErrorBannerClass(isDark)}`}>{error}</div>
        )}
        {success && (
          <div className={`rounded-lg px-3 py-2 text-xs ${appSuccessBannerClass(isDark)}`}>{success}</div>
        )}

        <section className={`rounded-xl p-4 ${appCardClass(isDark)} min-w-0`}>
          <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
            Change password
          </h3>
          <p className={`text-xs mt-1 mb-3 ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>
            Re-enter your current password, then choose a new one (at least 8 characters).
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
            <label className="text-xs text-zinc-500 sm:col-span-2">
              Current password
              <input
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className={appInputClass(isDark)}
              />
            </label>
            <label className="text-xs text-zinc-500">
              New password
              <input
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={appInputClass(isDark)}
              />
            </label>
            <label className="text-xs text-zinc-500">
              Confirm new password
              <input
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={appInputClass(isDark)}
              />
            </label>
          </div>
          <div className="mt-3 flex items-center justify-end gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => void handleSendReset()}
              className={appOutlineButtonClass(isDark)}
              disabled={resetBusy}
            >
              {resetBusy ? 'Sending…' : 'Email me a reset link'}
            </button>
            <button
              type="button"
              onClick={() => void handleChangePassword()}
              className={appOutlineButtonClass(isDark)}
              disabled={pwBusy}
            >
              {pwBusy ? 'Updating…' : 'Update password'}
            </button>
          </div>
        </section>

        <section className={`rounded-xl p-4 ${appCardClass(isDark)} min-w-0`}>
          <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
            Recovery email
          </h3>
          <p className={`text-xs mt-1 mb-3 ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>
            We'll send password resets here if you lose access to your primary inbox.
          </p>
          <div className="flex flex-col sm:flex-row sm:items-end gap-2">
            <label className="text-xs text-zinc-500 flex-1">
              Email
              <input
                type="email"
                value={recoveryEmail}
                onChange={(e) => setRecoveryEmail(e.target.value)}
                className={appInputClass(isDark)}
                placeholder="me@example.com"
              />
            </label>
            <button
              type="button"
              onClick={() => void handleSaveRecoveryEmail()}
              className={appOutlineButtonClass(isDark)}
              disabled={recoveryBusy}
            >
              {recoveryBusy ? 'Saving…' : 'Save recovery'}
            </button>
          </div>
          {profile.recoveryEmail && (
            <p className={`mt-2 text-[11px] ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>
              Saved: {profile.recoveryEmail}
            </p>
          )}
        </section>

        <section className={`rounded-xl p-4 ${appCardClass(isDark)} min-w-0`}>
          <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
            Sign out everywhere
          </h3>
          <p className={`text-xs mt-1 mb-3 ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>
            Revokes every active session for your account on every device. You'll need to sign in
            again here. Useful if you lost a device or shared your password by mistake.
          </p>
          <div className="flex items-center justify-end gap-2 flex-wrap">
            {confirmRevoke && (
              <span className={`text-xs ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
                Click again to confirm — this will sign you out of every device.
              </span>
            )}
            <button
              type="button"
              onClick={() => void handleRevokeAll()}
              className={appOutlineButtonClass(isDark)}
              disabled={revokeBusy}
            >
              {revokeBusy
                ? 'Revoking…'
                : confirmRevoke
                  ? 'Yes, sign me out everywhere'
                  : 'Sign out everywhere'}
            </button>
          </div>
        </section>

        <section className={`rounded-xl p-4 ${appCardClass(isDark)} min-w-0`}>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                Two-factor authentication
              </h3>
              <p className={`text-xs mt-1 ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>
                Protect your account with an extra factor and review active session metadata.
              </p>
            </div>
            <span
              className={`text-[10px] uppercase tracking-wide rounded-full px-2 py-0.5 ${
                mfaCount > 0
                  ? isDark
                    ? 'bg-emerald-900/40 text-emerald-300'
                    : 'bg-emerald-50 text-emerald-700'
                  : isDark
                    ? 'bg-zinc-800 text-zinc-400'
                    : 'bg-zinc-100 text-zinc-600'
              }`}
            >
              {mfaCount > 0 ? `${mfaCount} factor${mfaCount > 1 ? 's' : ''}` : 'Not enabled'}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className={`rounded-lg px-3 py-2 ${isDark ? 'bg-zinc-900/60' : 'bg-zinc-50'}`}>
              <p className="text-[11px] uppercase tracking-wide text-zinc-500">Last sign-in</p>
              <p className={`text-sm mt-1 ${isDark ? 'text-zinc-200' : 'text-zinc-900'}`}>
                {lastSignInAt ? new Date(lastSignInAt).toLocaleString() : 'Unavailable in demo mode'}
              </p>
            </div>
            <div className={`rounded-lg px-3 py-2 ${isDark ? 'bg-zinc-900/60' : 'bg-zinc-50'}`}>
              <p className="text-[11px] uppercase tracking-wide text-zinc-500">Active session</p>
              <p className={`text-sm mt-1 ${isDark ? 'text-zinc-200' : 'text-zinc-900'}`}>
                This browser ({typeof navigator === 'undefined' ? 'unknown' : navigator.platform || 'web'})
              </p>
            </div>
          </div>
          <p className={`text-[11px] mt-3 ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>
            Enrollment flows (SMS/TOTP challenge) are available when your Firebase Auth provider is configured for MFA.
          </p>
        </section>
      </div>
    </SettingsShell>
  );
};

export default SecurityPage;
