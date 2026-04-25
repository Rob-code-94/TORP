import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { UserRole } from '../../types';
import { useAuth } from '../../lib/auth';

/** Demo staff/admin sign-in. Phase 2: Firebase Auth + custom claims. */
const HQLogin: React.FC = () => {
  const { user, loginAs, logout } = useAuth();
  const navigate = useNavigate();

  const goAdmin = () => {
    loginAs(UserRole.ADMIN, 'Admin');
    navigate('/hq/admin', { replace: true });
  };

  const goStaff = () => {
    loginAs(UserRole.STAFF, 'Crew');
    navigate('/hq/staff', { replace: true });
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-zinc-300 transition-colors mb-10"
        >
          <ArrowLeft size={14} /> Back to site
        </Link>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-8 shadow-2xl">
          <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-2">TORP HQ</p>
          <h1 className="text-2xl font-black tracking-tight text-white mb-2">Staff sign-in</h1>
          <p className="text-sm text-zinc-400 mb-8">
            Demo access — replace with Firebase Auth. Choose a role to preview the dashboard.
          </p>

          {user && (user.role === UserRole.ADMIN || user.role === UserRole.PROJECT_MANAGER || user.role === UserRole.STAFF) && (
            <p className="text-xs text-amber-200/90 bg-amber-950/40 border border-amber-900/50 rounded-lg px-3 py-2 mb-4">
              Signed in as {user.role}.{' '}
              <button type="button" onClick={() => logout()} className="underline font-semibold">
                Sign out
              </button>
            </p>
          )}

          <div className="space-y-3">
            <button
              type="button"
              onClick={goAdmin}
              className="w-full bg-white hover:bg-zinc-200 text-black font-bold py-4 rounded-xl transition-all hover:scale-[1.02]"
            >
              Continue as Admin
            </button>
            <button
              type="button"
              onClick={goStaff}
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-4 rounded-xl transition-all hover:scale-[1.02]"
            >
              Continue as Crew
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
