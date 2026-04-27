import React, { useMemo } from 'react';
import { Calendar, Mail, MessageSquare, CreditCard, Folder } from 'lucide-react';
import SettingsShell from './SettingsShell';
import { useAuth } from '../../../lib/auth';
import { useAdminTheme } from '../../../lib/adminTheme';
import { appPanelClass } from '../../../lib/appThemeClasses';
import { ensureIntegrationsRegistered } from '../../../lib/integrations/register';
import { getIntegrations, type IntegrationDefinition } from '../../../lib/integrations/registry';
import { UserRole } from '../../../types';
import AdminOrgConnections from './integrations/AdminOrgConnections';

ensureIntegrationsRegistered();

interface IntegrationsPageProps {
  variant: 'admin' | 'staff';
}

const PLANNED: { name: string; blurb: string; icon: React.ReactNode }[] = [
  { name: 'Microsoft Outlook', blurb: 'Two-way calendar via Microsoft Graph.', icon: <Calendar size={14} /> },
  { name: 'Slack', blurb: 'Project channel notifications and approvals.', icon: <MessageSquare size={14} /> },
  {
    name: 'Square (coming soon)',
    blurb: 'Planned for payment sync. Manual invoice and payment updates stay active in Financials for now.',
    icon: <CreditCard size={14} />,
  },
  { name: 'Google Drive', blurb: 'Asset deliverables and folder syncing.', icon: <Folder size={14} /> },
  { name: 'Email digest', blurb: 'Per-user weekly summary email.', icon: <Mail size={14} /> },
];

const IntegrationsPage: React.FC<IntegrationsPageProps> = ({ variant }) => {
  const { user } = useAuth();
  const { theme } = useAdminTheme();
  const isDark = theme === 'dark';

  const role = user?.role;

  const personal: IntegrationDefinition[] = useMemo(
    () => (role ? getIntegrations(role, 'personal') : []),
    [role],
  );

  if (!role) return null;

  const showOrgPanel = variant === 'admin' && role === UserRole.ADMIN;

  return (
    <SettingsShell
      title="Integrations"
      subtitle="Connect your calendar, message tools, and other services. Each integration is opt-in and can be disconnected at any time."
      variant={variant}
    >
      <div className="space-y-8 min-w-0">
        <section className="space-y-3 min-w-0">
          <header className="space-y-1 min-w-0">
            <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
              Personal
            </h3>
            <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>
              Connect your own accounts. Other people in your org never see your tokens or
              private events.
            </p>
          </header>

          {personal.length === 0 ? (
            <div
              className={`rounded-xl p-4 text-sm min-w-0 ${appPanelClass(isDark)} ${
                isDark ? 'text-zinc-400' : 'text-zinc-600'
              }`}
            >
              No personal integrations are available for your account yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 min-w-0">
              {personal.map((def) => (
                <div key={def.id} className="min-w-0">
                  {def.render({ isDark, role })}
                </div>
              ))}
            </div>
          )}
        </section>

        {showOrgPanel && (
          <section className="space-y-3 min-w-0">
            <header className="space-y-1 min-w-0">
              <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                Org connections
              </h3>
              <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>
                Audit which crew have connected each integration. You cannot view their tokens or
                impersonate them.
              </p>
            </header>
            <AdminOrgConnections isDark={isDark} />
          </section>
        )}

        <section className="space-y-3 min-w-0">
          <header className="space-y-1 min-w-0">
            <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
              Coming soon
            </h3>
            <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>
              Future integrations will appear here automatically as they ship.
            </p>
          </header>
          <ul
            className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 rounded-xl p-3 min-w-0 ${appPanelClass(
              isDark,
            )}`}
          >
            {PLANNED.map((p) => (
              <li
                key={p.name}
                className={`flex items-start gap-2 rounded-lg px-3 py-2 text-xs min-w-0 ${
                  isDark ? 'text-zinc-400' : 'text-zinc-600'
                }`}
              >
                <span
                  className={`shrink-0 inline-flex h-6 w-6 items-center justify-center rounded-md ${
                    isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-100 text-zinc-600'
                  }`}
                >
                  {p.icon}
                </span>
                <span className="min-w-0">
                  <span
                    className={`block font-semibold truncate ${
                      isDark ? 'text-zinc-200' : 'text-zinc-800'
                    }`}
                  >
                    {p.name}
                  </span>
                  <span className="block break-words">{p.blurb}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </SettingsShell>
  );
};

export default IntegrationsPage;
