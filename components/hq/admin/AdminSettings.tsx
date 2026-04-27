import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plug } from 'lucide-react';
import { useAdminTheme } from '../../../lib/adminTheme';
import { appPanelClass } from '../../../lib/appThemeClasses';
import SettingsShell from '../settings/SettingsShell';
import OrgIdentitySection from '../settings/orgSections/OrgIdentitySection';
import ShowcaseLibrarySection from '../settings/orgSections/ShowcaseLibrarySection';
import { useAuth } from '../../../lib/auth';
import { loadStoragePolicy, saveStoragePolicy } from '../../../data/storagePolicyRepository';
import { createDefaultStoragePolicy } from '../../../lib/storagePolicy';
import type { StoragePolicy } from '../../../types';
import { UserRole } from '../../../types';

const AdminSettings: React.FC = () => {
  const { theme } = useAdminTheme();
  const isDark = theme === 'dark';
  const { user } = useAuth();
  const [policyState, setPolicyState] = useState<'loading' | 'error' | 'ready'>('loading');
  const [policyError, setPolicyError] = useState<string | null>(null);
  const [policySaving, setPolicySaving] = useState(false);
  const [policy, setPolicy] = useState<StoragePolicy>(() =>
    createDefaultStoragePolicy(user?.email || 'system')
  );
  const [policyMessage, setPolicyMessage] = useState<string | null>(null);
  const isPolicyEditor = user?.role === UserRole.ADMIN;

  useEffect(() => {
    let mounted = true;
    const tenantId = 'torp-default';
    void loadStoragePolicy(tenantId)
      .then((loaded) => {
        if (!mounted) return;
        setPolicy(loaded);
        setPolicyState('ready');
      })
      .catch((error) => {
        if (!mounted) return;
        setPolicyError(error instanceof Error ? error.message : 'Could not load storage policy.');
        setPolicyState('error');
      });
    return () => {
      mounted = false;
    };
  }, []);

  const savePolicy = async () => {
    setPolicySaving(true);
    setPolicyMessage(null);
    try {
      const updated = await saveStoragePolicy({
        ...policy,
        updatedAt: new Date().toISOString(),
        updatedBy: user?.email || user?.displayName || 'admin',
      });
      setPolicy(updated);
      setPolicyMessage('Storage policy saved.');
      setPolicyState('ready');
    } catch (error) {
      setPolicyError(error instanceof Error ? error.message : 'Could not save policy.');
      setPolicyState('error');
    } finally {
      setPolicySaving(false);
    }
  };
  return (
    <SettingsShell
      variant="admin"
      title="Org settings"
      subtitle="Identity, org defaults, and integration audits. Personal connections live under Integrations."
    >
      <div className={`min-w-0 space-y-4 text-sm ${isDark ? 'text-zinc-300' : 'text-zinc-800'}`}>
        <OrgIdentitySection canEdit={isPolicyEditor} />
        <ShowcaseLibrarySection canEdit={isPolicyEditor} />

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
        <div className={`rounded-xl p-4 min-w-0 ${appPanelClass(isDark)}`}>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
            <div>
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Storage policy</h3>
              <p className={`text-xs mt-1 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                Define who can issue delivery links and set file size / retention defaults.
              </p>
            </div>
            {!isPolicyEditor && (
              <span className="text-[11px] uppercase tracking-wide text-zinc-500">Read only</span>
            )}
          </div>
          {policyState === 'loading' && <p className="text-xs text-zinc-500 mt-3">Loading policy...</p>}
          {policyState === 'error' && <p className="text-xs text-rose-400 mt-3">{policyError || 'Could not load policy.'}</p>}
          {policyState === 'ready' && (
            <div className="mt-3 space-y-3 min-w-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
                <label className="text-xs text-zinc-500">
                  PM can issue delivery links
                  <select
                    disabled={!isPolicyEditor}
                    value={policy.roleScopeMap.PROJECT_MANAGER.canIssueDeliveryLinks ? 'yes' : 'no'}
                    onChange={(e) =>
                      setPolicy((current) => ({
                        ...current,
                        roleScopeMap: {
                          ...current.roleScopeMap,
                          PROJECT_MANAGER: {
                            canIssueDeliveryLinks: e.target.value === 'yes',
                          },
                        },
                      }))
                    }
                    className={`mt-1 w-full rounded-md border px-2 py-1.5 text-sm ${
                      isDark
                        ? 'border-zinc-700 bg-zinc-900 text-zinc-200'
                        : 'border-zinc-300 bg-white text-zinc-900'
                    }`}
                  >
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </label>
                <label className="text-xs text-zinc-500">
                  Default retention (days)
                  <input
                    type="number"
                    min={1}
                    disabled={!isPolicyEditor}
                    value={policy.retentionDaysByClass.default}
                    onChange={(e) =>
                      setPolicy((current) => ({
                        ...current,
                        retentionDaysByClass: {
                          ...current.retentionDaysByClass,
                          default: Number(e.target.value || '0'),
                        },
                      }))
                    }
                    className={`mt-1 w-full rounded-md border px-2 py-1.5 text-sm ${
                      isDark
                        ? 'border-zinc-700 bg-zinc-900 text-zinc-200'
                        : 'border-zinc-300 bg-white text-zinc-900'
                    }`}
                  />
                </label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
                <label className="text-xs text-zinc-500">
                  Max video upload (MB)
                  <input
                    type="number"
                    min={1}
                    disabled={!isPolicyEditor}
                    value={policy.maxSizeByMimeGroup.videoMb}
                    onChange={(e) =>
                      setPolicy((current) => ({
                        ...current,
                        maxSizeByMimeGroup: {
                          ...current.maxSizeByMimeGroup,
                          videoMb: Number(e.target.value || '0'),
                        },
                      }))
                    }
                    className={`mt-1 w-full rounded-md border px-2 py-1.5 text-sm ${
                      isDark
                        ? 'border-zinc-700 bg-zinc-900 text-zinc-200'
                        : 'border-zinc-300 bg-white text-zinc-900'
                    }`}
                  />
                </label>
                <label className="text-xs text-zinc-500">
                  Max document upload (MB)
                  <input
                    type="number"
                    min={1}
                    disabled={!isPolicyEditor}
                    value={policy.maxSizeByMimeGroup.documentMb}
                    onChange={(e) =>
                      setPolicy((current) => ({
                        ...current,
                        maxSizeByMimeGroup: {
                          ...current.maxSizeByMimeGroup,
                          documentMb: Number(e.target.value || '0'),
                        },
                      }))
                    }
                    className={`mt-1 w-full rounded-md border px-2 py-1.5 text-sm ${
                      isDark
                        ? 'border-zinc-700 bg-zinc-900 text-zinc-200'
                        : 'border-zinc-300 bg-white text-zinc-900'
                    }`}
                  />
                </label>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <p className="text-[11px] text-zinc-500 break-words">
                  Updated {new Date(policy.updatedAt).toLocaleString()} by {policy.updatedBy}
                </p>
                <button
                  type="button"
                  disabled={!isPolicyEditor || policySaving}
                  onClick={() => {
                    void savePolicy();
                  }}
                  className="w-full sm:w-auto rounded-md border border-zinc-700 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-zinc-100 disabled:opacity-50"
                >
                  {policySaving ? 'Saving...' : 'Save policy'}
                </button>
              </div>
              {policyMessage && <p className="text-xs text-emerald-300">{policyMessage}</p>}
            </div>
          )}
        </div>
      </div>
    </SettingsShell>
  );
};

export default AdminSettings;
