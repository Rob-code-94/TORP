import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronUp, ExternalLink, Loader2, Pencil, Plus, Trash2, Upload, X } from 'lucide-react';
import { WORK_CATEGORY_FILTERS } from '../../../../constants';
import {
  deletePortfolioLandingProject,
  listPortfolioLandingProjects,
  mergePortfolioMediaFromAlternateTenant,
  replacePortfolioLandingOrder,
  savePortfolioLandingProject,
  seedPortfolioLandingFromConstants,
  seedPortfolioLandingMarketingTwelve,
} from '../../../../data/portfolioLandingRepository';
import { useAdminTheme } from '../../../../lib/adminTheme';
import { appPanelClass } from '../../../../lib/appThemeClasses';
import { formatFirestoreListError } from '../../../../lib/formatFirestoreListError';
import { getPortfolioMarketingTenantId } from '../../../../lib/marketingTenant';
import { CARD_ASPECT_OPTIONS } from '../../../../lib/portfolioMedia';
import { useAuth } from '../../../../lib/auth';
import {
  uploadPortfolioLandingImage,
  uploadPortfolioLandingVideo,
  type PortfolioLandingUploadProgress,
} from '../../../../lib/portfolioLandingStorage';
import PortfolioUploadProgress, {
  PORTFOLIO_GALLERY_ACCEPT,
  PORTFOLIO_GALLERY_HINT,
  PORTFOLIO_IMAGE_ACCEPT,
  PORTFOLIO_IMAGE_HINT,
  PORTFOLIO_VIDEO_ACCEPT,
  PORTFOLIO_VIDEO_HINT,
  type PortfolioUploadFeedback,
} from '../PortfolioUploadProgress';
import type { GalleryAspect, ProjectCategory, VideoProject, VideoProjectCredit, VideoProjectGalleryItem } from '../../../../types';

interface PortfolioLandingSectionProps {
  canEdit: boolean;
}

const CATEGORY_OPTIONS = WORK_CATEGORY_FILTERS.filter((c): c is ProjectCategory => c !== 'All');

const ASPECT_GALLERY: GalleryAspect[] = ['video', 'portrait', 'square', 'wide'];

const THUMBNAIL_SHOWS_ON = 'Selected Works grid + Next project card';
const FEATURED_VIDEO_SHOWS_ON = 'Selected Works hover + case-study hero';
const FILMS_GALLERY_SHOWS_ON = 'Case-study Films section only';

function emptyProject(): VideoProject {
  return {
    id: `draft-${Date.now()}`,
    slug: '',
    title: '',
    client: '',
    year: String(new Date().getFullYear()),
    category: 'Spec',
    tags: [],
    aspectRatio: 'video',
    thumbnail: '',
    heroImage: '',
    logline: '',
    role: '',
    deliverables: [],
    gallery: [],
    credits: [],
  };
}

function cloneVideoProject(project: VideoProject): VideoProject {
  return {
    ...project,
    tags: [...project.tags],
    deliverables: [...project.deliverables],
    gallery: project.gallery.map((item) => ({ ...item })),
    credits: project.credits.map((credit) => ({ ...credit })),
  };
}

function hasFeaturedVideo(project: VideoProject): boolean {
  return Boolean(project.featuredVideoUrl?.trim());
}

