import React from 'react';
import { MousePointer2 } from 'lucide-react';
import { HERO_VIDEO_FALLBACK } from '../../constants';

const Hero: React.FC = () => {
  return (
    <section className="relative h-screen w-full overflow-hidden bg-zinc-950 flex items-center justify-center">
      {/* Background Layer */}
      <div className="absolute inset-0 z-0">
        <img 
          src={HERO_VIDEO_FALLBACK} 
          alt="Cinematic Background" 
          className="w-full h-full object-cover opacity-60 scale-105 animate-[pulse_10s_ease-in-out_infinite]"
        />
        {/* Overlay Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
      </div>

      {/* Content Layer */}
      <div className="relative z-10 text-center px-4">
        <h1 className="text-[15vw] md:text-[12vw] font-black tracking-tighter text-white leading-none mix-blend-overlay">
          TORP
        </h1>
        <p className="mt-4 text-zinc-400 text-sm md:text-xl font-light tracking-[0.2em] uppercase">
          Cinematic Partners &middot; Global Production
        </p>
      </div>

      {/* Interactive Scroll Hint */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 opacity-70 animate-bounce">
        <span className="text-[10px] uppercase tracking-widest text-zinc-500">Scroll to Explore</span>
        <MousePointer2 className="w-5 h-5 text-white" />
      </div>
    </section>
  );
};

export default Hero;