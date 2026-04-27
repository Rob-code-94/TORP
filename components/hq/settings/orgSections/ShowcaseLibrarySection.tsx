import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Film, Loader2, Plus, Trash2, Upload } from 'lucide-react';
import { useAdminTheme } from '../../../../lib/adminTheme';
import { appPanelClass } from '../../../../lib/appThemeClasses';
import { useAuth } from '../../../../lib/auth';
import { deleteShowcaseAsset, listShowcaseAssets, saveShowcaseAsset, type ShowcaseAsset } from '../../../../data/showcaseRepository';
import { deleteShowcaseAsset as deleteShowcaseObject, uploadShowcaseAsset } from '../../../../lib/showcaseStorage';

interface ShowcaseLibrarySectionProps {
  canEdit: boolean;
}

function tenantIdFromUser(tenantId: string | undefined): string {
  return tenantId && tenantId.length > 0 ? tenantId : 'torp-default';
}

const ShowcaseLibrarySection: React.FC<ShowcaseLibrarySectionProps> = ({ canEdit }) => {
  const { theme } = useAdminTheme();
  const { user } = useAuth();
  const isDark = theme === 'dark';
  const tenantId = tenantIdFromUser(user?.tenantId);
  const [items, setItems] = useState<ShowcaseAsset[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const refresh = async () => {
    setState('loading');
    setError(null);
    try {
      const rows = await listShowcaseAssets(tenantId);
      setItems(rows);
      setState('ready');
    } catch (err) {
      setState('error');
      setError(err instanceof Error ? err.message : 'Could not load showcase assets.');
    }
  };

  useEffect(() => {
    void refresh();
  }, [tenantId]);

  const nextOrder = useMemo(
    () => (items.length === 0 ? 1 : Math.max(...items.map((x) => x.order || 0)) + 1),
    [items],
  );

  const handleUpload: React.ChangeEventHandler<HTMLInputElement> = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !canEdit) return;
    setUploading(true);
    setUploadProgress(0);
    setError(null);
    try {
      const id = `showcase-${Date.now()}`;
      const uploaded = await uploadShowcaseAsset({
        assetId: id,
        file,
        onProgress: ({ percent }) => setUploadProgress(percent),
      });
      await saveShowcaseAsset(tenantId, {
        id,
        title: file.name.replace(/\.[^.]+$/, ''),
        subtitle: '',
        mediaKind: uploaded.contentType.startsWith('video/') ? 'video' : 'image',
        mediaUrl: uploaded.downloadUrl,
        mediaPath: uploaded.path,
        order: nextOrder,
        visible: true,
      });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const toggleVisible = async (item: ShowcaseAsset) => {
    if (!canEdit) return;
    await saveShowcaseAsset(tenantId, {
      id: item.id,
      title: item.title,
      subtitle: item.subtitle,
      mediaKind: item.mediaKind,
      mediaUrl: item.mediaUrl,
      mediaPath: item.mediaPath,
      order: item.order,
      visible: !item.visible,
    });
    await refresh();
  };

  const remove = async (item: ShowcaseAsset) => {
    if (!canEdit) return;
    await deleteShowcaseAsset(tenantId, item.id);
    if (item.mediaPath) {
      await deleteShowcaseObject(item.mediaPath);
    }
    await refresh();
  };

  return (
    <section className={`rounded-xl p-4 ${appPanelClass(isDark)} min-w-0`}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Landing showcase</h3>
          <p className={`text-xs mt-1 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
            Upload public reel assets served from `public/showcase/*` for the landing page.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/*,video/mp4,video/webm,video/quicktime"
            onChange={handleUpload}
            disabled={!canEdit || uploading}
          />
          <button
            type="button"
            disabled={!canEdit || uploading}
            onClick={() => fileInputRef.current?.click()}
            className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-zinc-100 disabled:opacity-50"
          >
            <span className="inline-flex items-center gap-1">
              {uploading ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
              {uploading ? `Uploading ${uploadProgress}%` : 'Add asset'}
            </span>
          </button>
        </div>
      </div>
      {error && <p className="mt-2 text-xs text-rose-400">{error}</p>}
      {state === 'loading' ? (
        <p className="text-xs text-zinc-500 mt-3">Loading showcase assets...</p>
      ) : items.length === 0 ? (
        <p className="text-xs text-zinc-500 mt-3">No showcase assets yet.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className={`rounded-lg px-3 py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 ${
                isDark ? 'bg-zinc-900/60' : 'bg-zinc-50'
              }`}
            >
              <div className="min-w-0">
                <p className={`text-sm font-semibold truncate ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                  {item.title}
                </p>
                <p className="text-[11px] text-zinc-500 break-all">
                  {item.mediaKind.toUpperCase()} · order {item.order} · {item.visible ? 'visible' : 'hidden'}
                </p>
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                <button
                  type="button"
                  disabled={!canEdit}
                  onClick={() => void toggleVisible(item)}
                  className="rounded-md border border-zinc-700 px-2 py-1 text-[11px] text-zinc-200 disabled:opacity-50"
                >
                  <span className="inline-flex items-center gap-1">
                    <Film size={12} />
                    {item.visible ? 'Hide' : 'Show'}
                  </span>
                </button>
                <a
                  href={item.mediaUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-md border border-zinc-700 px-2 py-1 text-[11px] text-zinc-200"
                >
                  <span className="inline-flex items-center gap-1">
                    <Upload size={12} />
                    Open
                  </span>
                </a>
                <button
                  type="button"
                  disabled={!canEdit}
                  onClick={() => void remove(item)}
                  className="rounded-md border border-red-900/70 px-2 py-1 text-[11px] text-red-300 disabled:opacity-50"
                >
                  <span className="inline-flex items-center gap-1">
                    <Trash2 size={12} />
                    Delete
                  </span>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default ShowcaseLibrarySection;
