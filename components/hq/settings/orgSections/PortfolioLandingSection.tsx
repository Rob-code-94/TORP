import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronUp, ExternalLink, Loader2, Plus, Trash2, Upload } from 'lucide-react';
import { WORK_CATEGORY_FILTERS } from '../../../../constants';
import {
  deletePortfolioLandingProject,
  listPortfolioLandingProjects,
  replacePortfolioLandingOrder,
  savePortfolioLandingProject,
  seedPortfolioLandingFromConstants,
} from '../../../../data/portfolioLandingRepository';
import { useAdminTheme } from '../../../../lib/adminTheme';
import { appPanelClass } from '../../../../lib/appThemeClasses';
import { formatFirestoreListError } from '../../../../lib/formatFirestoreListError';
import { getMarketingTenantIdForUser } from '../../../../lib/marketingTenant';
import { useAuth } from '../../../../lib/auth';
import { uploadPortfolioLandingImage } from '../../../../lib/portfolioLandingStorage';
import type { GalleryAspect, ProjectCategory, VideoProject, VideoProjectCredit, VideoProjectGalleryItem } from '../../../../types';

interface PortfolioLandingSectionProps {
  canEdit: boolean;
}

const CATEGORY_OPTIONS = WORK_CATEGORY_FILTERS.filter((c): c is ProjectCategory => c !== 'All');

const ASPECT_GRID: VideoProject['aspectRatio'][] = ['video', 'portrait', 'square'];
const ASPECT_GALLERY: GalleryAspect[] = ['video', 'portrait', 'square', 'wide'];

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

