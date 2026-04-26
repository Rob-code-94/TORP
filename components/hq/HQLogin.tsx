import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getIdTokenResult, sendPasswordResetEmail, signInWithEmailAndPassword } from 'firebase/auth';
import { ArrowLeft } from 'lucide-react';
import { UserRole } from '../../types';
import { useAuth, type AuthUser } from '../../lib/auth';
import { authenticateHqUser } from '../../lib/demoHqUsers';
import { getFirebaseAuthInstance, isFirebaseConfigured } from '../../lib/firebase';
import { authUserFromFirebase } from '../../lib/firebaseAuthUser';
import { messageForFirebaseSignInError, messageForPasswordResetError } from '../../lib/firebaseAuthError';

function postLoginPathForUser(u: AuthUser): string {
  if (u.role === UserRole.STAFF) return '/hq/staff';
  if (u.role === UserRole.ADMIN || u.role === UserRole.PROJECT_MANAGER) return '/hq/admin';
  if (u.role === UserRole.CLIENT) return '/portal';
  return '/hq/login';
}

/** Sign-in: Firebase when configured; otherwise local demo session. */
const HQLogin: React.FC = () => {
  const { user, loginAs, logout, loading: authLoading, isFirebase } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStatus, setForgotStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [forgotError, setForgotError] = useState<string | null>(null);

  const useFirebase = isFirebaseConfigured() && isFirebase;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (useFirebase) {
        const auth = getFirebaseAuthInstance();
        const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
        const token = await getIdTokenResult(cred.user);
        const u = authUserFromFirebase(cred.user, token);
        navigate(postLoginPathForUser(u), { replace: true });
      } else {
        const result = authenticateHqUser(email, password);
        if (result.ok === false) {
          setError(result.error);
          return;
        }
        loginAs(result.user);
        navigate(postLoginPathForUser(result.user), { replace: true });
      }
    } catch (e) {
      setError(messageForFirebaseSignInError(e));
    } finally {
      setBusy(false);
    }
  };

  const goAdminQuick = async () => {
    setError(null);
    if (useFirebase) {
      setBusy(true);
      try {
        const auth = getFirebaseAuthInstance();
        const cred = await signInWithEmailAndPassword(auth, 'info@torp.life', 'Admin1234');
        const token = await getIdTokenResult(cred.user);
        const u = authUserFromFirebase(cred.user, token);
        navigate(postLoginPathForUser(u), { replace: true });
      } catch (e) {
        setError(messageForFirebaseSignInError(e));
      } finally {
        setBusy(false);
      }
    } else {
      loginAs({ role: UserRole.ADMIN, displayName: 'Admin' });
      navigate('/hq/admin', { replace: true });
    }
  };

  const goStaffQuick = async () => {
    setError(null);
    if (useFirebase) {
      setBusy(true);
      try {
        const auth = getFirebaseAuthInstance();
        const cred = await signInWithEmailAndPassword(auth, 'staff@torp.life', 'Staff1234');
        const token = await getIdTokenResult(cred.user);
        const u = authUserFromFirebase(cred.user, token);
        navigate(postLoginPathForUser(u), { replace: true });
      } catch (e) {
        setError(messageForFirebaseSignInError(e));
      } finally {
        setBusy(false);
      }
    } else {
      loginAs({ role: UserRole.STAFF, displayName: 'Crew', crewId: 'cr-1' });
      navigate('/hq/staff', { replace: true });
    }
  };

  const sendForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      setForgotError('Email is required.');
      return;
    }
    if (!useFirebase) {
      setForgotStatus('sent');
      setForgotError(null);
      return;
    }
    setForgotError(null);
    setForgotStatus('sending');
    try {
      const auth = getFirebaseAuthInstance();
      await sendPasswordResetEmail(auth, forgotEmail.trim().toLowerCase());
      setForgotStatus('sent');
    } catch (err) {
      setForgotStatus('error');
      setForgotError(messageForPasswordResetError(err));
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-400 flex items-center justify-center p-6 text-sm">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-6 font-sans min-w-0">
      <div className="w-full max-w-md min-w-0">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-zinc-300 transition-colors mb-10"
        >
          <ArrowLeft size={14} /> Back to site
        </Link>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-8 shadow-2xl min-w-0">
          <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-2">TORP HQ</p>
          <h1 className="text-2xl font-black tracking-tight text-white mb-2">Staff sign-in</h1>
          <p className="text-sm text-zinc-400 mb-6">
            {useFirebase
              ? 'Use your organizational email and password. If this is a local setup, add accounts in Firebase and set custom claims for roles.'
              : 'Local sign-in mode: email is normalized to lowercase for lookup.'}
          </p>

          {user &&
            (user.role === UserRole.ADMIN ||
              user.role === UserRole.PROJECT_MANAGER ||
              user.role === UserRole.STAFF) && (
              <p className="text-xs text-amber-200/90 bg-amber-950/40 border border-amber-900/50 rounded-lg px-3 py-2 mb-4 break-words">
                Signed in as {user.displayName || user.email || user.role}.{' '}
                <button type="button" onClick={() => logout()} className="underline font-semibold">
                  Sign out
                </button>
              </p>
            )}

          <form onSubmit={submit} className="space-y-3 min-w-0">
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              Email
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full min-w-0 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-3 text-sm text-zinc-100"
                placeholder="you@torp.life"
              />
            </label>
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              Password
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full min-w-0 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-3 text-sm text-zinc-100"
                placeholder="••••••••"
              />
            </label>
            {error && <p className="text-xs text-red-300">{error}</p>}
            <button
              type="submit"
              disabled={busy}
              className="w-full bg-white hover:bg-zinc-200 disabled:opacity-60 text-black font-bold py-4 rounded-xl transition-all hover:scale-[1.01]"
            >
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="mt-3">
            <button
              type="button"
              onClick={() => {
                setForgotOpen((v) => !v);
                setForgotEmail(email);
                setForgotStatus('idle');
                setForgotError(null);
              }}
              className="text-xs text-zinc-500 hover:text-zinc-300 underline underline-offset-2"
            >
              Forgot password?
            </button>
            {forgotOpen && (
              <form onSubmit={sendForgot} className="mt-3 space-y-2 rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
                <p className="text-[11px] text-zinc-500">
                  {useFirebase
                    ? "We'll email a link if the address is registered. For privacy we show the same message either way."
                    : 'Password reset links send automatically when Firebase email auth is enabled.'}
                </p>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="w-full min-w-0 rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm"
                  placeholder="email@org.com"
                />
                {forgotError && <p className="text-xs text-red-300">{forgotError}</p>}
                {forgotStatus === 'sent' && (
                  <p className="text-xs text-emerald-300">
                    {useFirebase
                      ? 'If that address is registered, a reset link was sent. Check your inbox and spam folder.'
                      : 'If that address is registered, a reset link can be sent once Firebase email auth is enabled.'}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={forgotStatus === 'sending'}
                  className="w-full rounded-lg bg-zinc-800 py-2 text-xs font-bold text-white hover:bg-zinc-700"
                >
                  {forgotStatus === 'sending' ? 'Sending…' : 'Send reset link'}
                </button>
              </form>
            )}
          </div>

          {import.meta.env.DEV && (
            <>
              <p className="mt-6 text-[11px] text-zinc-600 text-center uppercase tracking-wide">Quick preview (dev only)</p>
              <div className="mt-2 space-y-2">
                <button
                  type="button"
                  onClick={goAdminQuick}
                  disabled={busy}
                  className="w-full bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm transition-colors"
                >
                  Continue as Admin{useFirebase ? ' (Firebase: info@torp.life)' : ' (no password)'}
                </button>
                <button
                  type="button"
                  onClick={goStaffQuick}
                  disabled={busy}
                  className="w-full bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm transition-colors"
                >
                  Continue as Crew{useFirebase ? ' (Firebase: staff@torp.life)' : ' (local crew profile)'}
                </button>
              </div>
            </>
          )}

          <p className="mt-8 text-center text-[11px] text-zinc-600">
            Need the client portal?{' '}
            <Link to="/portal/login" className="text-zinc-400 hover:text-white underline underline-offset-2">
              Client sign-in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default HQLogin;
