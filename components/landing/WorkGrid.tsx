import React, { useMemo, useState } from 'react';
import { PROJECTS, WORK_CATEGORY_FILTERS } from '../../constants';
import { ArrowUpRight, Play } from 'lucide-react';
import type { ProjectCategory } from '../../types';

type WorkGridProps = {
  onSelect: (slug: string) => void;
};

const WorkGrid: React.FC<WorkGridProps> = ({ onSelect }) => {
  const [filter, setFilter] = useState<'All' | ProjectCategory>('All');
  const [brokenThumbs, setBrokenThumbs] = useState<Record<string, boolean>>({});

  const filtered = useMemo(() => {
    if (filter === 'All') return PROJECTS;
    return PROJECTS.filter((p) => p.category === filter);
  }, [filter]);

  const count = PROJECTS.length;

  return (
    <section className="px-4 py-24 bg-zinc-950 min-h-screen">
      <div className="max-w-7xl mx-auto mb-16 flex flex-col md:flex-row justify-between items-end border-b border-zinc-900 pb-8">
        <div>
          <h2 className="text-4xl md:text-6xl font-bold text-white tracking-tight mb-2">Selected Works</h2>
          <p className="text-zinc-500">Curated cinematic experiences 2023 — 2024</p>
        </div>
        <div className="hidden md:block">
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
            onClick={() => onSelect(project.slug)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect(project.slug);
              }
            }}
            className="group break-inside-avoid relative block bg-zinc-900 overflow-hidden cursor-pointer"
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

              <div className="absolute inset-0 flex items-center justify-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/20 backdrop-blur-[2px]">
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
