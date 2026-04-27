import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Plug, User, Bell, Shield, Building2 } from 'lucide-react';
import { appPanelClass } from '../../../lib/appThemeClasses';
import { useAdminTheme } from '../../../lib/adminTheme';

export interface SettingsTab {
  id: string;
  label: string;
  to: string;
  icon: React.ReactNode;
  available: boolean;
  badge?: string;
}

interface SettingsShellProps {
  /** Title rendered above the content area (mobile + desktop). */
  title: string;
  /** Subtitle / description shown under the title. */
  subtitle?: string;
  /** Variant decides which set of tabs is rendered (admin includes Org). */
  variant: 'admin' | 'staff';
  children: React.ReactNode;
}

function tabsForVariant(variant: SettingsShellProps['variant']): SettingsTab[] {
  const isAdmin = variant === 'admin';
  const root = isAdmin ? '/hq/admin/settings' : '/hq/staff/settings';
  return [
    {
      id: 'integrations',
      label: 'Integrations',
      to: `${root}/integrations`,
      icon: <Plug size={16} className="shrink-0" />,
      available: true,
    },
    {
      id: 'profile',
      label: 'Profile',
      to: `${root}/profile`,
      icon: <User size={16} className="shrink-0" />,
      available: true,
    },
    {
      id: 'notifications',
      label: 'Notifications',
      to: `${root}/notifications`,
      icon: <Bell size={16} className="shrink-0" />,
      available: true,
    },
    {
      id: 'security',
      label: 'Security',
      to: `${root}/security`,
      icon: <Shield size={16} className="shrink-0" />,
      available: true,
    },
    ...(isAdmin
      ? [
          {
            id: 'org',
            label: 'Org',
            to: `${root}`,
            icon: <Building2 size={16} className="shrink-0" />,
            available: true,
          },
        ]
      : []),
  ];
}

function isTabActive(pathname: string, tab: SettingsTab): boolean {
  if (tab.id === 'org') return pathname === tab.to || pathname === `${tab.to}/`;
  return pathname.startsWith(tab.to);
}

const SettingsShell: React.FC<SettingsShellProps> = ({ title, subtitle, variant, children }) => {
  const { theme } = useAdminTheme();
  const isDark = theme === 'dark';
  const { pathname } = useLocation();
  const tabs = tabsForVariant(variant);

  return (
    <div className="min-w-0 max-w-5xl space-y-4">
      <header className="space-y-1 min-w-0">
        <p className={`text-xs font-mono uppercase ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>
          Settings
        </p>
        <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>{title}</h2>
        {subtitle && (
          <p className={`text-sm ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>{subtitle}</p>
        )}
      </header>

      <nav
        className={`md:hidden -mx-1 px-1 overflow-x-auto`}
        aria-label="Settings sections"
      >
        <ul className="flex gap-2 min-w-max pb-1">
          {tabs.map((tab) => {
            const active = isTabActive(pathname, tab);
            const disabled = !tab.available;
            const base =
              'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold whitespace-nowrap';
            const cls = disabled
              ? isDark
                ? `${base} border-zinc-800 text-zinc-600 cursor-not-allowed`
                : `${base} border-zinc-200 text-zinc-400 cursor-not-allowed`
              : active
                ? isDark
                  ? `${base} border-zinc-200 bg-white text-zinc-900`
                  : `${base} border-zinc-900 bg-zinc-900 text-white`
                : isDark
                  ? `${base} border-zinc-700 text-zinc-300 hover:border-zinc-500`
                  : `${base} border-zinc-300 text-zinc-700 hover:border-zinc-500`;
            return (
              <li key={tab.id} className="shrink-0">
                {disabled ? (
                  <span className={cls} aria-disabled="true" title={tab.badge || 'Unavailable'}>
                    {tab.icon}
                    {tab.label}
                  </span>
                ) : (
                  <Link to={tab.to} className={cls} aria-current={active ? 'page' : undefined}>
                    {tab.icon}
                    {tab.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-[12rem_1fr] gap-4 min-w-0">
        <aside className={`hidden md:block min-w-0`} aria-label="Settings sections">
          <ul className={`rounded-xl p-1 space-y-0.5 ${appPanelClass(isDark)}`}>
            {tabs.map((tab) => {
              const active = isTabActive(pathname, tab);
              const disabled = !tab.available;
              const base =
                'flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm transition-colors min-w-0';
              const cls = disabled
                ? isDark
                  ? `${base} text-zinc-600 cursor-not-allowed`
                  : `${base} text-zinc-400 cursor-not-allowed`
                : active
                  ? isDark
                    ? `${base} bg-zinc-800 text-white`
                    : `${base} bg-zinc-100 text-zinc-900`
                  : isDark
                    ? `${base} text-zinc-300 hover:bg-zinc-800/60`
                    : `${base} text-zinc-700 hover:bg-zinc-100`;
              return (
                <li key={tab.id}>
                  {disabled ? (
                    <span className={cls} aria-disabled="true">
                      <span className="inline-flex items-center gap-2 min-w-0">
                        {tab.icon}
                        <span className="truncate">{tab.label}</span>
                      </span>
                      {tab.badge && (
                        <span
                          className={`text-[10px] uppercase tracking-wide shrink-0 ${
                            isDark ? 'text-zinc-600' : 'text-zinc-400'
                          }`}
                        >
                          {tab.badge}
                        </span>
                      )}
                    </span>
                  ) : (
                    <Link to={tab.to} className={cls} aria-current={active ? 'page' : undefined}>
                      <span className="inline-flex items-center gap-2 min-w-0">
                        {tab.icon}
                        <span className="truncate">{tab.label}</span>
                      </span>
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </aside>

        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
};

export default SettingsShell;
