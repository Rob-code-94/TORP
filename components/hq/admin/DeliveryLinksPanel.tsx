import React, { useCallback, useEffect, useState } from 'react';
import { Check, Copy, Loader2, RefreshCw, ShieldX } from 'lucide-react';
import { useAdminTheme } from '../../../lib/adminTheme';
import { useAuth } from '../../../lib/auth';
import {
  appCardClass,
  appOutlineButtonClass,
} from '../../../lib/appThemeClasses';
import {
  describeDeliveryLinkState,
  listDeliveryLinksForAsset,
  type StorageDeliveryLinkRecord,
} from '../../../data/storageDeliveryLinkRepository';
import { revokeStorageDeliveryLink } from '../../../lib/storageDelivery';

interface DeliveryLinksPanelProps {
  /** The asset whose links we are listing. Use the linked/approved asset id
   * from the parent deliverable so the audit row matches the issued link. */
  assetId: string | null | undefined;
  /** Optional version label so the column shows what was actually shared. */
  versionId?: string | null;
  /** Whether the current user is allowed to revoke links from this surface. */
  canRevoke: boolean;
  /** Bumped by the parent whenever a link is freshly issued so we re-load. */
  refreshKey: number;
}

function formatTime(value: string | null | undefined): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function tenantIdFromUser(tenantId: string | undefined): string {
  return tenantId && tenantId.length > 0 ? tenantId : 'torp-default';
}

const DeliveryLinksPanel: React.FC<DeliveryLinksPanelProps> = ({
  assetId,
  versionId,
  canRevoke,
  refreshKey,
}) => {
  const { user } = useAuth();
  const { theme } = useAdminTheme();
  const isDark = theme === 'dark';
  const tenantId = tenantIdFromUser(user?.tenantId);
  const [links, setLinks] = useState<StorageDeliveryLinkRecord[]>([]);
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!assetId) {
      setLinks([]);
      return;
    }
    setState('loading');
    setErrorMessage(null);
    try {
      const records = await listDeliveryLinksForAsset({ tenantId, assetId });
      setLinks(records);
      setState('idle');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Could not load delivery links.');
      setState('error');
    }
  }, [assetId, tenantId]);

  useEffect(() => {
    void refresh();
  }, [refresh, refreshKey]);

  const handleCopy = useCallback(async (record: StorageDeliveryLinkRecord) => {
    try {
      // The signed URL itself isn't stored in Firestore, only the record. We
      // can't retroactively re-derive a signed URL without re-issuing, so
      // copy the public storage path instead — the parent deliverable still
      // exposes the freshly issued URL on its `referenceLink` field.
      await navigator.clipboard.writeText(record.path);
      setCopiedId(record.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Could not copy to clipboard.');
    }
  }, []);

  const handleRevoke = useCallback(
    async (record: StorageDeliveryLinkRecord) => {
      if (!canRevoke) return;
      setBusyId(record.id);
      try {
        await revokeStorageDeliveryLink(record.id);
        await refresh();
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : 'Could not revoke link.');
      } finally {
        setBusyId(null);
      }
    },
    [canRevoke, refresh],
  );

  if (!assetId) return null;

  return (
    <div className={`rounded-xl p-3 ${appCardClass(isDark)} min-w-0`}>
      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
        <div className="flex items-center gap-2">
          <h4 className={`text-xs uppercase tracking-widest font-bold ${
            isDark ? 'text-zinc-400' : 'text-zinc-600'
          }`}>
            Delivery link audit
          </h4>
          {versionId && (
            <span className={`text-[10px] uppercase tracking-wide font-mono ${
              isDark ? 'text-zinc-500' : 'text-zinc-500'
            }`}>
              {versionId}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          className={appOutlineButtonClass(isDark)}
          aria-label="Refresh delivery links"
        >
          <RefreshCw size={12} />
          <span>Refresh</span>
        </button>
      </div>

      {errorMessage && (
        <p className={`text-xs mb-2 ${isDark ? 'text-rose-300' : 'text-rose-600'}`}>
          {errorMessage}
        </p>
      )}

      {state === 'loading' ? (
        <div className={`flex items-center gap-2 text-xs ${
          isDark ? 'text-zinc-400' : 'text-zinc-600'
        }`}>
          <Loader2 size={14} className="animate-spin" /> Loading…
        </div>
      ) : links.length === 0 ? (
        <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>
          No client links have been issued for this asset yet.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {links.map((link) => {
            const status = describeDeliveryLinkState(link);
            const tone =
              status === 'active'
                ? isDark
                  ? 'bg-emerald-900/40 text-emerald-300'
                  : 'bg-emerald-50 text-emerald-700'
                : status === 'expired'
                  ? isDark
                    ? 'bg-zinc-800 text-zinc-300'
                    : 'bg-zinc-100 text-zinc-700'
                  : isDark
                    ? 'bg-rose-900/40 text-rose-300'
                    : 'bg-rose-50 text-rose-700';
            return (
              <li
                key={link.id}
                className={`rounded-lg px-3 py-2 flex items-center gap-3 flex-wrap ${
                  isDark ? 'bg-zinc-900/50' : 'bg-zinc-50'
                }`}
              >
                <span
                  className={`text-[10px] uppercase tracking-wide font-bold rounded-full px-2 py-0.5 ${tone}`}
                >
                  {status}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs truncate ${
                    isDark ? 'text-zinc-200' : 'text-zinc-800'
                  }`}>
                    Issued by {link.createdByEmail || link.createdByUid || 'system'}
                  </p>
                  <p className={`text-[11px] ${
                    isDark ? 'text-zinc-500' : 'text-zinc-600'
                  }`}>
                    Issued {formatTime(link.createdAt)} · Expires {formatTime(link.expiresAt)}
                    {link.revokedAt ? ` · Revoked ${formatTime(link.revokedAt)}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className={appOutlineButtonClass(isDark)}
                    onClick={() => void handleCopy(link)}
                    aria-label="Copy storage path"
                  >
                    {copiedId === link.id ? <Check size={12} /> : <Copy size={12} />}
                    <span>{copiedId === link.id ? 'Copied' : 'Copy path'}</span>
                  </button>
                  {status === 'active' && (
                    <button
                      type="button"
                      className={`${appOutlineButtonClass(isDark)} disabled:opacity-50`}
                      disabled={!canRevoke || busyId === link.id}
                      onClick={() => void handleRevoke(link)}
                    >
                      {busyId === link.id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <ShieldX size={12} />
                      )}
                      <span>Revoke</span>
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default DeliveryLinksPanel;
