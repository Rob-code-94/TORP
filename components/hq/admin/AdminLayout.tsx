import React, { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
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
  X,
} from 'lucide-react';
import { useAuth } from '../../../lib/auth';

const nav: { to: string; label: string; icon: React.ReactNode; match: (p: string) => boolean }[] = [
  {
    to: '/hq/admin',
    label: 'Command',
    icon: <LayoutDashboard size={20} />,
    match: (p) => p === '/hq/admin' || p === '/hq/admin/',
  },
  {
    to: '/hq/admin/projects',
    label: 'Projects',
    icon: <Film size={20} />,
    match: (p) => p.startsWith('/hq/admin/projects'),
  },
  {
    to: '/hq/admin/planner',
    label: 'Planner',
    icon: <KanbanSquare size={20} />,
    match: (p) => p.startsWith('/hq/admin/planner'),
  },
  {
    to: '/hq/admin/financials',
    label: 'Financials',
    icon: <Banknote size={20} />,
    match: (p) => p.startsWith('/hq/admin/financials'),
  },
  {
    to: '/hq/admin/crew',
    label: 'Crew',
    icon: <Users size={20} />,
    match: (p) => p.startsWith('/hq/admin/crew'),
  },
  {
    to: '/hq/admin/clients',
    label: 'Clients',
    icon: <Building2 size={20} />,
    match: (p) => p.startsWith('/hq/admin/clients'),
  },
  {
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
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const title = pageTitle(pathname);

  const onLogout = () => {
    logout();
    navigate('/hq/login');
  };

  const renderNavItems = (compact: boolean, onNavigate?: () => void) =>
    nav.map((item) => {
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
              active ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900/60',
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
    <div className="flex h-screen bg-zinc-950 text-white overflow-hidden font-sans">
      <aside
        className={[
          'border-r border-zinc-800 bg-black/40 hidden md:flex flex-col shrink-0 transition-all duration-200',
          sidebarCollapsed ? 'w-20' : 'w-64',
        ].join(' ')}
      >
        <div
          className={[
            'h-16 flex items-center border-b border-zinc-800',
            sidebarCollapsed ? 'px-3 justify-center' : 'px-6',
          ].join(' ')}
        >
          <span className="font-black text-xl tracking-tighter">{sidebarCollapsed ? 'T' : 'TORP'}</span>
          {!sidebarCollapsed && (
            <span className="ml-2 text-[10px] font-mono text-zinc-500 px-2 py-0.5 border border-zinc-800 rounded uppercase">
              Admin
            </span>
          )}
        </div>
        <nav
          className={[
            'flex-1 py-4 space-y-0.5 overflow-y-auto',
            sidebarCollapsed ? 'px-2' : 'px-3',
          ].join(' ')}
        >
          {renderNavItems(sidebarCollapsed)}
        </nav>
        <div className="p-4 border-t border-zinc-800">
          <button
            type="button"
            onClick={onLogout}
            className={[
              'w-full px-3 py-2 text-sm text-red-400 hover:bg-red-950/30 rounded-lg transition-colors flex items-center',
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
        <header className="h-14 flex items-center justify-between px-4 sm:px-6 border-b border-zinc-800 bg-zinc-950/90 shrink-0 z-20">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="inline-flex md:hidden p-1.5 rounded-md border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700"
              aria-label="Open navigation"
              title="Open navigation"
            >
              <Menu size={16} />
            </button>
            <button
              type="button"
              onClick={() => setSidebarCollapsed((v) => !v)}
              className="hidden md:inline-flex p-1.5 rounded-md border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700"
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
            </button>
            <h1 className="text-sm font-semibold tracking-tight text-white truncate">
              {title}
              {pathname.match(/^\/hq\/admin\/projects\/[^/]+$/) && (
                <span className="ml-2 text-zinc-500 font-normal"> / detail</span>
              )}
            </h1>
          </div>
          <div
            className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-300"
            title="Admin"
          >
            A
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
          <aside className="absolute left-0 top-0 h-full w-72 max-w-[85vw] bg-zinc-950 border-r border-zinc-800 flex flex-col">
            <div className="h-14 px-4 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-black tracking-tighter">TORP</span>
                <span className="text-[10px] font-mono text-zinc-500 px-2 py-0.5 border border-zinc-800 rounded uppercase">
                  Admin
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                className="p-1.5 rounded-md border border-zinc-800 text-zinc-400 hover:text-white"
                aria-label="Close navigation"
              >
                <X size={16} />
              </button>
            </div>
            <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
              {renderNavItems(false, () => setMobileNavOpen(false))}
            </nav>
            <div className="p-4 border-t border-zinc-800">
              <button
                type="button"
                onClick={onLogout}
                className="w-full px-3 py-2 text-sm text-red-400 hover:bg-red-950/30 rounded-lg transition-colors flex items-center gap-3"
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
