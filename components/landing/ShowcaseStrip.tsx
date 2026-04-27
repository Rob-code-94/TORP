import React from 'react';
import type { ShowcaseAsset } from '../../data/showcaseRepository';

interface ShowcaseStripProps {
  items: ShowcaseAsset[];
}

const ShowcaseStrip: React.FC<ShowcaseStripProps> = ({ items }) => {
  if (items.length === 0) return null;
  return (
    <section className="py-16 px-4 md:px-8 bg-zinc-950 border-t border-zinc-900">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl md:text-4xl font-bold text-white tracking-tight">Live Showcase</h2>
          <p className="text-zinc-500 text-sm mt-1">
            Curated media served directly from TORP public storage.
          </p>
        </div>
        <div className="rounded-xl border border-zinc-800 p-3 overflow-x-auto">
          <div className="flex gap-3 min-w-0">
            {items.map((item) => (
              <article
                key={item.id}
                className="w-[220px] sm:w-[280px] shrink-0 rounded-lg overflow-hidden border border-zinc-800 bg-zinc-900"
              >
                <div className="aspect-video bg-zinc-950">
                  {item.mediaKind === 'video' ? (
                    <video
                      src={item.mediaUrl}
                      controls
                      preload="metadata"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <img
                      src={item.mediaUrl}
                      alt={item.title}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <div className="p-2.5">
                  <p className="text-sm font-semibold text-zinc-100 truncate">{item.title}</p>
                  {item.subtitle ? (
                    <p className="text-xs text-zinc-500 line-clamp-2 mt-1">{item.subtitle}</p>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ShowcaseStrip;
