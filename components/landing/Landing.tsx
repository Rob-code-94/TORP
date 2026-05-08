import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Instagram, Mail, Lock, ArrowRight } from 'lucide-react';
import Hero from './Hero';
import TrustTicker from './TrustTicker';
import WorkGrid from './WorkGrid';
import ProjectDetail from './ProjectDetail';
import ContactModal from './ContactModal';
import ShowcaseStrip from './ShowcaseStrip';
import { PROJECTS } from '../../constants';
import { listPortfolioLandingProjects, savePortfolioLandingProject } from '../../data/portfolioLandingRepository';
import { listShowcaseAssets, type ShowcaseAsset } from '../../data/showcaseRepository';
import { formatFirestoreListError } from '../../lib/formatFirestoreListError';
import { isFirebaseConfigured } from '../../lib/firebase';
import { canEditMarketingLanding } from '../../lib/landingMarketingEdit';
import { getMarketingTenantId, getMarketingTenantIdForUser } from '../../lib/marketingTenant';
import { uploadPortfolioLandingImage } from '../../lib/portfolioLandingStorage';
import type { VideoProject } from '../../types';
import { useAuth } from '../../lib/auth';
import { hqDestinationForUser, portalDestinationForUser } from '../../lib/authRedirect';

function getWorkSlugFromHash(): string | null {
  const raw = window.location.hash.replace(/^#/, '');
  const m = raw.match(/^\/work\/([^/?#]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

/** Public marketing site only — no auth, no CRM data. */
const Landing: React.FC = () => {
  const { user, loading } = useAuth();
  const [showContact, setShowContact] = useState(false);
  const [, setHashTick] = useState(0);
  const [showcaseItems, setShowcaseItems] = useState<ShowcaseAsset[]>([]);
  const [portfolioProjects, setPortfolioProjects] = useState<VideoProject[]>(() => PROJECTS);
  const [marketingSiteEditMode, setMarketingSiteEditMode] = useState(false);
  const [gridEditError, setGridEditError] = useState<string | null>(null);
  const [thumbnailUploadingId, setThumbnailUploadingId] = useState<string | null>(null);
  /** True once Firestore/local list returned ≥1 row — avoids saving against constants fallback IDs */
  const [portfolioPersistable, setPortfolioPersistable] = useState(false);

  const canEditMarketing = canEditMarketingLanding(user, loading);
  const marketingWriteTenantId = getMarketingTenantIdForUser(user?.tenantId);

  useEffect(() => {
    if (!canEditMarketing) setMarketingSiteEditMode(false);
  }, [canEditMarketing]);

  /** Deep link from HQ Org settings: `/?marketingEdit=1` enables inline edit for ADMIN; param is stripped after apply */
  useEffect(() => {
    if (loading) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('marketingEdit') !== '1') return;
    if (canEditMarketing) setMarketingSiteEditMode(true);
    params.delete('marketingEdit');
    const qs = params.toString();
    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`,
    );
  }, [loading, canEditMarketing]);

  useEffect(() => {
    const onHash = () => setHashTick((n) => n + 1);
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const workSlug = getWorkSlugFromHash();
  const activeWork = workSlug ? portfolioProjects.find((p) => p.slug === workSlug) : undefined;

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
    activeWork != null && portfolioProjects.length > 0
      ? (() => {
          const idx = portfolioProjects.findIndex((p) => p.slug === activeWork.slug);
          if (idx < 0) return null;
          return portfolioProjects[(idx + 1) % portfolioProjects.length] ?? null;
        })()
      : null;

  useEffect(() => {
    document.documentElement.style.scrollBehavior = 'smooth';
    return () => {
      document.documentElement.style.scrollBehavior = 'auto';
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    void listPortfolioLandingProjects(getMarketingTenantId())
      .then((rows) => {
        if (!mounted) return;
        setPortfolioPersistable(rows.length > 0);
        if (rows.length > 0) setPortfolioProjects(rows);
      })
      .catch(() => {
        if (!mounted) return;
        setPortfolioPersistable(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const handleReplaceLandingThumbnail = useCallback(
    async (project: VideoProject, file: File) => {
      setGridEditError(null);
      if (!isFirebaseConfigured()) {
        setGridEditError(formatFirestoreListError(new Error('Firebase is not configured.'), 'portfolio'));
        return;
      }
      if (!portfolioPersistable) {
        setGridEditError(
          'Portfolio is still using bundled sample projects or could not load from Firestore. Add or sync projects in HQ (Org → Landing portfolio), then reload this page.',
        );
        return;
      }
      const idx = portfolioProjects.findIndex((p) => p.id === project.id);
      if (idx < 0) return;
      if (!project.id || project.id.startsWith('draft-')) {
        setGridEditError('This entry is not published to Firestore yet. Save it from HQ Org settings first.');
        return;
      }
      setThumbnailUploadingId(project.id);
      try {
        const uploaded = await uploadPortfolioLandingImage({
          assetId: `${project.id}-landing-thumb-${Date.now()}`,
          file,
        });
        const merged: VideoProject = { ...project, thumbnail: uploaded.downloadUrl };
        const saved = await savePortfolioLandingProject(marketingWriteTenantId, merged, idx + 1);
        setPortfolioProjects((prev) => prev.map((p) => (p.id === project.id ? saved : p)));
      } catch (e) {
        setGridEditError(formatFirestoreListError(e, 'portfolio'));
      } finally {
        setThumbnailUploadingId(null);
      }
    },
    [marketingWriteTenantId, portfolioPersistable, portfolioProjects],
  );

  useEffect(() => {
    let mounted = true;
    void listShowcaseAssets(getMarketingTenantId())
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

  const hqAccessPath = !loading && user ? hqDestinationForUser(user) : '/hq';
  const clientPortalPath = !loading && user ? portalDestinationForUser(user) : '/portal/login';

  return (
    <div className="min-h-screen min-w-0 overflow-x-hidden bg-zinc-950 text-zinc-100 selection:bg-white selection:text-black">
      {activeWork && (
        <ProjectDetail
          project={activeWork}
          nextProject={nextWorkProject}
          onBack={closeWork}
          onNext={openWork}
          canEditMarketing={canEditMarketing}
          marketingEditMode={marketingSiteEditMode}
          onToggleMarketingEditMode={() => setMarketingSiteEditMode((v) => !v)}
          marketingTenantId={marketingWriteTenantId}
          portfolioPersistable={portfolioPersistable}
          portfolioProjectIndex={
            portfolioProjects.findIndex((p) => p.slug === activeWork.slug)
          }
          onProjectSaved={(saved) =>
            setPortfolioProjects((prev) => prev.map((p) => (p.id === saved.id ? saved : p)))
          }
        />
      )}

      <div className={activeWork ? 'hidden' : ''} aria-hidden={!!activeWork}>
        <Hero />
        <TrustTicker />
        <ShowcaseStrip items={showcaseItems} />
        <WorkGrid
          projects={portfolioProjects}
          onSelect={openWork}
          canEditMarketing={canEditMarketing}
          marketingEditMode={marketingSiteEditMode}
          onToggleMarketingEditMode={() => setMarketingSiteEditMode((v) => !v)}
          onReplaceThumbnail={handleReplaceLandingThumbnail}
          thumbnailUploadingId={thumbnailUploadingId}
          gridEditError={gridEditError}
        />

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
              to={hqAccessPath}
              className="inline-flex items-center gap-2 text-[10px] text-zinc-800 hover:text-zinc-600 transition-colors uppercase tracking-widest font-bold"
            >
              <Lock size={10} /> HQ Access
            </Link>
            <Link
              to={clientPortalPath}
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
