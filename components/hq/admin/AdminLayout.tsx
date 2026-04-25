import React, { useMemo, useState } from 'react';
import { NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Building2,
  LayoutDashboard,
  Film,
  KanbanSquare,
  Banknote,
  LogOut,
  Settings,
  Users,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  Moon,
  Sun,
  X,
} from 'lucide-react';
import { useAuth, type AuthUser } from '../../../lib/auth';
import { useAdminTheme } from '../../../lib/adminTheme';
import { canHqAdminAccessPath, hqAdminNavIdsForRole } from '../../../lib/hqAccess';
import { UserRole } from '../../../types';

type NavItem = {
  id: string;
  to: string;
  label: string;
  icon: React.ReactNode;
  match: (p: string) => boolean;
};

function hqUserBadge(user: AuthUser | null): string {
  if (!user) return '…';
  if (user.role === UserRole.PROJECT_MANAGER) return 'PM';
  const name = user.displayName?.trim() || user.email || '';
  if (!name) return 'HQ';
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

const nav: NavItem[] = [
  {
    id: 'command',
    to: '/hq/admin',
    label: 'Command',
    icon: <LayoutDashboard size={20} />,
    match: (p) => p === '/hq/admin' || p === '/hq/admin/',
  },
  {
    id: 'crew',
    to: '/hq/admin/crew',
    label: 'Crew',
    icon: <Users size={20} />,
    match: (p) => p.startsWith('/hq/admin/crew'),
  },
  {
    id: 'projects',
    to: '/hq/admin/projects',
    label: 'Projects',
    icon: <Film size={20} />,
    match: (p) => p.startsWith('/hq/admin/projects'),
  },
  {
    id: 'planner',
    to: '/hq/admin/planner',
    label: 'Planner',
    icon: <KanbanSquare size={20} />,
    match: (p) => p.startsWith('/hq/admin/planner'),
  },
  {
    id: 'financials',
    to: '/hq/admin/financials',
    label: 'Financials',
    icon: <Banknote size={20} />,
    match: (p) => p.startsWith('/hq/admin/financials'),
  },
  {
    id: 'clients',
    to: '/hq/admin/clients',
    label: 'Clients',
    icon: <Building2 size={20} />,
    match: (p) => p.startsWith('/hq/admin/clients'),
  },
  {
    id: 'settings',
    to: '/hq/admin/settings',
    label: 'Settings',
    icon: <Settings size={20} />,
    match: (p) => p.startsWith('/hq/admin/settings'),
  },
];

function pageTitle(pathname: string): string {
  for (const item of nav) {
    if (item.match(pathname)) {
      if (pathname.match(/^\/hq\/admin\/projects\/[^/]+$/)) {
        return 'Project';
      }
      return item.label;
    }
  }
  return 'Admin';
}

/** Route-aware HQ shell for `UserRole.ADMIN` only. */
const AdminLayout: React.FC = () => {
  const { logout, user } = useAuth();
  const { theme, toggleTheme } = useAdminTheme();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const title = pageTitle(pathname);
  const isDark = theme === 'dark';
  const allowedNavIds = useMemo(() => new Set(hqAdminNavIdsForRole(user?.role)), [user?.role]);
  const filteredNav = useMemo(() => nav.filter((item) => allowedNavIds.has(item.id)), [allowedNavIds]);
  const middleDockIds = new Set(['crew', 'clients']);
  const primaryNav = filteredNav.filter((item) => !middleDockIds.has(item.id));
  const middleDockNav = filteredNav.filter((item) => middleDockIds.has(item.id));

  if (user && !canHqAdminAccessPath(pathname, user.role)) {
    return <Navigate to="/hq/admin" replace />;
  }

  const onLogout = () => {
    logout();
    navigate('/hq/login');
  };

  const renderNavItems = (items: NavItem[], compact: boolean, onNavigate?: () => void) =>
    items.map((item) => {
      const active = item.match(pathname);
      return (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/hq/admin'}
          onClick={onNavigate}
          className={() =>
            [
              'flex items-center rounded-lg text-sm font-medium transition-colors',
              compact ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5',
              active
                ? isDark
                  ? 'bg-zinc-900 text-white'
                  : 'bg-zinc-200 text-zinc-950'
                : isDark
                  ? 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900/60'
                  : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-200',
            ].join(' ')
          }
          title={item.label}
        >
          {item.icon}
          {!compact && item.label}
        </NavLink>
      );
    });

  return (
    <div className={`flex h-screen overflow-hidden font-sans ${isDark ? 'bg-zinc-950 text-white' : 'bg-zinc-50 text-zinc-900'}`}>
      <aside
        className={[
          `hidden md:flex flex-col shrink-0 transition-all duration-200 border-r ${
            isDark ? 'border-zinc-800 bg-black/40' : 'border-zinc-200 bg-white'
          }`,
          sidebarCollapsed ? 'w-20' : 'w-64',
        ].join(' ')}
      >
        <div
          className={[
            `h-16 flex items-center border-b ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`,
            sidebarCollapsed ? 'px-3 justify-center' : 'px-6',
          ].join(' ')}
        >
          <span className="font-black text-xl tracking-tighter">{sidebarCollapsed ? 'T' : 'TORP'}</span>
          {!sidebarCollapsed && (
            <span className={`ml-2 text-[10px] font-mono px-2 py-0.5 border rounded uppercase ${isDark ? 'text-zinc-500 border-zinc-800' : 'text-zinc-600 border-zinc-200'}`}>
              {user?.role === UserRole.PROJECT_MANAGER ? 'PM' : 'Admin'}
            </span>
          )}
        </div>
        <nav
          className={[
            'flex-1 py-4 space-y-0.5 overflow-y-auto',
            sidebarCollapsed ? 'px-2' : 'px-3',
          ].join(' ')}
        >
          {renderNavItems(primaryNav, sidebarCollapsed)}
        </nav>
        <div className={`px-2 pb-3 ${sidebarCollapsed ? '' : 'px-3'} flex justify-center`}>
          <div className={`w-full max-w-[220px] rounded-xl border p-1.5 space-y-1.5 ${isDark ? 'border-zinc-800 bg-zinc-950/70' : 'border-zinc-200 bg-zinc-50'}`}>
            {renderNavItems(middleDockNav, sidebarCollapsed)}
          </div>
        </div>
        <div className={`p-4 border-t ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
          <button
            type="button"
            onClick={onLogout}
            className={[
              `w-full px-3 py-2 text-sm rounded-lg transition-colors flex items-center ${
                isDark ? 'text-red-400 hover:bg-red-950/30' : 'text-red-700 hover:bg-red-100'
              }`,
              sidebarCollapsed ? 'justify-center' : 'gap-3',
            ].join(' ')}
            title="Sign out"
          >
            <LogOut size={18} />
            {!sidebarCollapsed && 'Sign out'}
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className={`h-14 flex items-center justify-between px-4 sm:px-6 border-b shrink-0 z-20 ${isDark ? 'border-zinc-800 bg-zinc-950/90' : 'border-zinc-200 bg-white/95'}`}>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className={`inline-flex md:hidden p-1.5 rounded-md border ${isDark ? 'border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700' : 'border-zinc-300 text-zinc-600 hover:text-zinc-900 hover:border-zinc-400'}`}
              aria-label="Open navigation"
              title="Open navigation"
            >
              <Menu size={16} />
            </button>
            <button
              type="button"
              onClick={() => setSidebarCollapsed((v) => !v)}
              className={`hidden md:inline-flex p-1.5 rounded-md border ${isDark ? 'border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700' : 'border-zinc-300 text-zinc-600 hover:text-zinc-900 hover:border-zinc-400'}`}
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
            </button>
            <h1 className={`text-sm font-semibold tracking-tight truncate ${isDark ? 'text-white' : 'text-zinc-900'}`}>
              {title}
              {pathname.match(/^\/hq\/admin\/projects\/[^/]+$/) && (
                <span className={`ml-2 font-normal ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}> / detail</span>
              )}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors ${
                isDark
                  ? 'border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-600'
                  : 'border-zinc-200 text-zinc-700 hover:text-zinc-900 hover:border-zinc-300'
              }`}
              aria-label="Toggle admin theme"
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? <Sun size={14} /> : <Moon size={14} />}
              {isDark ? 'Light' : 'Dark'}
            </button>
            <div
              className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs font-bold ${
                isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-300' : 'bg-zinc-100 border-zinc-200 text-zinc-800'
              }`}
              title={user?.displayName || 'HQ'}
            >
              {hqUserBadge(user)}
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto no-scrollbar p-4 sm:p-6">
          <Outlet />
        </div>
      </main>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileNavOpen(false)}
            aria-label="Close navigation"
          />
          <aside className={`absolute left-0 top-0 h-full w-72 max-w-[85vw] border-r flex flex-col ${isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-200'}`}>
            <div className={`h-14 px-4 border-b flex items-center justify-between ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
              <div className="flex items-center gap-2">
                <span className="font-black tracking-tighter">TORP</span>
                <span className={`text-[10px] font-mono px-2 py-0.5 border rounded uppercase ${isDark ? 'text-zinc-500 border-zinc-800' : 'text-zinc-600 border-zinc-200'}`}>
                  {user?.role === UserRole.PROJECT_MANAGER ? 'PM' : 'Admin'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleTheme}
                  className={`p-1.5 rounded-md border ${isDark ? 'border-zinc-800 text-zinc-400 hover:text-white' : 'border-zinc-200 text-zinc-600 hover:text-zinc-900'}`}
                  aria-label="Toggle admin theme"
                  title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                  {isDark ? <Sun size={14} /> : <Moon size={14} />}
                </button>
                <button
                  type="button"
                  onClick={() => setMobileNavOpen(false)}
                  className={`p-1.5 rounded-md border ${isDark ? 'border-zinc-800 text-zinc-400 hover:text-white' : 'border-zinc-200 text-zinc-600 hover:text-zinc-900'}`}
                  aria-label="Close navigation"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
              {renderNavItems(primaryNav, false, () => setMobileNavOpen(false))}
            </nav>
            <div className="px-3 pb-3">
              <div className={`rounded-xl border p-1.5 space-y-1.5 ${isDark ? 'border-zinc-800 bg-zinc-950/70' : 'border-zinc-200 bg-zinc-50'}`}>
                {renderNavItems(middleDockNav, false, () => setMobileNavOpen(false))}
              </div>
            </div>
            <div className={`p-4 border-t ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
              <button
                type="button"
                onClick={onLogout}
                className={`w-full px-3 py-2 text-sm rounded-lg transition-colors flex items-center gap-3 ${
                  isDark ? 'text-red-400 hover:bg-red-950/30' : 'text-red-700 hover:bg-red-100'
                }`}
              >
                <LogOut size={18} />
                Sign out
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};

export default AdminLayout;
