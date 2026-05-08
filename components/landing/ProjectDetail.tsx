import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GalleryAspect, VideoProject } from '../../types';
import { WORK_CATEGORY_FILTERS } from '../../constants';
import { savePortfolioLandingProject } from '../../data/portfolioLandingRepository';
import { ArrowLeft, ArrowRight, ArrowUpRight, ImagePlus, Loader2, Pencil, Trash2 } from 'lucide-react';
import { formatFirestoreListError } from '../../lib/formatFirestoreListError';
import { isFirebaseConfigured } from '../../lib/firebase';
import { uploadPortfolioLandingImage } from '../../lib/portfolioLandingStorage';

type ProjectDetailProps = {
  project: VideoProject;
  nextProject: VideoProject | null;
  onBack: () => void;
  onNext: (slug: string) => void;
  canEditMarketing?: boolean;
  marketingEditMode?: boolean;
  onToggleMarketingEditMode?: () => void;
  marketingTenantId?: string;
  portfolioPersistable?: boolean;
  portfolioProjectIndex?: number;
  onProjectSaved?: (project: VideoProject) => void;
};

function cloneProject(p: VideoProject): VideoProject {
  return {
    ...p,
    tags: [...p.tags],
    deliverables: [...p.deliverables],
    gallery: p.gallery.map((g) => ({ ...g })),
    credits: p.credits.map((c) => ({ ...c })),
  };
}

function aspectClass(aspect: VideoProject['gallery'][0]['aspect']): string {
  switch (aspect) {
    case 'wide':
      return 'aspect-[21/9]';
    case 'video':
      return 'aspect-video';
    case 'portrait':
      return 'aspect-[9/16]';
    case 'square':
      return 'aspect-square';
    default:
      return 'aspect-video';
  }
}

function parseDeliverables(raw: string): string[] {
  return raw.split(/[,·|]/).map((s) => s.trim()).filter(Boolean);
}

const GALLERY_ASPECTS: GalleryAspect[] = ['wide', 'video', 'portrait', 'square'];
const CARD_ASPECTS = ['video', 'portrait', 'square'] as const;

function stableJson(p: VideoProject): string {
  return JSON.stringify({
    ...p,
    location: p.location ?? '',
    gallery: p.gallery.filter((g) => g.src.trim()),
    credits: p.credits.filter((c) => c.label.trim() && c.value.trim()),
  });
}

