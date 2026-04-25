import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { UserRole } from '../../types';
import { useAuth } from '../../lib/auth';

/** Demo client sign-in. Phase 2: Firebase Auth scoped to client org. */
const PortalLogin: React.FC = () => {
  const { user, loginAs, logout } = useAuth();
  const navigate = useNavigate();

  const goClient = () => {
    loginAs({ role: UserRole.CLIENT, displayName: 'Client' });
    navigate('/portal', { replace: true });
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
          <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-2">TORP</p>
          <h1 className="text-2xl font-black tracking-tight text-white mb-2">Client portal</h1>
          <p className="text-sm text-zinc-400 mb-8">
            Demo access — approvals, invoices, and contracts (mock data).
          </p>

          {user?.role === UserRole.CLIENT && (
            <p className="text-xs text-amber-200/90 bg-amber-950/40 border border-amber-900/50 rounded-lg px-3 py-2 mb-4">
              Signed in as client.{' '}
              <button type="button" onClick={() => logout()} className="underline font-semibold">
                Sign out
              </button>
            </p>
          )}

          <button
            type="button"
            onClick={goClient}
            className="w-full bg-white hover:bg-zinc-200 text-black font-bold py-4 rounded-xl transition-all hover:scale-[1.02]"
          >
            Continue as Client (demo)
          </button>

          <p className="mt-8 text-center text-[11px] text-zinc-600">
            TORP crew?{' '}
            <Link to="/hq/login" className="text-zinc-400 hover:text-white underline underline-offset-2">
              HQ sign-in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default PortalLogin;
