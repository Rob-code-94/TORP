import React from 'react';
import { useLocation } from 'react-router-dom';
import { UserRole } from '../../types';
import { LayoutDashboard, Calendar, Users, FileText, Settings, LogOut, Video } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { hqUserInitials } from '../../lib/hqUserDisplay';
import HqProfileMenuCluster from '../hq/HqProfileMenu';

interface DashboardLayoutProps {
  role: UserRole;
  children: React.ReactNode;
  onLogout: () => void;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ role, children, onLogout }) => {
  const { user, updateSessionProfile } = useAuth();
  const { pathname } = useLocation();
  const initials = hqUserInitials(user);

  const getNavItems = () => {
    switch (role) {
      case UserRole.ADMIN:
        return [
          { icon: <LayoutDashboard size={20} />, label: "Overview" },
          { icon: <FileText size={20} />, label: "Financials" },
          { icon: <Users size={20} />, label: "Crew" },
          { icon: <Calendar size={20} />, label: "Master Schedule" },
        ];
      case UserRole.STAFF:
        return [
          { icon: <Calendar size={20} />, label: "My Call Sheets" },
          { icon: <Video size={20} />, label: "Gear Check" },
        ];
      case UserRole.CLIENT:
        return [
            { icon: <Video size={20} />, label: "Approvals" },
            { icon: <FileText size={20} />, label: "Invoices" },
        ];
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
          {getNavItems().map((item, idx) => (
            <button key={idx} className="flex items-center gap-3 px-3 py-2.5 w-full text-left text-sm text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg transition-colors group">
              <span className="group-hover:text-white transition-colors">{item.icon}</span>
              {item.label}
            </button>
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