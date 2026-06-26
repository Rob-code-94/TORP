import React, { useMemo, useRef, useState } from 'react';
import { WORK_CATEGORY_FILTERS } from '../../constants';
import { ArrowUpRight, Film, ImagePlus, Loader2, Pencil, Play } from 'lucide-react';
import { cardAspectClass, projectPosterUrl, railMediaAspectClass } from '../../lib/portfolioMedia';
import type { ProjectCategory, VideoProject } from '../../types';
import HorizontalMediaRail from './HorizontalMediaRail';
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

  const renderProjectCard = (project: VideoProject, layout: 'rail' | 'masonry') => {
    const isRail = layout === 'rail';
    const isPortraitRail = isRail && project.aspectRatio === 'portrait';
    const isHovering = hoverPreviewId === project.id;
    const poster = projectPosterUrl(project) || undefined;
    const mediaAspect = isRail
      ? railMediaAspectClass(project.aspectRatio)
      : cardAspectClass(project.aspectRatio);
    const cardShellClass = isRail
      ? 'flex flex-col snap-start shrink-0 w-[82vw] max-w-[340px]'
      : 'break-inside-avoid';

    const mediaBlock = (
      <div className={`relative w-full shrink-0 ${mediaAspect}`}>
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
            <span className="pointer-events-none px-4 text-center text-lg font-bold text-white">
              {project.title}
            </span>
          </div>
        ) : (
          <PortfolioMedia
            mode="preview"
            poster={poster}
            videoSrc={project.featuredVideoUrl}
            startSeconds={project.featuredVideoStartSeconds}
            endSeconds={project.featuredVideoEndSeconds}
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

        {isRail && !isPortraitRail ? (
          <span className="pointer-events-none absolute bottom-2 right-2 z-10 rounded-full border border-zinc-800 bg-black/70 px-2 py-0.5 font-mono text-[10px] text-zinc-300">
            {project.year}
          </span>
        ) : null}

        <div
          className={`absolute inset-0 flex items-center justify-center gap-4 bg-black/20 backdrop-blur-[2px] transition-opacity duration-300 ${
            marketingEditMode
              ? 'pointer-events-none opacity-0'
              : 'opacity-0 md:group-hover:opacity-100'
          }`}
        >
          <div className="flex h-16 w-16 scale-90 transform items-center justify-center rounded-full bg-white shadow-lg transition-transform md:group-hover:scale-100">
            <Play className="ml-1 h-6 w-6 fill-current text-black" />
          </div>
          <span className="hidden font-mono text-xs uppercase tracking-widest text-white drop-shadow-md sm:inline">
            View case →
          </span>
        </div>
      </div>
    );

    const railMeta = (
      <div className="min-w-0 px-3 py-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-base font-bold text-white transition-colors group-hover:text-zinc-300">
              {project.title}
            </h3>
            <p className="mt-1 line-clamp-2 text-sm text-zinc-500">
              {project.client} &mdash; {project.tags.join(', ')}
            </p>
          </div>
          {isPortraitRail ? (
            <span className="shrink-0 rounded-full border border-zinc-800 px-2 py-0.5 font-mono text-[10px] text-zinc-600">
              {project.year}
            </span>
          ) : null}
        </div>
      </div>
    );

    const masonryMeta = (
      <div className="flex items-start justify-between px-3 pb-3 pt-3">
        <div className="min-w-0 pr-2">
          <h3 className="truncate text-lg font-bold text-white transition-colors group-hover:text-zinc-300">
            {project.title}
          </h3>
          <p className="mt-1 line-clamp-2 text-sm text-zinc-500">
            {project.client} &mdash; {project.tags.join(', ')}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end">
          <span className="rounded-full border border-zinc-800 px-2 py-0.5 font-mono text-xs text-zinc-600">
            {project.year}
          </span>
          <ArrowUpRight className="mt-2 h-4 w-4 text-zinc-600 opacity-0 transition-opacity group-hover:opacity-100" />
        </div>
      </div>
    );

    return (
      <article
        key={project.id}
        data-rail-card={isRail ? true : undefined}
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
        className={`group relative overflow-hidden border border-zinc-800 bg-zinc-900 ${cardShellClass} ${
          marketingEditMode ? 'cursor-default' : 'cursor-pointer'
        }`}
      >
        {mediaBlock}
        {isRail ? railMeta : masonryMeta}
      </article>
    );
  };

  return (
    <section id="landing-selected-works" className="min-h-0 min-w-0 scroll-mt-20 bg-zinc-950 px-4 py-24 md:min-h-screen">
      {gridEditWarning ? (
        <div className="mx-auto mb-4 min-w-0 max-w-7xl rounded-lg border border-amber-900/60 bg-amber-950/30 px-3 py-2">
          <p className="break-words text-xs text-amber-200/90">{gridEditWarning}</p>
        </div>
      ) : null}
      {gridEditError ? (
        <div className="mx-auto mb-4 min-w-0 max-w-7xl rounded-lg border border-rose-900/60 bg-rose-950/30 px-3 py-2">
          <p className="break-words text-xs text-rose-300">{gridEditError}</p>
        </div>
      ) : null}

      <div className="mx-auto mb-8 flex min-w-0 max-w-7xl flex-col items-start justify-between gap-4 border-b border-zinc-900 pb-8 md:mb-16 md:flex-row md:items-end">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="mb-0 text-4xl font-bold tracking-tight text-white md:mb-2 md:text-6xl">
                Selected Works
              </h2>
              {canEditMarketing ? (
                <button
                  type="button"
                  onClick={() => onToggleMarketingEditMode?.()}
                  aria-pressed={marketingEditMode}
                  className={`inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1.5 font-mono text-xs uppercase tracking-wider transition-colors sm:min-h-0 sm:min-w-0 ${
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
            <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-zinc-600 md:hidden">
              Swipe to explore
            </p>
          </div>
        </div>
        <div className="hidden shrink-0 md:block">
          <span className="font-mono text-sm text-zinc-600">{count} PROJECTS AVAILABLE</span>
        </div>
      </div>

      <div className="sticky top-0 z-20 -mx-4 mb-6 border-b border-zinc-900 bg-zinc-950/95 px-4 py-3 backdrop-blur md:static md:mx-0 md:mb-10 md:border-b-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
        <div className="mx-auto flex min-w-0 max-w-7xl flex-wrap gap-2">
          {WORK_CATEGORY_FILTERS.map((cat) => {
            const active = filter === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setFilter(cat)}
                className={`min-h-[44px] rounded-full border px-4 py-2 font-mono text-xs uppercase tracking-wider transition-colors duration-300 ${
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
      </div>

      <div className="md:hidden">
        <HorizontalMediaRail ariaLabel="Selected works" className="-mx-4">
          {filtered.map((project) => renderProjectCard(project, 'rail'))}
        </HorizontalMediaRail>
      </div>

      <div className="mx-auto hidden max-w-7xl columns-1 gap-8 space-y-8 md:block md:columns-2 lg:columns-3">
        {filtered.map((project) => renderProjectCard(project, 'masonry'))}
      </div>
    </section>
  );
};

export default WorkGrid;
