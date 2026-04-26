import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { UserRole } from '../../types';
import { LayoutDashboard, LogOut } from 'lucide-react';
import { useAuth } from '../../lib/auth';
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
    <div className="flex h-screen bg-zinc-950 text-white overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 border-r border-zinc-800 bg-zinc-950/50 hidden md:flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-zinc-800">
          <span className="font-black text-xl tracking-tighter">TORP</span>
          <span className="ml-2 text-xs font-mono text-zinc-500 px-2 py-0.5 border border-zinc-800 rounded">{roleLabel}</span>
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
                    ? 'bg-zinc-900 text-white'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                }`
              }
            >
              <span className="group-hover:text-white transition-colors">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-zinc-800">
          <button onClick={onLogout} className="flex items-center gap-3 w-full px-3 py-2 text-sm text-red-400 hover:bg-red-950/30 rounded-lg transition-colors">
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto no-scrollbar relative">
        <header className="h-16 flex items-center justify-between px-8 border-b border-zinc-800 bg-zinc-950 sticky top-0 z-30">
            <h2 className="font-semibold text-lg text-white">Dashboard</h2>
            <div className="flex items-center gap-4 shrink-0">
              {role === UserRole.STAFF ? (
                <HqProfileMenuCluster
                  variant="staff"
                  user={user}
                  isDark
                  pathname={pathname}
                  updateSessionProfile={updateSessionProfile}
                />
              ) : (
                <div
                  className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-300"
                  title={user?.displayName || user?.email || 'Account'}
                >
                  {initials}
                </div>
              )}
            </div>
        </header>
        <div className="p-8">
            {children}
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;