import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { UserRole } from '../../types';
import { LayoutDashboard, LogOut, Moon, Sun } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { useAdminTheme } from '../../lib/adminTheme';
import { appPageBgClass } from '../../lib/appThemeClasses';
import { hqUserInitials } from '../../lib/hqUserDisplay';
import HqProfileMenuCluster from '../hq/HqProfileMenu';

interface DashboardLayoutProps {
  role: UserRole;
  children: React.ReactNode;
  onLogout: () => void;
}

type NavItem = { icon: React.ReactNode; label: string; to: string };

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ role, children, onLogout }) => {
  const { user, updateSessionProfile } = useAuth();
  const { theme, toggleTheme } = useAdminTheme();
  const isDark = theme === 'dark';
  const { pathname } = useLocation();
  const initials = hqUserInitials(user);

  // Only render nav entries that route somewhere real. Modules without a
  // landing route (financials, gear check, approvals, etc.) live elsewhere
  // and must not appear here as no-op buttons.
  const getNavItems = (): NavItem[] => {
    switch (role) {
      case UserRole.STAFF:
        return [{ icon: <LayoutDashboard size={20} />, label: 'Overview', to: '/hq/staff' }];
      case UserRole.CLIENT:
        return [{ icon: <LayoutDashboard size={20} />, label: 'Overview', to: '/portal' }];
      case UserRole.ADMIN:
      case UserRole.PROJECT_MANAGER:
        return [{ icon: <LayoutDashboard size={20} />, label: 'Overview', to: '/hq/admin' }];
      default:
        return [];
    }
  };

  const roleLabel = role === UserRole.ADMIN ? 'Staff Portal' : role === UserRole.STAFF ? 'Crew Portal' : 'Client Suite';

  return (
    <div className={`flex h-screen overflow-hidden font-sans ${appPageBgClass(isDark)}`}>
      <aside
        className={`w-64 border-r hidden md:flex flex-col ${
          isDark ? 'border-zinc-800 bg-zinc-950/50' : 'border-zinc-200 bg-white'
        }`}
      >
        <div className={`h-16 flex items-center px-6 border-b ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
          <span className={`font-black text-xl tracking-tighter ${isDark ? 'text-white' : 'text-zinc-900'}`}>TORP</span>
          <span
            className={`ml-2 text-xs font-mono px-2 py-0.5 border rounded ${
              isDark ? 'text-zinc-500 border-zinc-800' : 'text-zinc-600 border-zinc-200'
            }`}
          >
            {roleLabel}
          </span>
        </div>

        <nav className="flex-1 py-6 px-3 space-y-1">
          {getNavItems().map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 w-full text-left text-sm rounded-lg transition-colors group ${
                  isActive
                    ? isDark
                      ? 'bg-zinc-900 text-white'
                      : 'bg-zinc-200 text-zinc-950'
                    : isDark
                      ? 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                      : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                }`
              }
            >
              <span
                className={
                  isDark ? 'group-hover:text-white transition-colors' : 'group-hover:text-zinc-900 transition-colors'
                }
              >
                {item.icon}
              </span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className={`p-4 border-t ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
          <button
            onClick={onLogout}
            className={`flex items-center gap-3 w-full px-3 py-2 text-sm rounded-lg transition-colors ${
              isDark ? 'text-red-400 hover:bg-red-950/30' : 'text-red-700 hover:bg-red-100'
            }`}
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto no-scrollbar relative min-w-0">
        <header
          className={`h-16 flex items-center justify-between px-4 sm:px-8 border-b sticky top-0 z-30 ${
            isDark ? 'border-zinc-800 bg-zinc-950' : 'border-zinc-200 bg-white/95'
          }`}
        >
          <h2 className={`font-semibold text-lg ${isDark ? 'text-white' : 'text-zinc-900'}`}>Dashboard</h2>
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <button
              type="button"
              onClick={toggleTheme}
              className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors ${
                isDark
                  ? 'border-zinc-700 text-zinc-300 hover:text-white'
                  : 'border-zinc-300 text-zinc-700 hover:text-zinc-900'
              }`}
              aria-label="Toggle theme"
            >
              {isDark ? <Sun size={14} /> : <Moon size={14} />}
              {isDark ? 'Light' : 'Dark'}
            </button>
            {role === UserRole.STAFF ? (
              <HqProfileMenuCluster
                variant="staff"
                user={user}
                isDark={isDark}
                pathname={pathname}
                updateSessionProfile={updateSessionProfile}
              />
            ) : (
              <div
                className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs font-bold ${
                  isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-300' : 'bg-zinc-200 border-zinc-300 text-zinc-800'
                }`}
                title={user?.displayName || user?.email || 'Account'}
              >
                {initials}
              </div>
            )}
          </div>
        </header>
        <div className="p-4 sm:p-8 min-w-0">{children}</div>
      </main>
    </div>
  );
};

export default DashboardLayout;