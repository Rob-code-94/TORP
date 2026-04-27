import React, { useEffect, useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { useAdminTheme } from '../../../../lib/adminTheme';
import {
  appCardClass,
  appErrorBannerClass,
  appInputClass,
  appOutlineButtonClass,
  appSuccessBannerClass,
} from '../../../../lib/appThemeClasses';
import {
  defaultOrgIdentity,
  loadOrgIdentity,
  saveOrgIdentity,
  type OrgIdentity,
} from '../../../../data/orgIdentityRepository';
import { uploadOrgLogo, type AvatarUploadProgress } from '../../../../lib/avatarStorage';
import { loadStoragePolicy } from '../../../../data/storagePolicyRepository';
import { useAuth } from '../../../../lib/auth';

interface OrgIdentitySectionProps {
  /** Whether the current user can mutate org identity (admin-only). */
  canEdit: boolean;
}

function tenantIdFromUser(tenantId: string | undefined): string {
  return tenantId && tenantId.length > 0 ? tenantId : 'torp-default';
}

const OrgIdentitySection: React.FC<OrgIdentitySectionProps> = ({ canEdit }) => {
  const { user } = useAuth();
  const { theme } = useAdminTheme();
  const isDark = theme === 'dark';
  const tenantId = tenantIdFromUser(user?.tenantId);

  const [identity, setIdentity] = useState<OrgIdentity>(() => defaultOrgIdentity(tenantId));
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);
  const [logoProgress, setLogoProgress] = useState<AvatarUploadProgress | null>(null);
  const [imageMaxBytes, setImageMaxBytes] = useState<number>(50 * 1024 * 1024);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let mounted = true;
    setState('loading');
    void loadOrgIdentity(tenantId).then((value) => {
      if (!mounted) return;
      setIdentity(value);
      setState('ready');
    });
    void loadStoragePolicy(tenantId).then((policy) => {
      if (!mounted) return;
      setImageMaxBytes(Math.max(1, policy.maxSizeByMimeGroup.imageMb) * 1024 * 1024);
    });
    return () => {
      mounted = false;
    };
  }, [tenantId]);

  const handleLogoPick = () => fileRef.current?.click();

  const handleLogoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setLogoBusy(true);
    setError(null);
    setSuccess(null);
    setLogoProgress({ bytesTransferred: 0, totalBytes: file.size, percent: 0 });
    try {
      const result = await uploadOrgLogo({
        tenantId,
        file,
        maxBytes: imageMaxBytes,
        onProgress: setLogoProgress,
      });
      const next: OrgIdentity = {
        ...identity,
        logoPath: result.path,
        logoUrl: result.downloadUrl,
      };
      const saved = await saveOrgIdentity(next, user?.email || 'admin');
      setIdentity(saved);
      setSuccess('Logo updated.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not upload logo.');
    } finally {
      setLogoBusy(false);
      setLogoProgress(null);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const saved = await saveOrgIdentity(identity, user?.email || 'admin');
      setIdentity(saved);
      setSuccess('Org identity saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save org identity.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className={`rounded-xl p-4 ${appCardClass(isDark)} min-w-0`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Identity</h3>
          <p className={`text-xs mt-1 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
            Your org's public name, support email, and logo. The logo appears on the Landing page
            header and on every client-facing PDF.
          </p>
        </div>
        {!canEdit && (
          <span className="text-[11px] uppercase tracking-wide text-zinc-500">Read only</span>
        )}
      </div>

      {state === 'loading' && (
        <p className="text-xs text-zinc-500 mt-3">Loading identity…</p>
      )}

      {state !== 'loading' && (
        <div className="mt-3 space-y-3 min-w-0">
          {error && (
            <div className={`rounded-lg px-3 py-2 text-xs ${appErrorBannerClass(isDark)}`}>{error}</div>
          )}
          {success && (
            <div className={`rounded-lg px-3 py-2 text-xs ${appSuccessBannerClass(isDark)}`}>{success}</div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-start gap-4 min-w-0">
            <div className="flex flex-col items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={handleLogoPick}
                disabled={!canEdit || logoBusy}
                className={`relative h-20 w-20 rounded-md overflow-hidden border ${
                  isDark ? 'border-zinc-700 bg-zinc-900' : 'border-zinc-300 bg-zinc-50'
                } flex items-center justify-center text-xs font-bold ${
                  isDark ? 'text-zinc-200' : 'text-zinc-700'
                } disabled:opacity-60`}
                aria-label="Change logo"
              >
                {identity.logoUrl ? (
                  <img src={identity.logoUrl} alt={identity.orgName} className="h-full w-full object-contain" />
                ) : (
                  <span>LOGO</span>
                )}
                {canEdit && (
                  <span
                    className={`absolute inset-x-0 bottom-0 py-0.5 text-[9px] uppercase tracking-wide ${
                      isDark ? 'bg-black/60 text-white' : 'bg-white/80 text-zinc-900'
                    } flex items-center justify-center gap-1`}
                  >
                    {logoBusy ? <Loader2 size={10} className="animate-spin" /> : <Camera size={10} />}
                    {logoBusy ? 'Up' : 'Change'}
                  </span>
                )}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/svg+xml"
                className="hidden"
                onChange={handleLogoChange}
              />
              {logoProgress && (
                <p className="text-[10px] text-zinc-500">{logoProgress.percent}%</p>
              )}
            </div>

            <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="text-xs text-zinc-500">
                Org name
                <input
                  type="text"
                  disabled={!canEdit}
                  value={identity.orgName}
                  onChange={(e) => setIdentity((p) => ({ ...p, orgName: e.target.value }))}
                  className={appInputClass(isDark)}
                />
              </label>
              <label className="text-xs text-zinc-500">
                Primary contact
                <input
                  type="text"
                  disabled={!canEdit}
                  value={identity.primaryContactName}
                  onChange={(e) => setIdentity((p) => ({ ...p, primaryContactName: e.target.value }))}
                  className={appInputClass(isDark)}
                />
              </label>
              <label className="text-xs text-zinc-500">
                Support email
                <input
                  type="email"
                  disabled={!canEdit}
                  value={identity.supportEmail}
                  onChange={(e) => setIdentity((p) => ({ ...p, supportEmail: e.target.value }))}
                  className={appInputClass(isDark)}
                  placeholder="hello@torp.tv"
                />
              </label>
              <label className="text-xs text-zinc-500">
                Accent color
                <input
                  type="color"
                  disabled={!canEdit}
                  value={identity.accentColor || '#fafafa'}
                  onChange={(e) => setIdentity((p) => ({ ...p, accentColor: e.target.value }))}
                  className={`mt-1 h-9 w-full rounded-md border ${
                    isDark ? 'border-zinc-700 bg-zinc-900' : 'border-zinc-300 bg-white'
                  }`}
                />
              </label>
            </div>
          </div>

          {canEdit && (
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className={`text-[11px] ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>
                {identity.updatedAt
                  ? `Updated ${new Date(identity.updatedAt).toLocaleString()} by ${identity.updatedBy || 'unknown'}`
                  : 'Never saved.'}
              </p>
              <button
                type="button"
                onClick={() => void handleSave()}
                className={appOutlineButtonClass(isDark)}
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Save identity'}
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default OrgIdentitySection;
