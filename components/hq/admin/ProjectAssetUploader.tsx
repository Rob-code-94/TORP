import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, FileWarning, Loader2, UploadCloud, X } from 'lucide-react';
import { useAdminTheme } from '../../../lib/adminTheme';
import {
  appCardClass,
  appErrorBannerClass,
  appOutlineButtonClass,
  appSuccessBannerClass,
} from '../../../lib/appThemeClasses';
import { useAuth } from '../../../lib/auth';
import { loadStoragePolicy } from '../../../data/storagePolicyRepository';
import { createDefaultStoragePolicy } from '../../../lib/storagePolicy';
import {
  inferAssetType,
  uploadProjectAsset,
} from '../../../lib/projectAssetUpload';
import { isFirebaseConfigured } from '../../../lib/firebase';
import { createProjectAsset } from '../../../data/hqPlannerCalendarOps';
import type { ProjectAssetStatus, StoragePolicy } from '../../../types';

type ItemState =
  | { kind: 'queued' }
  | { kind: 'uploading'; percent: number }
  | { kind: 'processing' }
  | { kind: 'ready'; downloadUrl: string; path: string }
  | { kind: 'failed'; error: string };

interface UploadItem {
  id: string;
  file: File;
  state: ItemState;
}

interface ProjectAssetUploaderProps {
  projectId: string;
  /** Called whenever an upload completes so the parent can refresh its list. */
  onComplete?: () => void;
  /** Status to apply to newly created project assets. Defaults to "internal". */
  defaultStatus?: ProjectAssetStatus;
  /** Whether the current user is allowed to upload. */
  canUpload: boolean;
}

function tenantIdFromUser(tenantId: string | undefined): string {
  return tenantId && tenantId.length > 0 ? tenantId : 'torp-default';
}

function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '0 KB';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function StatusPill({ state, isDark }: { state: ItemState; isDark: boolean }) {
  const palette = isDark
    ? {
        queued: 'bg-zinc-800 text-zinc-300',
        uploading: 'bg-sky-900/40 text-sky-300',
        processing: 'bg-amber-900/40 text-amber-300',
        ready: 'bg-emerald-900/40 text-emerald-300',
        failed: 'bg-rose-900/40 text-rose-300',
      }
    : {
        queued: 'bg-zinc-100 text-zinc-700',
        uploading: 'bg-sky-50 text-sky-700',
        processing: 'bg-amber-50 text-amber-700',
        ready: 'bg-emerald-50 text-emerald-700',
        failed: 'bg-rose-50 text-rose-700',
      };
  const label =
    state.kind === 'uploading'
      ? `Uploading ${state.percent}%`
      : state.kind === 'ready'
        ? 'Ready'
        : state.kind === 'failed'
          ? 'Failed'
          : state.kind.charAt(0).toUpperCase() + state.kind.slice(1);
  return (
    <span
      className={`text-[10px] uppercase tracking-wide rounded-full px-2 py-0.5 font-bold ${
        palette[state.kind]
      }`}
    >
      {label}
    </span>
  );
}

