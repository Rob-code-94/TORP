import React from 'react';
import { PROJECTS } from '../../constants';
import { ArrowUpRight, Play } from 'lucide-react';

const WorkGrid: React.FC = () => {
  return (
    <section className="px-4 py-24 bg-zinc-950 min-h-screen">
      <div className="max-w-7xl mx-auto mb-16 flex flex-col md:flex-row justify-between items-end border-b border-zinc-900 pb-8">
        <div>
          <h2 className="text-4xl md:text-6xl font-bold text-white tracking-tight mb-2">Selected Works</h2>
          <p className="text-zinc-500">Curated cinematic experiences 2023 — 2024</p>
        </div>
        <div className="hidden md:block">
            <span className="text-zinc-600 font-mono text-sm">6 PROJECTS AVAILABLE</span>
        </div>
      </div>

      {/* Masonry Layout using Tailwind Columns */}
      <div className="columns-1 md:columns-2 lg:columns-3 gap-8 space-y-8">
        {PROJECTS.map((project) => (
          <div 
            key={project.id} 
            className="group break-inside-avoid relative block bg-zinc-900 overflow-hidden cursor-pointer"
          >
            {/* Image Container */}
            <div className={`relative w-full ${project.aspectRatio === 'portrait' ? 'aspect-[9/16]' : project.aspectRatio === 'square' ? 'aspect-square' : 'aspect-video'}`}>
                <img 
                    src={project.thumbnail} 
                    alt={project.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-80 group-hover:opacity-100"
                />
                
                {/* Overlay Play Button */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/20 backdrop-blur-[2px]">
                    <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                        <Play className="w-6 h-6 text-black fill-current ml-1" />
                    </div>
                </div>
            </div>

            {/* Info Reveal */}
            <div className="pt-4 pb-2 flex justify-between items-start">
                <div>
                    <h3 className="text-xl font-bold text-white group-hover:text-zinc-300 transition-colors">{project.title}</h3>
                    <p className="text-zinc-500 text-sm mt-1">{project.client} &mdash; {project.tags.join(', ')}</p>
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