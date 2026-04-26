import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Moon, Sun } from 'lucide-react';
import { UserRole } from '../../types';
import { useAuth } from '../../lib/auth';
import { useAdminTheme } from '../../lib/adminTheme';
import { appPanelClass } from '../../lib/appThemeClasses';

/** Demo client sign-in. Phase 2: Firebase Auth scoped to client org. */
const PortalLogin: React.FC = () => {
  const { user, loginAs, logout } = useAuth();
  const { theme, toggleTheme } = useAdminTheme();
  const isDark = theme === 'dark';
  const navigate = useNavigate();

  const goClient = () => {
    loginAs({ role: UserRole.CLIENT, displayName: 'Client' });
    navigate('/portal', { replace: true });
  };

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
          <p className={`text-sm mb-8 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
            Demo access — approvals, invoices, and contracts (mock data).
          </p>

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

          <button
            type="button"
            onClick={goClient}
            className={`w-full font-bold py-4 rounded-xl transition-all hover:scale-[1.02] ${
              isDark
                ? 'bg-white hover:bg-zinc-200 text-black'
                : 'bg-zinc-900 hover:bg-zinc-800 text-white'
            }`}
          >
            Continue as Client (demo)
          </button>

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