const PortfolioLandingSection: React.FC<PortfolioLandingSectionProps> = ({ canEdit }) => {
  const { theme } = useAdminTheme();
  const { user } = useAuth();
  const isDark = theme === 'dark';
  const tenantId = getPortfolioMarketingTenantId();
  const alternateTenantId = user?.tenantId?.trim() || '';
  const [items, setItems] = useState<VideoProject[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [uploadFeedback, setUploadFeedback] = useState<Record<string, PortfolioUploadFeedback>>({});
  const uploadClearTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const editSnapshotRef = useRef<VideoProject | null>(null);
  const [seeding, setSeeding] = useState(false);
  const thumbRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const heroRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const featuredVideoRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const galleryRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const refresh = useCallback(async () => {
    setState('loading');
    setError(null);
    try {
      if (alternateTenantId && alternateTenantId !== tenantId) {
        const { mergedCount } = await mergePortfolioMediaFromAlternateTenant(tenantId, alternateTenantId);
        if (mergedCount > 0) {
          setWarning(
            `Restored media for ${mergedCount} project(s) from a previous save location. Reload the public site to see updates.`,
          );
        }
      }
      const rows = await listPortfolioLandingProjects(tenantId);
      setItems(rows);
      setState('ready');
    } catch (err) {
      setState('error');
      setError(formatFirestoreListError(err, 'portfolio'));
    }
  }, [tenantId, alternateTenantId]);

  useEffect(() => {
    return () => {
      Object.values(uploadClearTimers.current).forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    const uploading = Object.values(uploadFeedback).some((f) => f.status === 'uploading');
    if (!uploading) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [uploadFeedback]);

  const setFieldUploadFeedback = (key: string, feedback: PortfolioUploadFeedback | null) => {
    setUploadFeedback((prev) => {
      const next = { ...prev };
      if (feedback) next[key] = feedback;
      else delete next[key];
      return next;
    });
  };

  const scheduleUploadFeedbackClear = (key: string, delayMs = 6000) => {
    if (uploadClearTimers.current[key]) clearTimeout(uploadClearTimers.current[key]);
    uploadClearTimers.current[key] = setTimeout(() => {
      setFieldUploadFeedback(key, null);
      delete uploadClearTimers.current[key];
    }, delayMs);
  };

  const onUploadProgress = (key: string, label: string) => (progress: PortfolioLandingUploadProgress) => {
    setFieldUploadFeedback(key, { status: 'uploading', progress, label });
  };

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const slugCounts = useMemo(() => {
    const m = new Map<string, number>();
    items.forEach((p) => {
      const s = p.slug.trim().toLowerCase();
      if (!s) return;
      m.set(s, (m.get(s) || 0) + 1);
    });
    return m;
  }, [items]);

  const updateItem = (id: string, patch: Partial<VideoProject>) => {
    setItems((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };

  const cancelEdit = (projectId: string) => {
    const snap = editSnapshotRef.current;
    if (snap?.id === projectId) {
      setItems((prev) => prev.map((p) => (p.id === projectId ? snap : p)));
    }
    editSnapshotRef.current = null;
    setEditingProjectId((current) => (current === projectId ? null : current));
  };

  const beginEdit = (project: VideoProject) => {
    if (editingProjectId && editingProjectId !== project.id) {
      cancelEdit(editingProjectId);
    }
    editSnapshotRef.current = cloneVideoProject(project);
    setEditingProjectId(project.id);
    setError(null);
    setWarning(null);
  };

  const finishEdit = () => {
    editSnapshotRef.current = null;
    setEditingProjectId(null);
  };

  const move = async (index: number, dir: -1 | 1) => {
    if (!canEdit) return;
    if (items.some((p) => p.id.startsWith('draft-'))) {
      setError('Save new projects before changing order.');
      return;
    }
    const j = index + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    const t = next[index]!;
    next[index] = next[j]!;
    next[j] = t;
    setItems(next);
    setSavingId('_reorder');
    setError(null);
    try {
      await replacePortfolioLandingOrder(tenantId, next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reorder.');
      void refresh();
    } finally {
      setSavingId(null);
    }
  };

  const handleSave = async (project: VideoProject, index: number) => {
    if (!canEdit) return;
    const slug = project.slug.trim().toLowerCase();
    if (!slug || !project.title.trim()) {
      setError('Slug and title are required.');
      return;
    }
    const dup = items.filter((p) => p.id !== project.id && p.slug.trim().toLowerCase() === slug);
    if (dup.length > 0) {
      setError('Another project already uses this slug.');
      return;
    }
    setSavingId(project.id);
    setError(null);
    try {
      const saved = await savePortfolioLandingProject(tenantId, { ...project, slug: project.slug.trim() }, index + 1);
      setItems((prev) => prev.map((p, i) => (i === index ? saved : p)));
      finishEdit();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (project: VideoProject) => {
    if (!canEdit) return;
    if (!globalThis.confirm(`Delete "${project.title || project.slug}" from the landing portfolio?`)) return;
    setSavingId(project.id);
    setError(null);
    try {
      await deletePortfolioLandingProject(tenantId, project.id);
      if (editingProjectId === project.id) finishEdit();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed.');
    } finally {
      setSavingId(null);
    }
  };

  const handleAdd = () => {
    if (!canEdit) return;
    const created = emptyProject();
    setItems((prev) => [...prev, created]);
    beginEdit(created);
  };

  const handleSeed = async () => {
    if (!canEdit) return;
    if (items.length > 0) {
      const ok = globalThis.confirm(
        'Importing writes bundled defaults and may overwrite Firestore docs with the same ids as the built‑in portfolio. Continue?',
      );
      if (!ok) return;
    }
    setSeeding(true);
    setError(null);
    setWarning(null);
    try {
      await seedPortfolioLandingFromConstants(tenantId);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed.');
    } finally {
      setSeeding(false);
    }
  };

  const handleSeedMarketingTwelve = async () => {
    if (!canEdit) return;
    const ok = globalThis.confirm(
      'Creates 12 marketing portfolio case studies (Media Assets map). Overwrites Firestore docs with matching portfolio-* ids. Continue?',
    );
    if (!ok) return;
    setSeeding(true);
    setError(null);
    setWarning(null);
    try {
      await seedPortfolioLandingMarketingTwelve(tenantId);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed.');
    } finally {
      setSeeding(false);
    }
  };

  const runUpload =
    (
      project: VideoProject,
      field: 'thumbnail' | 'heroImage' | 'featuredVideoUrl',
      index: number,
    ): React.ChangeEventHandler<HTMLInputElement> =>
    async (event) => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file || !canEdit || editingProjectId !== project.id) return;
      const key = `${project.id}-${field}`;
      const label =
        field === 'thumbnail' ? 'Thumbnail' : field === 'heroImage' ? 'Hero poster' : 'Featured video';
      setUploadingKey(key);
      setError(null);
      setWarning(null);
      setFieldUploadFeedback(key, {
        status: 'uploading',
        progress: { percent: 0, bytesTransferred: 0, totalBytes: file.size },
        label,
      });
      try {
        const up =
          field === 'featuredVideoUrl'
            ? await uploadPortfolioLandingVideo({
                assetId: `${project.id}-featured`,
                file,
                onProgress: onUploadProgress(key, label),
              })
            : await uploadPortfolioLandingImage({
                assetId: `${project.id}-${field}`,
                file,
                onProgress: onUploadProgress(key, label),
              });
        if (up.warning) setWarning(up.warning);
        const next =
          field === 'thumbnail'
            ? { thumbnail: up.downloadUrl }
            : field === 'heroImage'
              ? { heroImage: up.downloadUrl }
              : { featuredVideoUrl: up.downloadUrl };
        const merged = { ...project, ...next };
        const saved = await savePortfolioLandingProject(tenantId, merged, index + 1);
        setItems((prev) => prev.map((p) => (p.id === project.id ? saved : p)));
        if (editingProjectId === project.id) {
          editSnapshotRef.current = cloneVideoProject(saved);
        }
        setFieldUploadFeedback(key, {
          status: 'success',
          progress: { percent: 100, bytesTransferred: file.size, totalBytes: file.size },
          label,
          message: `Upload complete — saved to ${label}. URL updated below.`,
        });
        scheduleUploadFeedbackClear(key);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Upload failed.';
        setError(message);
        setFieldUploadFeedback(key, {
          status: 'error',
          progress: null,
          label,
          message,
        });
        scheduleUploadFeedbackClear(key, 12000);
      } finally {
        setUploadingKey(null);
      }
    };

  const runGalleryUpload = (project: VideoProject, galleryIndex: number, projectIndex: number): React.ChangeEventHandler<HTMLInputElement> =>
    async (event) => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file || !canEdit || editingProjectId !== project.id) return;
      const key = `${project.id}-g-${galleryIndex}`;
      const label = `Film row ${galleryIndex + 1}`;
      setUploadingKey(key);
      setError(null);
      setWarning(null);
      setFieldUploadFeedback(key, {
        status: 'uploading',
        progress: { percent: 0, bytesTransferred: 0, totalBytes: file.size },
        label,
      });
      try {
        const isVideo = (file.type || '').startsWith('video/');
        const up = isVideo
          ? await uploadPortfolioLandingVideo({
              assetId: `${project.id}-g${galleryIndex}`,
              file,
              onProgress: onUploadProgress(key, label),
            })
          : await uploadPortfolioLandingImage({
              assetId: `${project.id}-g${galleryIndex}`,
              file,
              onProgress: onUploadProgress(key, label),
            });
        if (up.warning) setWarning(up.warning);
        const gal = [...project.gallery];
        const row = gal[galleryIndex] ?? { src: '', aspect: 'video' as const, mediaType: 'video' as const };
        gal[galleryIndex] = { ...row, src: up.downloadUrl, mediaType: isVideo ? 'video' : 'image' };
        const merged = { ...project, gallery: gal };
        const saved = await savePortfolioLandingProject(tenantId, merged, projectIndex + 1);
        setItems((prev) => prev.map((p) => (p.id === project.id ? saved : p)));
        if (editingProjectId === project.id) {
          editSnapshotRef.current = cloneVideoProject(saved);
        }
        setFieldUploadFeedback(key, {
          status: 'success',
          progress: { percent: 100, bytesTransferred: file.size, totalBytes: file.size },
          label,
          message: `Upload complete — saved to ${label}. URL updated below.`,
        });
        scheduleUploadFeedbackClear(key);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Upload failed.';
        setError(message);
        setFieldUploadFeedback(key, {
          status: 'error',
          progress: null,
          label,
          message,
        });
        scheduleUploadFeedbackClear(key, 12000);
      } finally {
        setUploadingKey(null);
      }
    };

  const inputCls = `mt-1 w-full min-w-0 rounded-md border px-2 py-1.5 text-sm ${
    isDark ? 'border-zinc-700 bg-zinc-950 text-zinc-100' : 'border-zinc-300 bg-white text-zinc-900'
  }`;

  const labelCls = `text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`;

  return (
    <section className={`rounded-xl p-4 ${appPanelClass(isDark)} min-w-0`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between min-w-0">
        <div className="min-w-0">
          <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Landing portfolio</h3>
          <p className={`text-xs mt-1 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
            Selected works and case study overlays on the public site. Posters and video reels upload to{' '}
            <code className="text-[10px]">public/portfolio/</code> (MP4/MOV/WebM recommended for reels).
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          {canEdit ? (
            <Link
              to="/?marketingEdit=1#landing-selected-works"
              className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-md border border-zinc-500 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-zinc-100 transition-colors hover:border-white hover:bg-zinc-800/60"
            >
              <ExternalLink size={12} aria-hidden />
              Edit on site
            </Link>
          ) : null}
          <button
            type="button"
            disabled={!canEdit || seeding}
            onClick={() => void handleSeedMarketingTwelve()}
            className="rounded-md border border-white/30 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-zinc-100 disabled:opacity-50"
          >
            {seeding ? <Loader2 size={12} className="inline animate-spin" /> : null} Seed 12 showcase
          </button>
          <button
            type="button"
            disabled={!canEdit || seeding}
            onClick={() => void handleSeed()}
            className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-zinc-100 disabled:opacity-50"
          >
            Import bundled defaults
          </button>
          <button
            type="button"
            disabled={!canEdit}
            onClick={handleAdd}
            className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-zinc-100 disabled:opacity-50"
          >
            <span className="inline-flex items-center gap-1">
              <Plus size={12} /> Add project
            </span>
          </button>
        </div>
      </div>

      {warning ? <p className="mt-2 text-xs text-amber-300/90 break-words">{warning}</p> : null}
      {error && <p className="mt-2 text-xs text-rose-400 break-words">{error}</p>}

      {state === 'loading' ? (
        <p className="mt-3 text-xs text-zinc-500">Loading portfolio…</p>
      ) : items.length === 0 ? (
        <p className="mt-3 text-xs text-zinc-500">No saved portfolio entries. Import bundled defaults or add a project.</p>
      ) : (
        <ul className="mt-4 space-y-3 min-w-0">
          {items.map((project, index) => {
            const slugDup = project.slug.trim() && (slugCounts.get(project.slug.trim().toLowerCase()) ?? 0) > 1;
            const isEditing = editingProjectId === project.id;
            const videoReady = hasFeaturedVideo(project);
            return (
              <li
                key={project.id}
                className={`rounded-lg border min-w-0 overflow-hidden ${
                  isEditing
                    ? isDark
                      ? 'border-white/25 bg-zinc-900/50 ring-1 ring-white/10'
                      : 'border-zinc-400 bg-white ring-1 ring-zinc-300'
                    : isDark
                      ? 'border-zinc-800 bg-zinc-900/40'
                      : 'border-zinc-200 bg-zinc-50/80'
                }`}
              >
                <div
                  className={`flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-3 py-2 border-b min-w-0 ${
                    isDark ? 'border-zinc-800 bg-zinc-900/60' : 'border-zinc-200 bg-white/80'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className={`text-sm font-semibold truncate ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                        {project.title || '(untitled)'}
                      </p>
                      <span
                        className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-mono uppercase tracking-wide ${
                          videoReady
                            ? 'border-emerald-800/60 bg-emerald-950/40 text-emerald-300'
                            : 'border-amber-800/60 bg-amber-950/40 text-amber-300'
                        }`}
                      >
                        {videoReady ? 'Video ready' : 'Needs video'}
                      </span>
                      {isEditing ? (
                        <span className="shrink-0 text-[10px] font-mono uppercase tracking-wide text-zinc-400">
                          Editing
                        </span>
                      ) : null}
                    </div>
                    <p className="text-[11px] text-zinc-500 truncate">
                      {project.slug || 'no slug'} · order {index + 1}
                      {slugDup ? <span className="text-rose-400 ml-2">Duplicate slug</span> : null}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={!canEdit || index === 0 || savingId === '_reorder' || isEditing}
                      onClick={() => void move(index, -1)}
                      className="rounded-md border border-zinc-700 px-2 py-1 text-[11px] text-zinc-200 disabled:opacity-40"
                      aria-label="Move up"
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      type="button"
                      disabled={!canEdit || index >= items.length - 1 || savingId === '_reorder' || isEditing}
                      onClick={() => void move(index, 1)}
                      className="rounded-md border border-zinc-700 px-2 py-1 text-[11px] text-zinc-200 disabled:opacity-40"
                      aria-label="Move down"
                    >
                      <ChevronDown size={14} />
                    </button>
                    {canEdit && !isEditing ? (
                      <button
                        type="button"
                        onClick={() => beginEdit(project)}
                        className="rounded-md border border-zinc-700 px-2 py-1 text-[11px] text-zinc-200 hover:border-zinc-500"
                        aria-label={`Edit ${project.title || project.slug || 'project'}`}
                      >
                        <Pencil size={12} className="inline mr-1" />
                        Edit
                      </button>
                    ) : null}
                    {canEdit && isEditing ? (
                      <>
                        <button
                          type="button"
                          disabled={savingId === project.id}
                          onClick={() => void handleSave(project, index)}
                          className="rounded-md border border-zinc-700 px-2 py-1 text-[11px] text-zinc-200 disabled:opacity-50"
                        >
                          {savingId === project.id ? <Loader2 size={12} className="inline animate-spin" /> : null} Save
                        </button>
                        <button
                          type="button"
                          disabled={savingId === project.id}
                          onClick={() => cancelEdit(project.id)}
                          className="rounded-md border border-zinc-700 px-2 py-1 text-[11px] text-zinc-400 disabled:opacity-50"
                          aria-label="Cancel edit"
                        >
                          <X size={12} className="inline" />
                        </button>
                        <button
                          type="button"
                          disabled={savingId === project.id}
                          onClick={() => void handleDelete(project)}
                          className="rounded-md border border-red-900/60 px-2 py-1 text-[11px] text-red-300 disabled:opacity-50"
                          aria-label={`Delete ${project.title || project.slug || 'project'}`}
                        >
                          <Trash2 size={12} className="inline" />
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>

                {isEditing ? (
                <div className="px-3 py-3 min-w-0">
                  <p className={`text-[11px] font-mono uppercase tracking-wider mb-3 ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>
                    Fields & uploads
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 min-w-0">
                    <div className="min-w-0">
                      <label className={labelCls}>Slug (URL)</label>
                      <input
                        className={inputCls}
                        value={project.slug}
                        onChange={(e) => updateItem(project.id, { slug: e.target.value })}
                        disabled={!canEdit}
                      />
                    </div>
                    <div className="min-w-0">
                      <label className={labelCls}>Title</label>
                      <input
                        className={inputCls}
                        value={project.title}
                        onChange={(e) => updateItem(project.id, { title: e.target.value })}
                        disabled={!canEdit}
                      />
                    </div>
                    <div className="min-w-0">
                      <label className={labelCls}>Client</label>
                      <input
                        className={inputCls}
                        value={project.client}
                        onChange={(e) => updateItem(project.id, { client: e.target.value })}
                        disabled={!canEdit}
                      />
                    </div>
                    <div className="min-w-0">
                      <label className={labelCls}>Year</label>
                      <input
                        className={inputCls}
                        value={project.year}
                        onChange={(e) => updateItem(project.id, { year: e.target.value })}
                        disabled={!canEdit}
                      />
                    </div>
                    <div className="min-w-0">
                      <label className={labelCls}>Category</label>
                      <select
                        className={inputCls}
                        value={project.category}
                        onChange={(e) =>
                          updateItem(project.id, { category: e.target.value as ProjectCategory })
                        }
                        disabled={!canEdit}
                      >
                        {CATEGORY_OPTIONS.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="min-w-0">
                      <label className={labelCls}>Card aspect</label>
                      <select
                        className={inputCls}
                        value={project.aspectRatio}
                        onChange={(e) =>
                          updateItem(project.id, {
                            aspectRatio: e.target.value as VideoProject['aspectRatio'],
                          })
                        }
                        disabled={!canEdit}
                      >
                        {CARD_ASPECT_OPTIONS.map((a) => (
                          <option key={a.value} value={a.value}>
                            {a.label}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-[10px] text-zinc-500">
                        Controls Selected Works card shape on the public site.
                      </p>
                    </div>
                    <div className="md:col-span-2 min-w-0">
                      <label className={labelCls}>Tags (comma-separated)</label>
                      <input
                        className={inputCls}
                        value={project.tags.join(', ')}
                        onChange={(e) =>
                          updateItem(project.id, {
                            tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean),
                          })
                        }
                        disabled={!canEdit}
                      />
                    </div>
                    <div className="md:col-span-2 min-w-0">
                      <label className={labelCls}>Deliverables (comma-separated)</label>
                      <input
                        className={inputCls}
                        value={project.deliverables.join(', ')}
                        onChange={(e) =>
                          updateItem(project.id, {
                            deliverables: e.target.value.split(',').map((t) => t.trim()).filter(Boolean),
                          })
                        }
                        disabled={!canEdit}
                      />
                    </div>
                    <div className="md:col-span-2 min-w-0">
                      <label className={labelCls}>Role</label>
                      <input
                        className={inputCls}
                        value={project.role}
                        onChange={(e) => updateItem(project.id, { role: e.target.value })}
                        disabled={!canEdit}
                      />
                    </div>
                    <div className="md:col-span-2 min-w-0">
                      <label className={labelCls}>Location (optional)</label>
                      <input
                        className={inputCls}
                        value={project.location ?? ''}
                        onChange={(e) =>
                          updateItem(project.id, { ...(e.target.value ? { location: e.target.value } : { location: undefined }) })
                        }
                        disabled={!canEdit}
                      />
                    </div>
                    <div className="md:col-span-2 min-w-0">
                      <label className={labelCls}>Logline</label>
                      <textarea
                        className={`${inputCls} min-h-[72px]`}
                        value={project.logline}
                        onChange={(e) => updateItem(project.id, { logline: e.target.value })}
                        disabled={!canEdit}
                      />
                    </div>

                    <div className="md:col-span-2 min-w-0 space-y-2">
                      <p className={labelCls}>Thumbnail</p>
                      <p className="text-[10px] text-zinc-500 break-words">
                        Shows on: {THUMBNAIL_SHOWS_ON}
                      </p>
                      <p className="text-[10px] text-zinc-500 break-words">{PORTFOLIO_IMAGE_HINT}</p>
                      <div className="flex flex-wrap items-center gap-2 min-w-0">
                        <input
                          ref={(el) => {
                            thumbRefs.current[`${project.id}-thumb`] = el;
                          }}
                          type="file"
                          accept={PORTFOLIO_IMAGE_ACCEPT}
                          className="hidden"
                          onChange={runUpload(project, 'thumbnail', index)}
                          disabled={!canEdit || uploadingKey?.startsWith(project.id)}
                        />
                        <button
                          type="button"
                          disabled={!canEdit || uploadingKey === `${project.id}-thumbnail`}
                          onClick={() => thumbRefs.current[`${project.id}-thumb`]?.click()}
                          className="rounded-md border border-zinc-700 px-2 py-1 text-[11px] text-zinc-200 disabled:opacity-50"
                        >
                          {uploadingKey === `${project.id}-thumbnail` ? (
                            <Loader2 size={12} className="inline mr-1 animate-spin" />
                          ) : (
                            <Upload size={12} className="inline mr-1" />
                          )}
                          Upload
                        </button>
                        <input
                          className={`${inputCls} flex-1 min-w-[12rem]`}
                          value={project.thumbnail}
                          onChange={(e) => updateItem(project.id, { thumbnail: e.target.value })}
                          disabled={!canEdit}
                          placeholder="https://…"
                        />
                      </div>
                      <PortfolioUploadProgress feedback={uploadFeedback[`${project.id}-thumbnail`]} />
                    </div>

                    <div className="md:col-span-2 min-w-0 space-y-2">
                      <p className={labelCls}>Featured video (grid hover + hero)</p>
                      <p className="text-[10px] text-zinc-500 break-words">
                        Shows on: {FEATURED_VIDEO_SHOWS_ON}
                      </p>
                      <p className="text-[10px] text-zinc-500 break-words">{PORTFOLIO_VIDEO_HINT}</p>
                      <div className="flex flex-wrap items-center gap-2 min-w-0">
                        <input
                          ref={(el) => {
                            featuredVideoRefs.current[`${project.id}-featured`] = el;
                          }}
                          type="file"
                          accept={PORTFOLIO_VIDEO_ACCEPT}
                          className="hidden"
                          onChange={runUpload(project, 'featuredVideoUrl', index)}
                          disabled={!canEdit || uploadingKey?.startsWith(project.id)}
                        />
                        <button
                          type="button"
                          disabled={!canEdit || uploadingKey === `${project.id}-featuredVideoUrl`}
                          onClick={() => featuredVideoRefs.current[`${project.id}-featured`]?.click()}
                          className="rounded-md border border-zinc-700 px-2 py-1 text-[11px] text-zinc-200 disabled:opacity-50"
                        >
                          {uploadingKey === `${project.id}-featuredVideoUrl` ? (
                            <Loader2 size={12} className="inline mr-1 animate-spin" />
                          ) : (
                            <Upload size={12} className="inline mr-1" />
                          )}
                          Upload video
                        </button>
                        <input
                          className={`${inputCls} flex-1 min-w-[12rem]`}
                          value={project.featuredVideoUrl ?? ''}
                          onChange={(e) => updateItem(project.id, { featuredVideoUrl: e.target.value || undefined })}
                          disabled={!canEdit}
                          placeholder="https://…mp4"
                        />
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end min-w-0">
                        <label className="min-w-0 sm:w-28">
                          <span className={labelCls}>Start (sec)</span>
                          <input
                            type="number"
                            min={0}
                            step={0.1}
                            className={inputCls}
                            value={project.featuredVideoStartSeconds ?? ''}
                            onChange={(e) => {
                              const raw = e.target.value.trim();
                              updateItem(project.id, {
                                featuredVideoStartSeconds: raw
                                  ? Math.max(0, Number(raw) || 0)
                                  : undefined,
                              });
                            }}
                            disabled={!canEdit}
                            placeholder="0"
                          />
                        </label>
                        <label className="min-w-0 sm:w-32">
                          <span className={labelCls}>Loop end (sec)</span>
                          <input
                            type="number"
                            min={0}
                            step={0.1}
                            className={inputCls}
                            value={project.featuredVideoEndSeconds ?? ''}
                            onChange={(e) => {
                              const raw = e.target.value.trim();
                              updateItem(project.id, {
                                featuredVideoEndSeconds: raw
                                  ? Math.max(0, Number(raw) || 0)
                                  : undefined,
                              });
                            }}
                            disabled={!canEdit}
                            placeholder="optional"
                          />
                        </label>
                        <p className="text-[10px] text-zinc-500 sm:pb-2 sm:flex-1 min-w-0">
                          Grid hover and hero loop this segment. Leave loop end empty to play from start to end of file.
                          Segment fields do not reduce upload size — export a short clip for large masters.
                        </p>
                      </div>
                      <PortfolioUploadProgress feedback={uploadFeedback[`${project.id}-featuredVideoUrl`]} />
                    </div>

                    <div className="md:col-span-2 min-w-0 space-y-2">
                      <p className={labelCls}>Watch full film (Vimeo / YouTube)</p>
                      <input
                        className={inputCls}
                        value={project.fullFilmUrl ?? ''}
                        onChange={(e) => updateItem(project.id, { fullFilmUrl: e.target.value.trim() || undefined })}
                        disabled={!canEdit}
                        placeholder="https://vimeo.com/…"
                      />
                    </div>

                    <div className="md:col-span-2 min-w-0 space-y-2">
                      <p className={labelCls}>Hero poster</p>
                      <p className="text-[10px] text-zinc-500 break-words">{PORTFOLIO_IMAGE_HINT}</p>
                      <div className="flex flex-wrap items-center gap-2 min-w-0">
                        <input
                          ref={(el) => {
                            heroRefs.current[`${project.id}-hero`] = el;
                          }}
                          type="file"
                          accept={PORTFOLIO_IMAGE_ACCEPT}
                          className="hidden"
                          onChange={runUpload(project, 'heroImage', index)}
                          disabled={!canEdit || uploadingKey?.startsWith(project.id)}
                        />
                        <button
                          type="button"
                          disabled={!canEdit || uploadingKey === `${project.id}-heroImage`}
                          onClick={() => heroRefs.current[`${project.id}-hero`]?.click()}
                          className="rounded-md border border-zinc-700 px-2 py-1 text-[11px] text-zinc-200 disabled:opacity-50"
                        >
                          {uploadingKey === `${project.id}-heroImage` ? (
                            <Loader2 size={12} className="inline mr-1 animate-spin" />
                          ) : (
                            <Upload size={12} className="inline mr-1" />
                          )}
                          Upload
                        </button>
                        <input
                          className={`${inputCls} flex-1 min-w-[12rem]`}
                          value={project.heroImage}
                          onChange={(e) => updateItem(project.id, { heroImage: e.target.value })}
                          disabled={!canEdit}
                          placeholder="https://…"
                        />
                      </div>
                      <PortfolioUploadProgress feedback={uploadFeedback[`${project.id}-heroImage`]} />
                    </div>

                    <div className="md:col-span-2 min-w-0 space-y-2">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <p className={labelCls}>Films (gallery)</p>
                        <p className="text-[10px] text-zinc-500 break-words">
                          Shows on: {FILMS_GALLERY_SHOWS_ON}
                        </p>
                        <button
                          type="button"
                          disabled={!canEdit}
                          onClick={() =>
                            updateItem(project.id, {
                              gallery: [
                                ...project.gallery,
                                { src: '', aspect: 'video', caption: '', mediaType: 'video' },
                              ],
                            })
                          }
                          className="text-[11px] text-zinc-400 hover:text-white"
                        >
                          + Row
                        </button>
                      </div>
                      <p className="text-[10px] text-zinc-500 break-words">{PORTFOLIO_GALLERY_HINT}</p>
                      <div className="space-y-2 max-h-[240px] overflow-y-auto rounded-md border border-zinc-800 p-2 min-w-0">
                        {project.gallery.length === 0 ? (
                          <p className="text-[11px] text-zinc-600">No films — add rows or paste video URLs.</p>
                        ) : (
                          project.gallery.map((g, gi) => (
                            <div
                              key={`${project.id}-g-${gi}`}
                              className={`flex flex-col gap-1 sm:flex-row sm:items-end sm:flex-wrap p-2 rounded min-w-0 ${
                                isDark ? 'bg-zinc-950/80' : 'bg-white'
                              }`}
                            >
                              <input
                                ref={(el) => {
                                  galleryRefs.current[`${project.id}-${gi}`] = el;
                                }}
                                type="file"
                                accept={PORTFOLIO_GALLERY_ACCEPT}
                                className="hidden"
                                onChange={runGalleryUpload(project, gi, index)}
                                disabled={!canEdit || uploadingKey?.startsWith(project.id)}
                              />
                              <button
                                type="button"
                                disabled={!canEdit || uploadingKey === `${project.id}-g-${gi}`}
                                onClick={() => galleryRefs.current[`${project.id}-${gi}`]?.click()}
                                className="shrink-0 rounded border border-zinc-700 px-2 py-1 text-[10px] text-zinc-300 self-start disabled:opacity-50"
                              >
                                {uploadingKey === `${project.id}-g-${gi}` ? (
                                  <Loader2 size={10} className="inline mr-0.5 animate-spin" />
                                ) : null}
                                Upload
                              </button>
                              <input
                                className={`${inputCls} sm:flex-1 min-w-0`}
                                value={g.src}
                                onChange={(e) => {
                                  const gal = [...project.gallery];
                                  gal[gi] = { ...g, src: e.target.value };
                                  updateItem(project.id, { gallery: gal });
                                }}
                                disabled={!canEdit}
                                placeholder="Video URL"
                              />
                              <select
                                className={`${inputCls} sm:w-28 shrink-0`}
                                value={g.aspect}
                                onChange={(e) => {
                                  const gal = [...project.gallery];
                                  gal[gi] = { ...g, aspect: e.target.value as GalleryAspect };
                                  updateItem(project.id, { gallery: gal });
                                }}
                                disabled={!canEdit}
                              >
                                {ASPECT_GALLERY.map((a) => (
                                  <option key={a} value={a}>
                                    {a}
                                  </option>
                                ))}
                              </select>
                              <input
                                className={`${inputCls} sm:flex-1 min-w-0`}
                                value={g.caption ?? ''}
                                onChange={(e) => {
                                  const gal = [...project.gallery];
                                  gal[gi] = { ...g, caption: e.target.value };
                                  updateItem(project.id, { gallery: gal });
                                }}
                                disabled={!canEdit}
                                placeholder="Caption"
                              />
                              <button
                                type="button"
                                disabled={!canEdit}
                                onClick={() => {
                                  const gal = project.gallery.filter((_, j) => j !== gi);
                                  updateItem(project.id, { gallery: gal });
                                }}
                                className="text-[11px] text-red-400 shrink-0"
                              >
                                Remove
                              </button>
                              <div className="w-full min-w-0 basis-full">
                                <PortfolioUploadProgress feedback={uploadFeedback[`${project.id}-g-${gi}`]} />
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="md:col-span-2 min-w-0 space-y-2">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <p className={labelCls}>Credits</p>
                        <button
                          type="button"
                          disabled={!canEdit}
                          onClick={() =>
                            updateItem(project.id, {
                              credits: [...project.credits, { label: '', value: '' }],
                            })
                          }
                          className="text-[11px] text-zinc-400 hover:text-white"
                        >
                          + Row
                        </button>
                      </div>
                      <div className="space-y-2 max-h-[200px] overflow-y-auto rounded-md border border-zinc-800 p-2 min-w-0">
                        {project.credits.map((c, ci) => (
                          <div key={`${project.id}-c-${ci}`} className="flex flex-col sm:flex-row gap-2 min-w-0">
                            <input
                              className={inputCls}
                              value={c.label}
                              onChange={(e) => {
                                const creds = [...project.credits];
                                creds[ci] = { ...c, label: e.target.value } as VideoProjectCredit;
                                updateItem(project.id, { credits: creds });
                              }}
                              disabled={!canEdit}
                              placeholder="Role"
                            />
                            <input
                              className={inputCls}
                              value={c.value}
                              onChange={(e) => {
                                const creds = [...project.credits];
                                creds[ci] = { ...c, value: e.target.value } as VideoProjectCredit;
                                updateItem(project.id, { credits: creds });
                              }}
                              disabled={!canEdit}
                              placeholder="Name"
                            />
                            <button
                              type="button"
                              disabled={!canEdit}
                              onClick={() => {
                                const creds = project.credits.filter((_, j) => j !== ci);
                                updateItem(project.id, { credits: creds });
                              }}
                              className="text-[11px] text-red-400 sm:self-center"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

export default PortfolioLandingSection;