const ProjectDetail: React.FC<ProjectDetailProps> = ({
  project,
  nextProject,
  onBack,
  onNext,
  canEditMarketing = false,
  marketingEditMode = false,
  onToggleMarketingEditMode,
  marketingTenantId = '',
  portfolioPersistable = false,
  portfolioProjectIndex = -1,
  onProjectSaved,
}) => {
  const editing = Boolean(canEditMarketing && marketingEditMode);
  const heroInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const galleryTargetIndexRef = useRef<number | null>(null);

  const [heroBroken, setHeroBroken] = useState(false);
  const [brokenGallery, setBrokenGallery] = useState<Record<number, boolean>>({});

  const [draft, setDraft] = useState(() => cloneProject(project));
  const [detailError, setDetailError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [heroUploading, setHeroUploading] = useState(false);
  const [galleryUploadIdx, setGalleryUploadIdx] = useState<number | null>(null);

  const [deliverablesText, setDeliverablesText] = useState(project.deliverables.join(' · '));
  const [tagsText, setTagsText] = useState(project.tags.join(', '));

  useEffect(() => {
    setDraft(cloneProject(project));
    setDeliverablesText(project.deliverables.join(' · '));
    setTagsText(project.tags.join(', '));
    setDetailError(null);
    setBrokenGallery({});
    setHeroBroken(false);
  }, [project]);

  const baseline = useMemo(() => stableJson(cloneProject(project)), [project]);
  const dirty = useMemo(() => {
    const current: VideoProject = {
      ...draft,
      deliverables: parseDeliverables(deliverablesText),
      tags: tagsText.split(',').map((t) => t.trim()).filter(Boolean),
    };
    return stableJson(current) !== baseline;
  }, [baseline, draft, deliverablesText, tagsText]);

  const mergedDraftForCompare = useCallback((): VideoProject => {
    return {
      ...draft,
      deliverables: parseDeliverables(deliverablesText),
      tags: tagsText.split(',').map((t) => t.trim()).filter(Boolean),
      gallery: draft.gallery.filter((g) => g.src.trim()),
      credits: draft.credits.filter((c) => c.label.trim() && c.value.trim()),
      ...(draft.location?.trim() ? { location: draft.location.trim() } : { location: undefined }),
    };
  }, [draft, deliverablesText, tagsText]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onBack();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onBack]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [project.slug]);

  const canSaveWrites =
    editing &&
    portfolioPersistable &&
    portfolioProjectIndex >= 0 &&
    Boolean(project.id) &&
    !project.id.startsWith('draft-');

  const onSave = async () => {
    setDetailError(null);
    if (!marketingTenantId) {
      setDetailError('Tenant is not ready. Sign in again and retry.');
      return;
    }
    if (!canSaveWrites) {
      setDetailError(
        'Cannot save yet: portfolio must load from Firestore first (HQ → Org → Landing portfolio), and this row must exist in that list.',
      );
      return;
    }
    if (!isFirebaseConfigured()) {
      setDetailError(formatFirestoreListError(new Error('Firebase is not configured.'), 'portfolio'));
      return;
    }
    let payload = mergedDraftForCompare();
    payload = {
      ...payload,
      slug: project.slug,
      id: project.id,
    };

    setSaving(true);
    try {
      const saved = await savePortfolioLandingProject(marketingTenantId, payload, portfolioProjectIndex + 1);
      onProjectSaved?.(saved);
      setDraft(cloneProject(saved));
      setDeliverablesText(saved.deliverables.join(' · '));
      setTagsText(saved.tags.join(', '));
    } catch (e) {
      setDetailError(formatFirestoreListError(e, 'portfolio'));
    } finally {
      setSaving(false);
    }
  };

  const resetDraft = () => {
    setDraft(cloneProject(project));
    setDeliverablesText(project.deliverables.join(' · '));
    setTagsText(project.tags.join(', '));
    setDetailError(null);
  };

  const onHeroReplace: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !editing) return;
    setHeroBroken(false);
    setHeroUploading(true);
    setDetailError(null);
    try {
      const r = await uploadPortfolioLandingImage({
        assetId: `${project.id}-hero-${Date.now()}`,
        file,
      });
      setDraft((d) => ({ ...d, heroImage: r.downloadUrl }));
    } catch (err) {
      setDetailError(formatFirestoreListError(err, 'portfolio'));
    } finally {
      setHeroUploading(false);
    }
  };

  const onGalleryFile: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    const idx = galleryTargetIndexRef.current;
    if (!file || idx == null || !editing) return;
    setGalleryUploadIdx(idx);
    setDetailError(null);
    try {
      const r = await uploadPortfolioLandingImage({
        assetId: `${project.id}-gallery-${idx}-${Date.now()}`,
        file,
      });
      setDraft((d) => {
        const next = [...d.gallery];
        if (!next[idx]) return d;
        next[idx] = { ...next[idx]!, src: r.downloadUrl };
        return { ...d, gallery: next };
      });
      setBrokenGallery((prev) => ({ ...prev, [idx]: false }));
    } catch (err) {
      setDetailError(formatFirestoreListError(err, 'portfolio'));
    } finally {
      setGalleryUploadIdx(null);
      galleryTargetIndexRef.current = null;
    }
  };

  const openGalleryPicker = (index: number) => {
    galleryTargetIndexRef.current = index;
    galleryInputRef.current?.click();
  };

  const addGalleryRow = () => {
    setDraft((d) => ({
      ...d,
      gallery: [...d.gallery, { src: '', aspect: 'video', caption: '' }],
    }));
  };

  const removeGalleryRow = (index: number) => {
    setDraft((d) => ({
      ...d,
      gallery: d.gallery.filter((_, i) => i !== index),
    }));
    setBrokenGallery((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  };

  const addCreditRow = () => {
    setDraft((d) => ({
      ...d,
      credits: [...d.credits, { label: '', value: '' }],
    }));
  };

  const categories = WORK_CATEGORY_FILTERS.filter((c): c is VideoProject['category'] => c !== 'All');

  return (
    <div className="min-w-0 fixed inset-0 z-[60] overflow-y-auto overflow-x-hidden bg-zinc-950 text-zinc-100">
      <input ref={heroInputRef} type="file" accept="image/*" className="hidden" aria-hidden onChange={onHeroReplace} />
      <input ref={galleryInputRef} type="file" accept="image/*" className="hidden" aria-hidden onChange={onGalleryFile} />

      <div className="sticky top-0 z-20 border-b border-zinc-900 bg-zinc-950/95 backdrop-blur-md">
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 px-4 py-4 md:px-8">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex min-h-[44px] items-center gap-2 font-mono text-xs uppercase tracking-widest text-zinc-400 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            Back
          </button>
          <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2">
            {canEditMarketing ? (
              <button
                type="button"
                onClick={() => onToggleMarketingEditMode?.()}
                aria-pressed={marketingEditMode}
                className={`inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-2 font-mono text-[10px] uppercase tracking-wider transition-colors ${
                  marketingEditMode
                    ? 'border-white bg-white text-black'
                    : 'border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-white'
                }`}
                title={marketingEditMode ? 'Leave edit mode' : 'Edit case study on the live layout'}
              >
                <Pencil className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="hidden sm:inline">{marketingEditMode ? 'Editing' : 'Edit'}</span>
              </button>
            ) : null}
            <span className="max-w-[min(40vw,12rem)] truncate font-mono text-[10px] uppercase tracking-widest text-zinc-500 sm:max-w-[40vw]">
              {project.client}
            </span>
            {editing ? (
              <>
                <button
                  type="button"
                  onClick={resetDraft}
                  disabled={!dirty || saving}
                  className="min-h-[44px] rounded-md border border-zinc-700 px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-zinc-300 hover:border-zinc-500 disabled:opacity-40"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => void onSave()}
                  disabled={!dirty || saving || !canSaveWrites}
                  className="min-h-[44px] rounded-md border border-white bg-white px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-black hover:bg-zinc-200 disabled:opacity-40"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </>
            ) : null}
          </div>
        </div>
        {detailError ? (
          <div className="border-t border-rose-900/50 bg-rose-950/25 px-4 py-2 md:px-8">
            <p className="text-xs text-rose-300 break-words">{detailError}</p>
          </div>
        ) : null}
      </div>

      <div className="relative w-full overflow-hidden md:aspect-[21/9] aspect-video">
        {editing ? (
          <button
            type="button"
            disabled={heroUploading}
            onClick={() => heroInputRef.current?.click()}
            className="absolute right-3 top-3 z-10 flex min-h-[40px] items-center gap-1 rounded-md border border-white/20 bg-black/70 px-2.5 py-1.5 text-[11px] font-mono uppercase tracking-wide text-white backdrop-blur-sm hover:bg-black/85 disabled:opacity-50"
          >
            {heroUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
            {heroUploading ? 'Uploading…' : 'Replace hero'}
          </button>
        ) : null}
        {heroBroken ? (
          <div className="flex h-full min-h-[40vh] w-full items-center justify-center bg-zinc-900 md:min-h-0">
            <h1 className="max-w-4xl px-4 text-center text-4xl font-bold text-white md:text-6xl">{editing ? draft.title : project.title}</h1>
          </div>
        ) : (
          <>
            <img
              src={editing ? draft.heroImage : project.heroImage}
              alt=""
              className="h-full w-full object-cover"
              loading="eager"
              decoding="async"
              onError={() => setHeroBroken(true)}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 px-4 pb-10 pt-24 md:px-12">
              {editing ? (
                <input
                  value={draft.title}
                  onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                  className="w-full min-w-0 bg-transparent text-4xl font-bold tracking-tight text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-white/30 md:text-6xl lg:text-7xl"
                  placeholder="Title"
                  aria-label="Project title"
                />
              ) : (
                <h1 className="text-4xl font-bold tracking-tight text-white md:text-6xl lg:text-7xl">{project.title}</h1>
              )}
            </div>
          </>
        )}
      </div>

      <div className="mx-auto max-w-5xl min-w-0 px-4 py-16 md:px-8">
        {editing ? (
          <p className="mb-6 font-mono text-[10px] uppercase tracking-widest text-zinc-500 break-all">
            Slug (read-only): <span className="text-zinc-300">{project.slug}</span>
          </p>
        ) : null}

        <div className="grid gap-6 border-b border-zinc-900 pb-12 font-mono text-xs uppercase tracking-wider text-zinc-500 md:grid-cols-2 lg:grid-cols-3">
          {editing ? (
            <>
              <label className="block min-w-0">
                <span className="text-zinc-600">Client</span>
                <input
                  value={draft.client}
                  onChange={(e) => setDraft((d) => ({ ...d, client: e.target.value }))}
                  className="mt-1 w-full min-w-0 rounded border border-zinc-800 bg-zinc-900 px-2 py-2 text-sm normal-case tracking-normal text-zinc-200"
                />
              </label>
              <label className="block min-w-0">
                <span className="text-zinc-600">Role</span>
                <input
                  value={draft.role}
                  onChange={(e) => setDraft((d) => ({ ...d, role: e.target.value }))}
                  className="mt-1 w-full min-w-0 rounded border border-zinc-800 bg-zinc-900 px-2 py-2 text-sm normal-case tracking-normal text-zinc-200"
                />
              </label>
              <label className="block min-w-0">
                <span className="text-zinc-600">Year</span>
                <input
                  value={draft.year}
                  onChange={(e) => setDraft((d) => ({ ...d, year: e.target.value }))}
                  className="mt-1 w-full min-w-0 rounded border border-zinc-800 bg-zinc-900 px-2 py-2 text-sm normal-case tracking-normal text-zinc-200"
                />
              </label>
              <label className="block min-w-0">
                <span className="text-zinc-600">Location</span>
                <input
                  value={draft.location ?? ''}
                  onChange={(e) => setDraft((d) => ({ ...d, location: e.target.value || undefined }))}
                  className="mt-1 w-full min-w-0 rounded border border-zinc-800 bg-zinc-900 px-2 py-2 text-sm normal-case tracking-normal text-zinc-200"
                />
              </label>
              <label className="block min-w-0 md:col-span-2 lg:col-span-2">
                <span className="text-zinc-600">Deliverables (comma or · separated)</span>
                <input
                  value={deliverablesText}
                  onChange={(e) => setDeliverablesText(e.target.value)}
                  className="mt-1 w-full min-w-0 rounded border border-zinc-800 bg-zinc-900 px-2 py-2 text-sm normal-case tracking-normal text-zinc-200"
                />
              </label>
              <label className="block min-w-0">
                <span className="text-zinc-600">Category</span>
                <select
                  value={draft.category}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, category: e.target.value as VideoProject['category'] }))
                  }
                  className="mt-1 w-full min-w-0 rounded border border-zinc-800 bg-zinc-900 px-2 py-2 text-sm normal-case tracking-normal text-zinc-200"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block min-w-0">
                <span className="text-zinc-600">Card aspect</span>
                <select
                  value={draft.aspectRatio}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      aspectRatio: e.target.value as VideoProject['aspectRatio'],
                    }))
                  }
                  className="mt-1 w-full min-w-0 rounded border border-zinc-800 bg-zinc-900 px-2 py-2 text-sm normal-case tracking-normal text-zinc-200"
                >
                  {CARD_ASPECTS.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block min-w-0 md:col-span-2">
                <span className="text-zinc-600">Tags (comma separated)</span>
                <input
                  value={tagsText}
                  onChange={(e) => setTagsText(e.target.value)}
                  className="mt-1 w-full min-w-0 rounded border border-zinc-800 bg-zinc-900 px-2 py-2 text-sm normal-case tracking-normal text-zinc-200"
                />
              </label>
            </>
          ) : (
            <>
              <div>
                <p className="text-zinc-600">Client</p>
                <p className="mt-1 text-zinc-300">{project.client}</p>
              </div>
              <div>
                <p className="text-zinc-600">Role</p>
                <p className="mt-1 text-zinc-300">{project.role}</p>
              </div>
              <div>
                <p className="text-zinc-600">Year</p>
                <p className="mt-1 text-zinc-300">{project.year}</p>
              </div>
              {project.location && (
                <div>
                  <p className="text-zinc-600">Location</p>
                  <p className="mt-1 text-zinc-300">{project.location}</p>
                </div>
              )}
              <div className="md:col-span-2 lg:col-span-2">
                <p className="text-zinc-600">Deliverables</p>
                <p className="mt-1 text-zinc-300">{project.deliverables.join(' · ')}</p>
              </div>
            </>
          )}
        </div>

        {editing ? (
          <label className="mx-auto mt-12 block max-w-3xl">
            <span className="sr-only">Logline</span>
            <textarea
              value={draft.logline}
              onChange={(e) => setDraft((d) => ({ ...d, logline: e.target.value }))}
              rows={5}
              className="w-full min-w-0 rounded-lg border border-zinc-800 bg-zinc-900 p-4 text-base leading-relaxed text-zinc-200"
            />
          </label>
        ) : (
          <p className="mx-auto mt-12 max-w-3xl text-lg leading-relaxed text-zinc-400">{project.logline}</p>
        )}

        <div className="mt-20 min-w-0">
          <div className="mb-8 flex min-w-0 flex-wrap items-center justify-between gap-2 border-b border-zinc-900 pb-4">
            <h2 className="text-2xl font-bold text-white md:text-3xl">Stills</h2>
            {editing ? (
              <button
                type="button"
                onClick={addGalleryRow}
                className="min-h-[40px] rounded-md border border-zinc-700 px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-zinc-300 hover:border-zinc-500"
              >
                Add still
              </button>
            ) : null}
          </div>
          <div className="columns-1 gap-6 space-y-6 md:columns-2">
            {(editing ? draft : project).gallery.map((item, i) => {
              if (!editing && !item.src.trim()) return null;
              return (
                <div key={`${project.slug}-g-${i}`} className="break-inside-avoid">
                  <div className={`relative w-full overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 ${aspectClass(item.aspect)}`}>
                    {editing ? (
                      <div className="absolute left-2 top-2 z-10 flex flex-wrap gap-1">
                        <button
                          type="button"
                          disabled={galleryUploadIdx === i}
                          onClick={() => openGalleryPicker(i)}
                          className="flex min-h-[36px] items-center gap-1 rounded-md border border-white/20 bg-black/70 px-2 py-1 text-[10px] font-mono uppercase tracking-wide text-white disabled:opacity-50"
                        >
                          {galleryUploadIdx === i ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <ImagePlus className="h-3 w-3" />
                          )}
                          Replace
                        </button>
                        <button
                          type="button"
                          onClick={() => removeGalleryRow(i)}
                          className="inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-md border border-rose-900/60 bg-black/70 text-rose-300"
                          aria-label="Remove still"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : null}
                    {brokenGallery[i] || !item.src.trim() ? (
                      <div className="flex h-full w-full items-center justify-center bg-zinc-900">
                        <span className="px-3 text-center font-mono text-xs text-zinc-600">
                          {item.src.trim() ? 'Image unavailable' : 'No image — use Replace'}
                        </span>
                      </div>
                    ) : (
                      <img
                        src={item.src}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover"
                        onError={() => setBrokenGallery((prev) => ({ ...prev, [i]: true }))}
                      />
                    )}
                  </div>
                  {editing ? (
                    <div className="mt-2 space-y-2">
                      <input
                        value={item.caption ?? ''}
                        onChange={(e) =>
                          setDraft((d) => {
                            const g = [...d.gallery];
                            g[i] = { ...g[i]!, caption: e.target.value };
                            return { ...d, gallery: g };
                          })
                        }
                        placeholder="Caption"
                        className="w-full min-w-0 rounded border border-zinc-800 bg-zinc-950 px-2 py-1 font-mono text-xs text-zinc-300"
                      />
                      <select
                        value={item.aspect}
                        onChange={(e) =>
                          setDraft((d) => {
                            const g = [...d.gallery];
                            g[i] = { ...g[i]!, aspect: e.target.value as GalleryAspect };
                            return { ...d, gallery: g };
                          })
                        }
                        className="w-full min-w-0 rounded border border-zinc-800 bg-zinc-950 px-2 py-1 font-mono text-xs text-zinc-300"
                      >
                        {GALLERY_ASPECTS.map((a) => (
                          <option key={a} value={a}>
                            {a}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : item.caption ? (
                    <p className="mt-2 font-mono text-xs text-zinc-600">{item.caption}</p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-24 min-w-0 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-8 md:p-12">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-2xl font-bold text-white md:text-3xl">Credits</h2>
            {editing ? (
              <button
                type="button"
                onClick={addCreditRow}
                className="min-h-[40px] rounded-md border border-zinc-700 px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-zinc-300 hover:border-zinc-500"
              >
                Add credit
              </button>
            ) : null}
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {(editing ? draft : project).credits.map((c, i) =>
              editing ? (
                <div key={`credit-edit-${i}`} className="border-t border-zinc-800 pt-4">
                  <input
                    value={c.label}
                    onChange={(e) =>
                      setDraft((d) => {
                        const next = [...d.credits];
                        next[i] = { ...next[i]!, label: e.target.value };
                        return { ...d, credits: next };
                      })
                    }
                    placeholder="Label"
                    className="mb-2 w-full min-w-0 rounded border border-zinc-800 bg-zinc-950 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-zinc-400"
                  />
                  <textarea
                    value={c.value}
                    onChange={(e) =>
                      setDraft((d) => {
                        const next = [...d.credits];
                        next[i] = { ...next[i]!, value: e.target.value };
                        return { ...d, credits: next };
                      })
                    }
                    placeholder="Value"
                    rows={2}
                    className="w-full min-w-0 rounded border border-zinc-800 bg-zinc-950 px-2 py-1 text-sm text-zinc-300"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setDraft((d) => ({
                        ...d,
                        credits: d.credits.filter((_, idx) => idx !== i),
                      }))
                    }
                    className="mt-2 text-[10px] font-mono uppercase tracking-wider text-rose-400 hover:text-rose-300"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div key={`${i}-${c.label}`} className="border-t border-zinc-800 pt-4">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">{c.label}</p>
                  <p className="mt-2 text-sm text-zinc-300">{c.value}</p>
                </div>
              ),
            )}
          </div>
        </div>

        {nextProject && (
          <button
            type="button"
            onClick={() => onNext(nextProject.slug)}
            className="group mt-16 flex w-full min-w-0 flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40 text-left transition-colors hover:border-zinc-600 md:flex-row"
          >
            <div className="relative aspect-video w-full min-w-0 md:w-1/2">
              <img src={nextProject.thumbnail} alt="" className="h-full w-full object-cover opacity-90 transition-opacity group-hover:opacity-100" loading="lazy" />
              <div className="absolute inset-0 bg-black/30" />
            </div>
            <div className="flex min-w-0 flex-1 flex-col justify-center px-8 py-10">
              <span className="font-mono text-xs uppercase tracking-widest text-zinc-500">Next project</span>
              <span className="mt-2 text-3xl font-bold text-white md:text-4xl">{nextProject.title}</span>
              <span className="mt-2 text-sm text-zinc-500">
                {nextProject.client} — {nextProject.year}
              </span>
              <span className="mt-6 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-zinc-400 group-hover:text-white">
                Continue
                <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </button>
        )}

        <div className="mt-16 flex justify-center pb-24">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900 px-8 py-4 font-mono text-xs uppercase tracking-widest text-zinc-300 transition-colors hover:border-zinc-600 hover:text-white"
          >
            <ArrowUpRight className="h-4 w-4" />
            All work
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProjectDetail;
