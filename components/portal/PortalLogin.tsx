import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getIdTokenResult, signInWithEmailAndPassword } from 'firebase/auth';
import { ArrowLeft, Moon, Sun } from 'lucide-react';
import { UserRole } from '../../types';
import { useAuth } from '../../lib/auth';
import { useAdminTheme } from '../../lib/adminTheme';
import { appInputClass, appPanelClass } from '../../lib/appThemeClasses';
import { authUserFromFirebase } from '../../lib/firebaseAuthUser';
import { messageForFirebaseSignInError } from '../../lib/firebaseAuthError';
import { getFirebaseAuthInstance, isFirebaseConfigured } from '../../lib/firebase';
import { portalDestinationForUser } from '../../lib/authRedirect';

/** Portal sign-in always uses Firebase Auth. */
const PortalLogin: React.FC = () => {
  const { user, logout, isFirebase, loading } = useAuth();
  const { theme, toggleTheme } = useAdminTheme();
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const firebaseReady = isFirebaseConfigured() && isFirebase;

  React.useEffect(() => {
    if (loading) return;
    if (!user) return;
    navigate(portalDestinationForUser(user), { replace: true });
  }, [loading, navigate, user]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (!firebaseReady) {
        setError('Client sign-in is unavailable until Firebase Auth is configured.');
        return;
      }
      const auth = getFirebaseAuthInstance();
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      const token = await getIdTokenResult(cred.user);
      const authUser = authUserFromFirebase(cred.user, token);
      if (authUser.role !== UserRole.CLIENT) {
        setError('This account is not authorized for the client portal.');
        return;
      }
      navigate('/portal', { replace: true });
    } catch (err) {
      setError(messageForFirebaseSignInError(err));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
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
      className={`min-h-screen flex flex-col items-center justify-center p-6 font-sans ${
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
          <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-2">TORP</p>
          <h1 className={`text-2xl font-black tracking-tight mb-2 ${isDark ? 'text-white' : 'text-zinc-900'}`}>
            Client portal
          </h1>
          <p className={`text-sm mb-6 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
            Use your client email and password to review approvals, invoices, and contracts.
          </p>
          {!firebaseReady && (
            <p className={isDark ? 'text-xs text-red-300 mb-4' : 'text-xs text-red-600 mb-4'}>
              Firebase Auth is not configured for this environment. Configure auth to continue.
            </p>
          )}

          {user?.role === UserRole.CLIENT && (
            <p
              className={`text-xs rounded-lg px-3 py-2 mb-4 ${
                isDark
                  ? 'text-amber-200/90 bg-amber-950/40 border border-amber-900/50'
                  : 'text-amber-900 bg-amber-50 border border-amber-200'
              }`}
            >
              Signed in as client.{' '}
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
                placeholder="you@client.com"
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
            {error && <p className={isDark ? 'text-xs text-red-300' : 'text-xs text-red-600'}>{error}</p>}
            <button
              type="submit"
              disabled={busy || !firebaseReady}
              className={`w-full font-bold py-4 rounded-xl transition-all hover:scale-[1.02] disabled:opacity-60 ${
                isDark
                  ? 'bg-white hover:bg-zinc-200 text-black'
                  : 'bg-zinc-900 hover:bg-zinc-800 text-white'
              }`}
            >
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className={`mt-8 text-center text-[11px] ${isDark ? 'text-zinc-600' : 'text-zinc-500'}`}>
            TORP crew?{' '}
            <Link
              to="/hq/login"
              className={
                isDark
                  ? 'text-zinc-400 hover:text-white underline underline-offset-2'
                  : 'text-zinc-600 hover:text-zinc-900 underline underline-offset-2'
              }
            >
              HQ sign-in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default PortalLogin;
