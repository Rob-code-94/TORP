import React, { useEffect, useState } from 'react';
import type { VideoProject } from '../../types';
import { ArrowLeft, ArrowRight, ArrowUpRight } from 'lucide-react';

type ProjectDetailProps = {
  project: VideoProject;
  nextProject: VideoProject | null;
  onBack: () => void;
  onNext: (slug: string) => void;
};

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

const ProjectDetail: React.FC<ProjectDetailProps> = ({ project, nextProject, onBack, onNext }) => {
  const [heroBroken, setHeroBroken] = useState(false);
  const [brokenGallery, setBrokenGallery] = useState<Record<number, boolean>>({});

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

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-zinc-950 text-zinc-100">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-900 bg-zinc-950/95 px-4 py-4 backdrop-blur-md md:px-8">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-zinc-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">{project.client}</span>
      </div>

      <div className="relative w-full overflow-hidden md:aspect-[21/9] aspect-video">
        {heroBroken ? (
          <div className="flex h-full min-h-[40vh] w-full items-center justify-center bg-zinc-900 md:min-h-0">
            <h1 className="max-w-4xl px-4 text-center text-4xl font-bold text-white md:text-6xl">{project.title}</h1>
          </div>
        ) : (
          <>
            <img
              src={project.heroImage}
              alt=""
              className="h-full w-full object-cover"
              loading="eager"
              decoding="async"
              onError={() => setHeroBroken(true)}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 px-4 pb-10 pt-24 md:px-12">
              <h1 className="text-4xl font-bold tracking-tight text-white md:text-6xl lg:text-7xl">{project.title}</h1>
            </div>
          </>
        )}
      </div>

      <div className="mx-auto max-w-5xl px-4 py-16 md:px-8">
        <div className="grid gap-6 border-b border-zinc-900 pb-12 font-mono text-xs uppercase tracking-wider text-zinc-500 md:grid-cols-2 lg:grid-cols-3">
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
        </div>

        <p className="mx-auto mt-12 max-w-3xl text-lg leading-relaxed text-zinc-400">{project.logline}</p>

        <div className="mt-20">
          <h2 className="mb-8 border-b border-zinc-900 pb-4 text-2xl font-bold text-white md:text-3xl">Stills</h2>
          <div className="columns-1 gap-6 space-y-6 md:columns-2">
            {project.gallery.map((item, i) => (
              <div key={`${project.slug}-g-${i}`} className="break-inside-avoid">
                <div className={`relative w-full overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 ${aspectClass(item.aspect)}`}>
                  {brokenGallery[i] ? (
                    <div className="flex h-full w-full items-center justify-center bg-zinc-900">
                      <span className="font-mono text-xs text-zinc-600">Image unavailable</span>
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
                {item.caption && (
                  <p className="mt-2 font-mono text-xs text-zinc-600">{item.caption}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-24 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-8 md:p-12">
          <h2 className="mb-8 text-2xl font-bold text-white md:text-3xl">Credits</h2>
          <div className="grid gap-6 md:grid-cols-2">
            {project.credits.map((c) => (
              <div key={c.label} className="border-t border-zinc-800 pt-4">
                <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">{c.label}</p>
                <p className="mt-2 text-sm text-zinc-300">{c.value}</p>
              </div>
            ))}
          </div>
        </div>

        {nextProject && (
          <button
            type="button"
            onClick={() => onNext(nextProject.slug)}
            className="group mt-16 flex w-full flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40 text-left transition-colors hover:border-zinc-600 md:flex-row"
          >
            <div className="relative aspect-video w-full md:w-1/2">
              <img src={nextProject.thumbnail} alt="" className="h-full w-full object-cover opacity-90 transition-opacity group-hover:opacity-100" loading="lazy" />
              <div className="absolute inset-0 bg-black/30" />
            </div>
            <div className="flex flex-1 flex-col justify-center px-8 py-10">
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
            className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900 px-8 py-4 font-mono text-xs uppercase tracking-widest text-zinc-300 transition-colors hover:border-zinc-600 hover:text-white"
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
