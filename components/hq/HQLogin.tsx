import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getIdTokenResult, sendPasswordResetEmail, signInWithEmailAndPassword } from 'firebase/auth';
import { ArrowLeft, Moon, Sun } from 'lucide-react';
import { UserRole } from '../../types';
import { useAuth } from '../../lib/auth';
import { getFirebaseAuthInstance, isFirebaseConfigured } from '../../lib/firebase';
import { authUserFromFirebase } from '../../lib/firebaseAuthUser';
import { messageForFirebaseSignInError, messageForPasswordResetError } from '../../lib/firebaseAuthError';
import { useAdminTheme } from '../../lib/adminTheme';
import { appInputClass, appPanelClass } from '../../lib/appThemeClasses';
import { hqDestinationForUser } from '../../lib/authRedirect';

/** Sign-in always uses Firebase auth. */
const HQLogin: React.FC = () => {
  const { user, logout, loading: authLoading, isFirebase } = useAuth();
  const { theme, toggleTheme } = useAdminTheme();
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStatus, setForgotStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [forgotError, setForgotError] = useState<string | null>(null);

  const firebaseReady = isFirebaseConfigured() && isFirebase;

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    navigate(hqDestinationForUser(user), { replace: true });
  }, [authLoading, navigate, user]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (!firebaseReady) {
        setError('Sign-in is unavailable until Firebase Auth is configured.');
        return;
      }
      const auth = getFirebaseAuthInstance();
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      const token = await getIdTokenResult(cred.user);
      const u = authUserFromFirebase(cred.user, token);
      navigate(hqDestinationForUser(u), { replace: true });
    } catch (e) {
      setError(messageForFirebaseSignInError(e));
    } finally {
      setBusy(false);
    }
  };

  const sendForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      setForgotError('Email is required.');
      return;
    }
    if (!firebaseReady) {
      setForgotStatus('error');
      setForgotError('Password reset is unavailable until Firebase Auth is configured.');
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
      <div
        className={`min-h-screen flex items-center justify-center p-6 text-sm ${
          isDark ? 'bg-zinc-950 text-zinc-400' : 'bg-zinc-50 text-zinc-600'
        }`}
      >
        Loading…
      </div>
    );
  }

  return (
    <div
      className={`relative min-h-screen flex flex-col items-center justify-center p-6 font-sans min-w-0 ${
        isDark ? 'bg-zinc-950 text-zinc-100' : 'bg-zinc-50 text-zinc-900'
      }`}
    >
      <button
        type="button"
        onClick={toggleTheme}
        className={`fixed right-4 top-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-lg border transition-colors ${
          isDark
            ? 'border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800'
            : 'border-zinc-200 bg-white text-zinc-800 shadow-sm hover:bg-zinc-100'
        }`}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {isDark ? <Sun size={18} /> : <Moon size={18} />}
      </button>
      <div className="w-full max-w-md min-w-0">
        <Link
          to="/"
          className={`inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest transition-colors mb-10 ${
            isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-600 hover:text-zinc-900'
          }`}
        >
          <ArrowLeft size={14} /> Back to site
        </Link>

        <div className={`rounded-2xl p-8 shadow-2xl min-w-0 ${appPanelClass(isDark)}`}>
          <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-2">TORP HQ</p>
          <h1 className={`text-2xl font-black tracking-tight mb-2 ${isDark ? 'text-white' : 'text-zinc-900'}`}>
            Staff sign-in
          </h1>
          <p className={`text-sm mb-6 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
            {firebaseReady
              ? 'Use your organizational email and password. If this is a local setup, add accounts in Firebase and set custom claims for roles.'
              : 'Use your organizational email and password.'}
          </p>
          {!firebaseReady && (
            <p className={isDark ? 'text-xs text-red-300 mb-4' : 'text-xs text-red-600 mb-4'}>
              Firebase Auth is not configured for this environment. Configure auth to continue.
            </p>
          )}

          {user &&
            (user.role === UserRole.ADMIN ||
              user.role === UserRole.PROJECT_MANAGER ||
              user.role === UserRole.STAFF) && (
              <p
                className={`text-xs rounded-lg px-3 py-2 mb-4 break-words ${
                  isDark
                    ? 'text-amber-200/90 bg-amber-950/40 border border-amber-900/50'
                    : 'text-amber-900 bg-amber-50 border border-amber-200'
                }`}
              >
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
                disabled={!firebaseReady}
                className={`mt-1 rounded-xl ${appInputClass(isDark)}`}
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
                disabled={!firebaseReady}
                className={`mt-1 rounded-xl ${appInputClass(isDark)}`}
                placeholder="••••••••"
              />
            </label>
            {error && (
              <p className={isDark ? 'text-xs text-red-300' : 'text-xs text-red-600'}>{error}</p>
            )}
            <button
              type="submit"
              disabled={busy || !firebaseReady}
              className={`w-full font-bold py-4 rounded-xl transition-all hover:scale-[1.01] disabled:opacity-60 ${
                isDark
                  ? 'bg-white text-black hover:bg-zinc-200'
                  : 'bg-zinc-900 text-white hover:bg-zinc-800'
              }`}
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
              className={
                isDark
                  ? 'text-xs text-zinc-500 hover:text-zinc-300 underline underline-offset-2'
                  : 'text-xs text-zinc-600 hover:text-zinc-900 underline underline-offset-2'
              }
            >
              Forgot password?
            </button>
            {forgotOpen && (
              <form
                onSubmit={sendForgot}
                className={`mt-3 space-y-2 rounded-lg border p-3 ${
                  isDark ? 'border-zinc-800 bg-zinc-950/50' : 'border-zinc-200 bg-zinc-100/80'
                }`}
              >
                <p className="text-[11px] text-zinc-500">
                  {firebaseReady
                    ? "We'll email a link if the address is registered. For privacy we show the same message either way."
                    : "We'll email a link if the address is registered. For privacy we show the same message either way."}
                </p>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className={`w-full min-w-0 rounded-lg ${appInputClass(isDark)}`}
                  placeholder="email@org.com"
                />
                {forgotError && (
                  <p className={isDark ? 'text-xs text-red-300' : 'text-xs text-red-600'}>
                    {forgotError}
                  </p>
                )}
                {forgotStatus === 'sent' && (
                  <p className={isDark ? 'text-xs text-emerald-300' : 'text-xs text-emerald-700'}>
                    {firebaseReady
                      ? 'If that address is registered, a reset link was sent. Check your inbox and spam folder.'
                      : 'If that address is registered, a reset link can be sent once Firebase email auth is enabled.'}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={forgotStatus === 'sending'}
                  className={
                    isDark
                      ? 'w-full rounded-lg bg-zinc-800 py-2 text-xs font-bold text-white hover:bg-zinc-700'
                      : 'w-full rounded-lg bg-zinc-200 py-2 text-xs font-bold text-zinc-900 hover:bg-zinc-300'
                  }
                >
                  {forgotStatus === 'sending' ? 'Sending…' : 'Send reset link'}
                </button>
              </form>
            )}
          </div>

          <p className="mt-8 text-center text-[11px] text-zinc-600">
            Need the client portal?{' '}
            <Link
              to="/portal/login"
              className={
                isDark
                  ? 'text-zinc-400 hover:text-white underline underline-offset-2'
                  : 'text-zinc-600 hover:text-zinc-900 underline underline-offset-2'
              }
            >
              Client sign-in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default HQLogin;
