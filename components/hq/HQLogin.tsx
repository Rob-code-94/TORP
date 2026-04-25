import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { UserRole } from '../../types';
import { useAuth } from '../../lib/auth';
import { authenticateHqUser } from '../../lib/demoHqUsers';

function postLoginPath(role: UserRole): string {
  if (role === UserRole.STAFF) return '/hq/staff';
  if (role === UserRole.ADMIN || role === UserRole.PROJECT_MANAGER) return '/hq/admin';
  return '/hq/login';
}

/** Demo staff/admin sign-in. Phase 2: Firebase Auth + custom claims. */
const HQLogin: React.FC = () => {
  const { user, loginAs, logout } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const result = authenticateHqUser(email, password);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      loginAs(result.user);
      navigate(postLoginPath(result.user.role), { replace: true });
    } finally {
      setBusy(false);
    }
  };

  const goAdminQuick = () => {
    loginAs({ role: UserRole.ADMIN, displayName: 'Admin' });
    navigate('/hq/admin', { replace: true });
  };

  const goStaffQuick = () => {
    loginAs({ role: UserRole.STAFF, displayName: 'Crew', crewId: 'cr-1' });
    navigate('/hq/staff', { replace: true });
  };

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
            Local demo accounts — replace with Firebase Auth. Email is normalized to lowercase for lookup.
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

          <p className="mt-6 text-[11px] text-zinc-600 text-center uppercase tracking-wide">Quick preview</p>
          <div className="mt-2 space-y-2">
            <button
              type="button"
              onClick={goAdminQuick}
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-semibold py-3 rounded-xl text-sm transition-colors"
            >
              Continue as Admin (no password)
            </button>
            <button
              type="button"
              onClick={goStaffQuick}
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-semibold py-3 rounded-xl text-sm transition-colors"
            >
              Continue as Crew (linked to demo crew)
            </button>
          </div>

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
