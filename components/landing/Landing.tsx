import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Instagram, Mail, Lock, ArrowRight } from 'lucide-react';
import Hero from './Hero';
import TrustTicker from './TrustTicker';
import WorkGrid from './WorkGrid';
import ProjectDetail from './ProjectDetail';
import ContactModal from './ContactModal';
import ShowcaseStrip from './ShowcaseStrip';
import { PROJECTS } from '../../constants';
import { listShowcaseAssets, type ShowcaseAsset } from '../../data/showcaseRepository';

function getWorkSlugFromHash(): string | null {
  const raw = window.location.hash.replace(/^#/, '');
  const m = raw.match(/^\/work\/([^/?#]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

/** Public marketing site only — no auth, no CRM data. */
const Landing: React.FC = () => {
  const [showContact, setShowContact] = useState(false);
  const [, setHashTick] = useState(0);
  const [showcaseItems, setShowcaseItems] = useState<ShowcaseAsset[]>([]);

  useEffect(() => {
    const onHash = () => setHashTick((n) => n + 1);
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const workSlug = getWorkSlugFromHash();
  const activeWork = workSlug ? PROJECTS.find((p) => p.slug === workSlug) : undefined;

  useEffect(() => {
    if (workSlug && !activeWork) {
      window.location.hash = '';
    }
  }, [workSlug, activeWork]);

  const openWork = (slug: string) => {
    window.location.hash = `#/work/${encodeURIComponent(slug)}`;
  };

  const closeWork = () => {
    window.location.hash = '';
  };

  const nextWorkProject =
    activeWork != null
      ? PROJECTS[(PROJECTS.findIndex((p) => p.slug === activeWork.slug) + 1) % PROJECTS.length]
      : null;

  useEffect(() => {
    document.documentElement.style.scrollBehavior = 'smooth';
    return () => {
      document.documentElement.style.scrollBehavior = 'auto';
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    void listShowcaseAssets('torp-default')
      .then((rows) => {
        if (!mounted) return;
        setShowcaseItems(rows.filter((row) => row.visible));
      })
      .catch(() => {
        if (!mounted) return;
        setShowcaseItems([]);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-white selection:text-black">
      {activeWork && (
        <ProjectDetail
          project={activeWork}
          nextProject={nextWorkProject}
          onBack={closeWork}
          onNext={openWork}
        />
      )}

      <div className={activeWork ? 'hidden' : ''} aria-hidden={!!activeWork}>
        <Hero />
        <TrustTicker />
        <ShowcaseStrip items={showcaseItems} />
        <WorkGrid onSelect={openWork} />

        <section className="py-32 px-4 md:px-12 bg-zinc-950 border-t border-zinc-900">
          <div className="max-w-4xl mx-auto text-center md:text-left">
            <h2 className="text-3xl md:text-5xl font-bold leading-tight mb-8">
              We don’t just capture footage. <br />
              <span className="text-zinc-500">We engineer aesthetic authority.</span>
            </h2>
            <p className="text-lg text-zinc-400 md:max-w-2xl leading-relaxed">
              TORP partners with global brands to translate complex identities into high-velocity visual
              assets. From the storyboard to the final color grade, we operate as an extension of your
              internal team.
            </p>
          </div>
        </section>

        <section className="py-24 bg-zinc-900 border-t border-zinc-800 text-center px-4">
          <h2 className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tight">
            Ready to shoot?
          </h2>
          <p className="text-zinc-400 max-w-xl mx-auto mb-10 text-lg">
            Let's build something cinematic. Tell us about your vision.
          </p>
          <button
            type="button"
            onClick={() => setShowContact(true)}
            className="bg-white text-black px-8 py-4 rounded-full font-bold text-lg hover:scale-105 transition-transform flex items-center gap-2 mx-auto"
          >
            Start a Project <ArrowRight size={20} />
          </button>
        </section>

        <footer className="py-12 border-t border-zinc-900 bg-black flex flex-col items-center gap-8">
          <div className="text-center">
            <h3 className="text-3xl font-black tracking-tighter text-white">TORP</h3>
            <p className="text-xs text-zinc-600 mt-2">© 2024 TORP HQ. All Rights Reserved.</p>
          </div>

          <div className="flex items-center gap-6">
            <a
              href="https://www.instagram.com/torpros?igsh=ZjkycjM3anBqa3h3"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-400 hover:text-white transition-colors group"
            >
              <Instagram size={24} className="group-hover:scale-110 transition-transform" />
            </a>
            <a
              href="mailto:info@torp.life"
              className="text-zinc-400 hover:text-white transition-colors group"
              aria-label="Email TORP"
            >
              <Mail size={24} className="group-hover:scale-110 transition-transform" />
            </a>
          </div>

          <div className="flex flex-col items-center gap-3 mt-2">
            <Link
              to="/hq"
              className="inline-flex items-center gap-2 text-[10px] text-zinc-800 hover:text-zinc-600 transition-colors uppercase tracking-widest font-bold"
            >
              <Lock size={10} /> HQ Access
            </Link>
            <Link
              to="/portal/login"
              className="text-[10px] text-zinc-700 hover:text-zinc-500 uppercase tracking-widest font-bold transition-colors"
            >
              Client portal
            </Link>
          </div>
        </footer>
      </div>

      <ContactModal open={showContact} onClose={() => setShowContact(false)} />
    </div>
  );
};

export default Landing;
