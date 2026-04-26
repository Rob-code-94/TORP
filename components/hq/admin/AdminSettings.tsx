import React from 'react';
import { Link } from 'react-router-dom';
import { Plug } from 'lucide-react';
import { useAdminTheme } from '../../../lib/adminTheme';
import { appPanelClass } from '../../../lib/appThemeClasses';
import SettingsShell from '../settings/SettingsShell';

const AdminSettings: React.FC = () => {
  const { theme } = useAdminTheme();
  const isDark = theme === 'dark';
  return (
    <SettingsShell
      variant="admin"
      title="Org settings"
      subtitle="Identity, org defaults, and integration audits. Personal connections live under Integrations."
    >
      <div className={`min-w-0 space-y-4 text-sm ${isDark ? 'text-zinc-300' : 'text-zinc-800'}`}>
        <Link
          to="/hq/admin/settings/integrations"
          className={`block rounded-xl p-4 transition-colors min-w-0 ${appPanelClass(isDark)} ${
            isDark ? 'hover:border-zinc-700' : 'hover:border-zinc-300'
          }`}
        >
          <div className="flex items-start gap-3 min-w-0">
            <span
              className={`shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-md ${
                isDark ? 'bg-zinc-800 text-zinc-200' : 'bg-zinc-100 text-zinc-700'
              }`}
              aria-hidden
            >
              <Plug size={16} />
            </span>
            <div className="min-w-0">
              <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                Manage integrations
              </p>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                Connect your personal calendar, audit org-wide connections, and review what each
                integration shares.
              </p>
            </div>
          </div>
        </Link>

        <div className={`rounded-xl p-4 ${appPanelClass(isDark)}`}>
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">
            Service packages (reference)
          </h3>
          <ul
            className={`list-disc list-inside space-y-1 ${
              isDark ? 'text-zinc-200' : 'text-zinc-800'
            }`}
          >
            <li>Essentials: 5h shoot, 5 deliverables (20–60s), 7h edit, 2 rev</li>
            <li>Podcast pack: 3h shoot, episode + promos</li>
          </ul>
          <p className="text-xs text-zinc-500 mt-2">
            Canonical copy in docs and project facts when connected.
          </p>
        </div>
      </div>
    </SettingsShell>
  );
};

export default AdminSettings;
