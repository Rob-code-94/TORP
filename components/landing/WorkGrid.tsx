import React, { useMemo, useRef, useState } from 'react';
import { WORK_CATEGORY_FILTERS } from '../../constants';
import { ArrowUpRight, ImagePlus, Loader2, Pencil, Play } from 'lucide-react';
import type { ProjectCategory, VideoProject } from '../../types';

type WorkGridProps = {
  projects: VideoProject[];
  onSelect: (slug: string) => void;
  canEditMarketing?: boolean;
  marketingEditMode?: boolean;
  onToggleMarketingEditMode?: () => void;
  onReplaceThumbnail?: (project: VideoProject, file: File) => Promise<void>;
  thumbnailUploadingId?: string | null;
  gridEditError?: string | null;
};

const WorkGrid: React.FC<WorkGridProps> = ({
  projects,
  onSelect,
  canEditMarketing = false,
  marketingEditMode = false,
  onToggleMarketingEditMode,
  onReplaceThumbnail,
  thumbnailUploadingId = null,
  gridEditError = null,
}) => {
  const [filter, setFilter] = useState<'All' | ProjectCategory>('All');
  const [brokenThumbs, setBrokenThumbs] = useState<Record<string, boolean>>({});

  const filtered = useMemo(() => {
    if (filter === 'All') return projects;
    return projects.filter((p) => p.category === filter);
  }, [filter, projects]);

  const count = projects.length;
  const thumbInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const openThumbPicker = (projectId: string) => {
    thumbInputRefs.current[projectId]?.click();
  };

  const onThumbChange =
    (project: VideoProject): React.ChangeEventHandler<HTMLInputElement> =>
    async (e) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file || !onReplaceThumbnail || !marketingEditMode) return;
      await onReplaceThumbnail(project, file);
    };

  return (
    <section id="landing-selected-works" className="min-w-0 scroll-mt-20 px-4 py-24 bg-zinc-950 min-h-screen">
      {gridEditError ? (
        <div className="max-w-7xl mx-auto mb-4 rounded-lg border border-rose-900/60 bg-rose-950/30 px-3 py-2 min-w-0">
          <p className="text-xs text-rose-300 break-words">{gridEditError}</p>
        </div>
      ) : null}

      <div className="max-w-7xl mx-auto mb-16 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-zinc-900 pb-8 min-w-0">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-4xl md:text-6xl font-bold text-white tracking-tight mb-0 md:mb-2">Selected Works</h2>
              {canEditMarketing ? (
                <button
                  type="button"
                  onClick={() => onToggleMarketingEditMode?.()}
                  aria-pressed={marketingEditMode}
                  className={`shrink-0 inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-mono uppercase tracking-wider transition-colors min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 ${
                    marketingEditMode
                      ? 'border-white bg-white text-black'
                      : 'border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-white'
                  }`}
                  title={marketingEditMode ? 'Leave edit mode' : 'Edit marketing portfolio'}
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden />
                  <span className="hidden sm:inline">{marketingEditMode ? 'Editing' : 'Edit'}</span>
                </button>
              ) : null}
            </div>
            <p className="text-zinc-500">Curated cinematic experiences 2023 — 2024</p>
          </div>
        </div>
        <div className="hidden md:block shrink-0">
          <span className="text-zinc-600 font-mono text-sm">{count} PROJECTS AVAILABLE</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto mb-10 flex flex-wrap gap-2">
        {WORK_CATEGORY_FILTERS.map((cat) => {
          const active = filter === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setFilter(cat)}
              className={`rounded-full border px-4 py-2 text-xs font-mono uppercase tracking-wider transition-colors duration-300 ${
                active
                  ? 'border-white bg-white text-black'
                  : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      <div className="columns-1 md:columns-2 lg:columns-3 gap-8 space-y-8">
        {filtered.map((project) => (
          <div
            key={project.id}
            role="link"
            tabIndex={0}
            aria-label={`Open case study: ${project.title}`}
            onClick={() => {
              if (marketingEditMode) return;
              onSelect(project.slug);
            }}
            onKeyDown={(e) => {
              if (marketingEditMode) return;
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect(project.slug);
              }
            }}
            className={`group break-inside-avoid relative block bg-zinc-900 overflow-hidden ${
              marketingEditMode ? 'cursor-default' : 'cursor-pointer'
            }`}
          >
            <div
              className={`relative w-full ${
                project.aspectRatio === 'portrait'
                  ? 'aspect-[9/16]'
                  : project.aspectRatio === 'square'
                    ? 'aspect-square'
                    : 'aspect-video'
              }`}
            >
              {canEditMarketing && marketingEditMode && onReplaceThumbnail ? (
                <>
                  <input
                    ref={(el) => {
                      thumbInputRefs.current[project.id] = el;
                    }}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    aria-hidden
                    onChange={onThumbChange(project)}
                  />
                  <button
                    type="button"
                    disabled={thumbnailUploadingId === project.id}
                    onClick={(evt) => {
                      evt.preventDefault();
                      evt.stopPropagation();
                      openThumbPicker(project.id);
                    }}
                    className="absolute left-2 top-2 z-10 flex min-h-[40px] shrink-0 items-center gap-1 rounded-md border border-white/20 bg-black/70 px-2.5 py-1.5 text-[11px] font-mono uppercase tracking-wide text-white backdrop-blur-sm hover:bg-black/85 disabled:opacity-50"
                  >
                    {thumbnailUploadingId === project.id ? (
                      <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
                    ) : (
                      <ImagePlus className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    )}
                    <span className="truncate">{thumbnailUploadingId === project.id ? 'Uploading…' : 'Replace'}</span>
                  </button>
                </>
              ) : null}
              {brokenThumbs[project.id] ? (
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
                  <span className="pointer-events-none px-4 text-center text-lg font-bold text-white">{project.title}</span>
                </div>
              ) : (
                <img
                  src={project.thumbnail}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  onError={() => setBrokenThumbs((prev) => ({ ...prev, [project.id]: true }))}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-80 group-hover:opacity-100"
                />
              )}

              <div
                className={`absolute inset-0 flex items-center justify-center gap-4 transition-opacity duration-300 bg-black/20 backdrop-blur-[2px] ${
                  marketingEditMode ? 'opacity-0 pointer-events-none' : 'opacity-0 group-hover:opacity-100'
                }`}
              >
                <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                  <Play className="w-6 h-6 text-black fill-current ml-1" />
                </div>
                <span className="font-mono text-xs uppercase tracking-widest text-white drop-shadow-md">View case →</span>
              </div>
            </div>

            <div className="pt-4 pb-2 flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold text-white group-hover:text-zinc-300 transition-colors">{project.title}</h3>
                <p className="text-zinc-500 text-sm mt-1">
                  {project.client} &mdash; {project.tags.join(', ')}
                </p>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-xs font-mono text-zinc-600 border border-zinc-800 px-2 py-0.5 rounded-full">{project.year}</span>
                <ArrowUpRight className="w-4 h-4 text-zinc-600 mt-2 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default WorkGrid;