const ProjectAssetUploader: React.FC<ProjectAssetUploaderProps> = ({
  projectId,
  onComplete,
  defaultStatus = 'internal',
  canUpload,
}) => {
  const { user } = useAuth();
  const { theme } = useAdminTheme();
  const isDark = theme === 'dark';
  const tenantId = tenantIdFromUser(user?.tenantId);
  const [items, setItems] = useState<UploadItem[]>([]);
  const [policy, setPolicy] = useState<StoragePolicy>(() => createDefaultStoragePolicy('system'));
  const [policyState, setPolicyState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [policyError, setPolicyError] = useState<string | null>(null);
  const [isOver, setIsOver] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let mounted = true;
    setPolicyState('loading');
    void loadStoragePolicy(tenantId)
      .then((p) => {
        if (!mounted) return;
        setPolicy(p);
        setPolicyState('ready');
      })
      .catch((err) => {
        if (!mounted) return;
        setPolicyError(err instanceof Error ? err.message : 'Could not load storage policy.');
        setPolicyState('error');
      });
    return () => {
      mounted = false;
    };
  }, [tenantId]);

  const updateItem = useCallback((id: string, patch: Partial<UploadItem>) => {
    setItems((current) => current.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((current) => current.filter((i) => i !== current.find((x) => x.id === id)));
  }, []);

  const startUpload = useCallback(
    async (item: UploadItem) => {
      if (!isFirebaseConfigured()) {
        updateItem(item.id, {
          state: {
            kind: 'failed',
            error: 'Firebase storage is not configured for this environment.',
          },
        });
        return;
      }
      updateItem(item.id, { state: { kind: 'uploading', percent: 0 } });
      const assetId = `a-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
      const version = 'v1';
      try {
        const result = await uploadProjectAsset({
          tenantId,
          projectId,
          assetId,
          version,
          file: item.file,
          policy,
          onProgress: ({ percent }) => updateItem(item.id, { state: { kind: 'uploading', percent } }),
        });
        updateItem(item.id, { state: { kind: 'processing' } });
        const actor = user?.email || user?.displayName || 'admin';
        try {
          createProjectAsset(
            {
              projectId,
              label: item.file.name,
              version,
              type: inferAssetType(result.contentType, result.filename),
              sourceType: 'upload' as const,
              status: defaultStatus as ProjectAssetStatus,
              clientVisible: false,
              storage: {
                path: result.path,
                url: result.downloadUrl,
                mimeType: result.contentType,
                sizeBytes: result.size,
                filename: result.filename,
              },
            },
            actor,
          );
        } catch (err) {
          updateItem(item.id, {
            state: {
              kind: 'failed',
              error: err instanceof Error ? err.message : 'Could not record asset.',
            },
          });
          return;
        }
        updateItem(item.id, {
          state: { kind: 'ready', downloadUrl: result.downloadUrl, path: result.path },
        });
        onComplete?.();
      } catch (err) {
        updateItem(item.id, {
          state: {
            kind: 'failed',
            error: err instanceof Error ? err.message : 'Upload failed.',
          },
        });
      }
    },
    [defaultStatus, onComplete, policy, projectId, tenantId, updateItem, user?.displayName, user?.email],
  );

  const enqueueFiles = useCallback(
    (files: FileList | File[] | null) => {
      if (!files || (files as FileList).length === 0) return;
      const list = Array.from(files as FileList);
      const next: UploadItem[] = list.map((file, index) => ({
        id: `u-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        state: { kind: 'queued' },
      }));
      setItems((current) => [...current, ...next]);
      next.forEach((item) => {
        void startUpload(item);
      });
    },
    [startUpload],
  );

  const handleDragOver: React.DragEventHandler<HTMLDivElement> = (event) => {
    if (!canUpload) return;
    event.preventDefault();
    setIsOver(true);
  };

  const handleDragLeave: React.DragEventHandler<HTMLDivElement> = () => setIsOver(false);

  const handleDrop: React.DragEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault();
    setIsOver(false);
    if (!canUpload) return;
    enqueueFiles(event.dataTransfer.files);
  };

  const handleFileInput: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    enqueueFiles(event.target.files);
    event.target.value = '';
  };

  const dropClass = `relative rounded-xl border-2 border-dashed transition-colors p-6 min-w-0 ${
    isDark ? 'border-zinc-700' : 'border-zinc-300'
  } ${
    isOver
      ? isDark
        ? 'border-zinc-300 bg-zinc-800/40'
        : 'border-zinc-700 bg-zinc-100'
      : ''
  } ${canUpload ? '' : 'opacity-60 cursor-not-allowed'}`;

  return (
    <div className="space-y-3 min-w-0">
      {policyState === 'loading' && (
        <div
          className={`rounded-xl p-3 text-xs ${appCardClass(isDark)} ${
            isDark ? 'text-zinc-400' : 'text-zinc-600'
          }`}
        >
          Loading storage policy…
        </div>
      )}
      {policyState === 'error' && (
        <div className={`rounded-lg px-3 py-2 text-xs ${appErrorBannerClass(isDark)}`}>
          {policyError || 'Could not load storage policy.'}
        </div>
      )}

      <div
        className={dropClass}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        role="button"
        tabIndex={0}
        aria-label="Drop files to upload"
        onClick={() => canUpload && fileRef.current?.click()}
        onKeyDown={(e) => {
          if (!canUpload) return;
          if (e.key === 'Enter' || e.key === ' ') fileRef.current?.click();
        }}
      >
        <input
          ref={fileRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileInput}
          disabled={!canUpload}
        />
        <div className="flex flex-col items-center text-center gap-2">
          <span
            className={`inline-flex h-10 w-10 items-center justify-center rounded-full ${
              isDark ? 'bg-zinc-800 text-zinc-200' : 'bg-zinc-100 text-zinc-700'
            }`}
          >
            <UploadCloud size={18} />
          </span>
          <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
            {canUpload ? 'Drop files here or click to upload' : 'You do not have permission to upload here.'}
          </p>
          <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>
            Files are versioned automatically. Limits per MIME group are set under Org → Storage policy.
          </p>
          <button
            type="button"
            disabled={!canUpload}
            onClick={(e) => {
              e.stopPropagation();
              fileRef.current?.click();
            }}
            className={`${appOutlineButtonClass(isDark)} mt-1`}
          >
            Choose files
          </button>
        </div>
      </div>

      {items.length > 0 && (
        <ul className={`rounded-xl p-3 space-y-2 ${appCardClass(isDark)}`}>
          {items.map((item) => (
            <li
              key={item.id}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 ${
                isDark ? 'bg-zinc-900/50' : 'bg-zinc-50'
              }`}
            >
              <span className="shrink-0">
                {item.state.kind === 'uploading' || item.state.kind === 'processing' ? (
                  <Loader2 size={16} className={`animate-spin ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`} />
                ) : item.state.kind === 'ready' ? (
                  <CheckCircle2 size={16} className={isDark ? 'text-emerald-300' : 'text-emerald-600'} />
                ) : item.state.kind === 'failed' ? (
                  <FileWarning size={16} className={isDark ? 'text-rose-300' : 'text-rose-600'} />
                ) : (
                  <UploadCloud size={16} className={isDark ? 'text-zinc-500' : 'text-zinc-500'} />
                )}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p
                    className={`text-sm font-bold truncate ${
                      isDark ? 'text-zinc-100' : 'text-zinc-900'
                    }`}
                  >
                    {item.file.name}
                  </p>
                  <StatusPill state={item.state} isDark={isDark} />
                </div>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className={`text-[11px] ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>
                    {formatBytes(item.file.size)} · {item.file.type || 'unknown'}
                  </p>
                  {item.state.kind === 'uploading' && (
                    <div className="flex-1 max-w-[200px]">
                      <div
                        className={`h-1.5 rounded-full ${
                          isDark ? 'bg-zinc-800' : 'bg-zinc-200'
                        }`}
                      >
                        <div
                          className={`h-full rounded-full ${
                            isDark ? 'bg-emerald-400' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${item.state.percent}%` }}
                        />
                      </div>
                    </div>
                  )}
                  {item.state.kind === 'failed' && (
                    <p className={`text-[11px] ${isDark ? 'text-rose-300' : 'text-rose-600'}`}>
                      {item.state.error}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeItem(item.id)}
                className={`p-1 rounded-md ${
                  isDark
                    ? 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800'
                    : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
                }`}
                aria-label="Remove from list"
              >
                <X size={14} />
              </button>
            </li>
          ))}
          {items.some((item) => item.state.kind === 'ready') && (
            <li className={`rounded-lg px-3 py-2 text-xs ${appSuccessBannerClass(isDark)}`}>
              Uploaded files appear in the asset table below as "internal" — toggle "Client visible"
              when you're ready to share.
            </li>
          )}
        </ul>
      )}
    </div>
  );
};

export default ProjectAssetUploader;
