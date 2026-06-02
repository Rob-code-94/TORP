import React, { useMemo, useRef, useState } from 'react';
import { WORK_CATEGORY_FILTERS } from '../../constants';
import { ArrowUpRight, Film, ImagePlus, Loader2, Pencil, Play } from 'lucide-react';
import { cardAspectClass } from '../../lib/portfolioMedia';
import type { ProjectCategory, VideoProject } from '../../types';
import PortfolioMedia from './PortfolioMedia';

type WorkGridProps = {
  projects: VideoProject[];
  onSelect: (slug: string) => void;
  canEditMarketing?: boolean;
  marketingEditMode?: boolean;
  onToggleMarketingEditMode?: () => void;
  onReplaceThumbnail?: (project: VideoProject, file: File) => Promise<void>;
  onReplacePreviewVideo?: (project: VideoProject, file: File) => Promise<void>;
  thumbnailUploadingId?: string | null;
  previewVideoUploadingId?: string | null;
  gridEditError?: string | null;
  gridEditWarning?: string | null;
};

const WorkGrid: React.FC<WorkGridProps> = ({
  projects,
  onSelect,
  canEditMarketing = false,
  marketingEditMode = false,
  onToggleMarketingEditMode,
  onReplaceThumbnail,
  onReplacePreviewVideo,
  thumbnailUploadingId = null,
  previewVideoUploadingId = null,
  gridEditError = null,
  gridEditWarning = null,
}) => {
  const [filter, setFilter] = useState<'All' | ProjectCategory>('All');
  const [brokenThumbs, setBrokenThumbs] = useState<Record<string, boolean>>({});
  const [hoverPreviewId, setHoverPreviewId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (filter === 'All') return projects;
    return projects.filter((p) => p.category === filter);
  }, [filter, projects]);

  const count = projects.length;
  const posterInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const videoInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const openPosterPicker = (projectId: string) => {
    posterInputRefs.current[projectId]?.click();
  };

  const openVideoPicker = (projectId: string) => {
    videoInputRefs.current[projectId]?.click();
  };

  const onPosterChange =
    (project: VideoProject): React.ChangeEventHandler<HTMLInputElement> =>
    async (e) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file || !onReplaceThumbnail || !marketingEditMode) return;
      await onReplaceThumbnail(project, file);
    };

  const onVideoChange =
    (project: VideoProject): React.ChangeEventHandler<HTMLInputElement> =>
    async (e) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file || !onReplacePreviewVideo || !marketingEditMode) return;
      await onReplacePreviewVideo(project, file);
    };

  return (
    <section id="landing-selected-works" className="min-w-0 scroll-mt-20 px-4 py-24 bg-zinc-950 min-h-screen">
      {gridEditWarning ? (
        <div className="max-w-7xl mx-auto mb-4 rounded-lg border border-amber-900/60 bg-amber-950/30 px-3 py-2 min-w-0">
          <p className="text-xs text-amber-200/90 break-words">{gridEditWarning}</p>
        </div>
      ) : null}
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
        {filtered.map((project) => {
          const isHovering = hoverPreviewId === project.id;
          return (
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
              onMouseEnter={() => {
                if (!marketingEditMode && project.featuredVideoUrl) {
                  setHoverPreviewId(project.id);
                }
              }}
              onMouseLeave={() => {
                if (hoverPreviewId === project.id) setHoverPreviewId(null);
              }}
              className={`group break-inside-avoid relative block bg-zinc-900 overflow-hidden ${
                marketingEditMode ? 'cursor-default' : 'cursor-pointer'
              }`}
            >
              <div className={`relative w-full ${cardAspectClass(project.aspectRatio)}`}>
                {canEditMarketing && marketingEditMode && (onReplaceThumbnail || onReplacePreviewVideo) ? (
                  <>
                    {onReplaceThumbnail ? (
                      <input
                        ref={(el) => {
                          posterInputRefs.current[project.id] = el;
                        }}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        aria-hidden
                        onChange={onPosterChange(project)}
                      />
                    ) : null}
                    {onReplacePreviewVideo ? (
                      <input
                        ref={(el) => {
                          videoInputRefs.current[project.id] = el;
                        }}
                        type="file"
                        accept="video/*"
                        className="hidden"
                        aria-hidden
                        onChange={onVideoChange(project)}
                      />
                    ) : null}
                    <div className="absolute left-2 top-2 z-10 flex flex-col gap-1">
                      {onReplaceThumbnail ? (
                        <button
                          type="button"
                          disabled={thumbnailUploadingId === project.id}
                          onClick={(evt) => {
                            evt.preventDefault();
                            evt.stopPropagation();
                            openPosterPicker(project.id);
                          }}
                          className="flex min-h-[36px] shrink-0 items-center gap-1 rounded-md border border-white/20 bg-black/70 px-2 py-1 text-[10px] font-mono uppercase tracking-wide text-white backdrop-blur-sm hover:bg-black/85 disabled:opacity-50"
                        >
                          {thumbnailUploadingId === project.id ? (
                            <Loader2 className="h-3 w-3 shrink-0 animate-spin" aria-hidden />
                          ) : (
                            <ImagePlus className="h-3 w-3 shrink-0" aria-hidden />
                          )}
                          <span className="truncate">
                            {thumbnailUploadingId === project.id ? 'Poster…' : 'Poster'}
                          </span>
                        </button>
                      ) : null}
                      {onReplacePreviewVideo ? (
                        <button
                          type="button"
                          disabled={previewVideoUploadingId === project.id}
                          onClick={(evt) => {
                            evt.preventDefault();
                            evt.stopPropagation();
                            openVideoPicker(project.id);
                          }}
                          className="flex min-h-[36px] shrink-0 items-center gap-1 rounded-md border border-white/20 bg-black/70 px-2 py-1 text-[10px] font-mono uppercase tracking-wide text-white backdrop-blur-sm hover:bg-black/85 disabled:opacity-50"
                        >
                          {previewVideoUploadingId === project.id ? (
                            <Loader2 className="h-3 w-3 shrink-0 animate-spin" aria-hidden />
                          ) : (
                            <Film className="h-3 w-3 shrink-0" aria-hidden />
                          )}
                          <span className="truncate">
                            {previewVideoUploadingId === project.id ? 'Video…' : 'Preview'}
                          </span>
                        </button>
                      ) : null}
                    </div>
                  </>
                ) : null}
                {brokenThumbs[project.id] && !project.featuredVideoUrl?.trim() ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
                    <span className="pointer-events-none px-4 text-center text-lg font-bold text-white">{project.title}</span>
                  </div>
                ) : (
                  <PortfolioMedia
                    mode="preview"
                    poster={project.thumbnail?.trim() ? project.thumbnail : undefined}
                    videoSrc={project.featuredVideoUrl}
                    alt=""
                    aspectClassName="h-full w-full"
                    isHovering={isHovering}
                    onPosterError={() => {
                      if (!project.featuredVideoUrl?.trim()) {
                        setBrokenThumbs((prev) => ({ ...prev, [project.id]: true }));
                      }
                    }}
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
          );
        })}
      </div>
    </section>
  );
};

export default WorkGrid;
