import React from 'react';
import { TRUST_LOGOS } from '../../constants';

const TrustTicker: React.FC = () => {
  return (
    <section className="w-full bg-zinc-950 border-y border-zinc-900 py-6 overflow-hidden relative">
        <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-zinc-950 to-transparent z-10" />
        <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-zinc-950 to-transparent z-10" />
        
        <div className="flex w-max items-center gap-20 animate-[scroll_30s_linear_infinite]">
            {/* Double the array to create seamless loop */}
            {[...TRUST_LOGOS, ...TRUST_LOGOS, ...TRUST_LOGOS].map((brand, idx) => (
                <span 
                    key={idx} 
                    className="text-2xl font-bold text-zinc-700 uppercase tracking-widest hover:text-white transition-colors duration-300 cursor-default select-none whitespace-nowrap"
                >
                    {brand}
                </span>
            ))}
        </div>
        
        <style>{`
          @keyframes scroll {
            0% { transform: translateX(0); }
            100% { transform: translateX(-33.33%); }
          }
        `}</style>
    </section>
  );
};

export default TrustTicker;