const PortfolioLandingSection: React.FC<PortfolioLandingSectionProps> = ({ canEdit }) => {
  const { theme } = useAdminTheme();
  const { user } = useAuth();
  const isDark = theme === 'dark';
  const tenantId = getMarketingTenantIdForUser(user?.tenantId);
  const [items, setItems] = useState<VideoProject[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [uploadPct, setUploadPct] = useState(0);
  const [seeding, setSeeding] = useState(false);
  const thumbRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const heroRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const galleryRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const refresh = useCallback(async () => {
    setState('loading');
    setError(null);
    try {
      const rows = await listPortfolioLandingProjects(tenantId);
      setItems(rows);
      setState('ready');
    } catch (err) {
      setState('error');
      setError(formatFirestoreListError(err, 'portfolio'));
    }
  }, [tenantId]);

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
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed.');
    } finally {
      setSavingId(null);
    }
  };

  const handleAdd = () => {
    if (!canEdit) return;
    setItems((prev) => [...prev, emptyProject()]);
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
    try {
      await seedPortfolioLandingFromConstants(tenantId);
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
      field: 'thumbnail' | 'heroImage',
      index: number,
    ): React.ChangeEventHandler<HTMLInputElement> =>
    async (event) => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file || !canEdit) return;
      const key = `${project.id}-${field}`;
      setUploadingKey(key);
      setUploadPct(0);
      setError(null);
      try {
        const up = await uploadPortfolioLandingImage({
          assetId: `${project.id}-${field}`,
          file,
          onProgress: ({ percent }) => setUploadPct(percent),
        });
        const next = field === 'thumbnail' ? { thumbnail: up.downloadUrl } : { heroImage: up.downloadUrl };
        const merged = { ...project, ...next };
        const saved = await savePortfolioLandingProject(tenantId, merged, index + 1);
        setItems((prev) => prev.map((p) => (p.id === project.id ? saved : p)));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed.');
      } finally {
        setUploadingKey(null);
        setUploadPct(0);
      }
    };

  const runGalleryUpload = (project: VideoProject, galleryIndex: number, projectIndex: number): React.ChangeEventHandler<HTMLInputElement> =>
    async (event) => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file || !canEdit) return;
      const key = `${project.id}-g-${galleryIndex}`;
      setUploadingKey(key);
      setUploadPct(0);
      setError(null);
      try {
        const up = await uploadPortfolioLandingImage({
          assetId: `${project.id}-g${galleryIndex}`,
          file,
          onProgress: ({ percent }) => setUploadPct(percent),
        });
        const gal = [...project.gallery];
        const row = gal[galleryIndex] ?? { src: '', aspect: 'video' as const };
        gal[galleryIndex] = { ...row, src: up.downloadUrl };
        const merged = { ...project, gallery: gal };
        const saved = await savePortfolioLandingProject(tenantId, merged, projectIndex + 1);
        setItems((prev) => prev.map((p) => (p.id === project.id ? saved : p)));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed.');
      } finally {
        setUploadingKey(null);
        setUploadPct(0);
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
            Selected works and case study overlays on the public site. Images upload to <code className="text-[10px]">public/portfolio/</code>
            .
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
            onClick={() => void handleSeed()}
            className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-zinc-100 disabled:opacity-50"
          >
            {seeding ? <Loader2 size={12} className="inline animate-spin" /> : null} Import bundled defaults
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

      {error && <p className="mt-2 text-xs text-rose-400 break-words">{error}</p>}

      {state === 'loading' ? (
        <p className="mt-3 text-xs text-zinc-500">Loading portfolio…</p>
      ) : items.length === 0 ? (
        <p className="mt-3 text-xs text-zinc-500">No saved portfolio entries. Import bundled defaults or add a project.</p>
      ) : (
        <ul className="mt-4 space-y-3 min-w-0">
          {items.map((project, index) => {
            const slugDup = project.slug.trim() && (slugCounts.get(project.slug.trim().toLowerCase()) ?? 0) > 1;
            return (
              <li
                key={project.id}
                className={`rounded-lg border min-w-0 overflow-hidden ${
                  isDark ? 'border-zinc-800 bg-zinc-900/40' : 'border-zinc-200 bg-zinc-50/80'
                }`}
              >
                <div
                  className={`flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-3 py-2 border-b min-w-0 ${
                    isDark ? 'border-zinc-800 bg-zinc-900/60' : 'border-zinc-200 bg-white/80'
                  }`}
                >
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold truncate ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                      {project.title || '(untitled)'}
                    </p>
                    <p className="text-[11px] text-zinc-500 truncate">
                      {project.slug || 'no slug'} · order {index + 1}
                      {slugDup ? <span className="text-rose-400 ml-2">Duplicate slug</span> : null}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={!canEdit || index === 0 || savingId === '_reorder'}
                      onClick={() => void move(index, -1)}
                      className="rounded-md border border-zinc-700 px-2 py-1 text-[11px] text-zinc-200 disabled:opacity-40"
                      aria-label="Move up"
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      type="button"
                      disabled={!canEdit || index >= items.length - 1 || savingId === '_reorder'}
                      onClick={() => void move(index, 1)}
                      className="rounded-md border border-zinc-700 px-2 py-1 text-[11px] text-zinc-200 disabled:opacity-40"
                      aria-label="Move down"
                    >
                      <ChevronDown size={14} />
                    </button>
                    <button
                      type="button"
                      disabled={!canEdit || savingId === project.id}
                      onClick={() => void handleSave(project, index)}
                      className="rounded-md border border-zinc-700 px-2 py-1 text-[11px] text-zinc-200 disabled:opacity-50"
                    >
                      {savingId === project.id ? <Loader2 size={12} className="inline animate-spin" /> : null} Save
                    </button>
                    <button
                      type="button"
                      disabled={!canEdit || savingId === project.id}
                      onClick={() => void handleDelete(project)}
                      className="rounded-md border border-red-900/60 px-2 py-1 text-[11px] text-red-300 disabled:opacity-50"
                    >
                      <Trash2 size={12} className="inline" />
                    </button>
                  </div>
                </div>

                <details className="group px-3 py-3 min-w-0">
                  <summary className={`cursor-pointer text-[11px] font-mono uppercase tracking-wider list-none flex items-center gap-1 ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>
                    <ChevronDown size={14} className="group-open:rotate-180 transition-transform shrink-0" />
                    Fields & uploads
                  </summary>
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 min-w-0">
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
                        {ASPECT_GRID.map((a) => (
                          <option key={a} value={a}>
                            {a}
                          </option>
                        ))}
                      </select>
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
                      <div className="flex flex-wrap items-center gap-2 min-w-0">
                        <input
                          ref={(el) => {
                            thumbRefs.current[`${project.id}-thumb`] = el;
                          }}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={runUpload(project, 'thumbnail', index)}
                          disabled={!canEdit || uploadingKey?.startsWith(project.id)}
                        />
                        <button
                          type="button"
                          disabled={!canEdit}
                          onClick={() => thumbRefs.current[`${project.id}-thumb`]?.click()}
                          className="rounded-md border border-zinc-700 px-2 py-1 text-[11px] text-zinc-200"
                        >
                          <Upload size={12} className="inline mr-1" />
                          Upload
                          {uploadingKey === `${project.id}-thumbnail` ? ` ${uploadPct}%` : ''}
                        </button>
                        <input
                          className={`${inputCls} flex-1 min-w-[12rem]`}
                          value={project.thumbnail}
                          onChange={(e) => updateItem(project.id, { thumbnail: e.target.value })}
                          disabled={!canEdit}
                          placeholder="https://…"
                        />
                      </div>
                    </div>

                    <div className="md:col-span-2 min-w-0 space-y-2">
                      <p className={labelCls}>Hero image</p>
                      <div className="flex flex-wrap items-center gap-2 min-w-0">
                        <input
                          ref={(el) => {
                            heroRefs.current[`${project.id}-hero`] = el;
                          }}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={runUpload(project, 'heroImage', index)}
                          disabled={!canEdit || uploadingKey?.startsWith(project.id)}
                        />
                        <button
                          type="button"
                          disabled={!canEdit}
                          onClick={() => heroRefs.current[`${project.id}-hero`]?.click()}
                          className="rounded-md border border-zinc-700 px-2 py-1 text-[11px] text-zinc-200"
                        >
                          <Upload size={12} className="inline mr-1" />
                          Upload
                          {uploadingKey === `${project.id}-heroImage` ? ` ${uploadPct}%` : ''}
                        </button>
                        <input
                          className={`${inputCls} flex-1 min-w-[12rem]`}
                          value={project.heroImage}
                          onChange={(e) => updateItem(project.id, { heroImage: e.target.value })}
                          disabled={!canEdit}
                          placeholder="https://…"
                        />
                      </div>
                    </div>

                    <div className="md:col-span-2 min-w-0 space-y-2">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <p className={labelCls}>Gallery</p>
                        <button
                          type="button"
                          disabled={!canEdit}
                          onClick={() =>
                            updateItem(project.id, {
                              gallery: [...project.gallery, { src: '', aspect: 'video', caption: '' }],
                            })
                          }
                          className="text-[11px] text-zinc-400 hover:text-white"
                        >
                          + Row
                        </button>
                      </div>
                      <div className="space-y-2 max-h-[240px] overflow-y-auto rounded-md border border-zinc-800 p-2 min-w-0">
                        {project.gallery.length === 0 ? (
                          <p className="text-[11px] text-zinc-600">No stills — add rows or paste URLs.</p>
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
                                accept="image/*"
                                className="hidden"
                                onChange={runGalleryUpload(project, gi, index)}
                              />
                              <button
                                type="button"
                                disabled={!canEdit}
                                onClick={() => galleryRefs.current[`${project.id}-${gi}`]?.click()}
                                className="shrink-0 rounded border border-zinc-700 px-2 py-1 text-[10px] text-zinc-300 self-start"
                              >
                                Up
                                {uploadingKey === `${project.id}-g-${gi}` ? ` ${uploadPct}%` : ''}
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
                                placeholder="Image URL"
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
                </details>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

export default PortfolioLandingSection;
