import React, { useState, useEffect } from 'react';
import { UserRole } from './types';
import Hero from './components/landing/Hero';
import TrustTicker from './components/landing/TrustTicker';
import WorkGrid from './components/landing/WorkGrid';
import LandingSelect from './components/landing/LandingSelect';
import DashboardLayout from './components/dashboard/DashboardLayout';
import AdminView from './components/dashboard/AdminView';
import StaffView from './components/dashboard/StaffView';
import ClientView from './components/dashboard/ClientView';
import { Lock, Instagram, Mail, X, ArrowRight } from 'lucide-react';

/** Landing contact modal: Inter (font-sans), zinc surfaces, blue focus ring — matches inputs + custom selects */
const LANDING_LABEL = 'text-xs text-zinc-400 uppercase font-bold tracking-wider';

const LANDING_CONTROL =
  'w-full rounded-md border border-zinc-800 bg-zinc-900 p-3 font-sans text-sm font-medium text-white placeholder:text-zinc-500 transition-colors focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/35';

const EVENT_TYPE_OPTIONS = [
  'Commercial',
  'Music Video',
  'Documentary',
  'Social Content',
  'Event Coverage',
  'Other',
] as const;

/** Shoot-day style buckets — aligns with TORP’s hour-based quoting (see docs/company-reference-from-google-doc.txt: 4hr minimum, half/full day). */
const DURATION_OPTIONS = [
  '1-4 hrs',
  '4-8 hrs',
  '8-12 hrs',
  '1-2 days',
  '3-5 days',
  '5+ days',
] as const;

/** Inbox for project briefs — delivered via FormSubmit (no backend required; first deploy may need one-time inbox confirmation). */
const PROJECT_BRIEF_EMAIL = 'info@torp.life';

const App: React.FC = () => {
  const [role, setRole] = useState<UserRole>(UserRole.PUBLIC);
  const [showLogin, setShowLogin] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [eventType, setEventType] = useState<string>(EVENT_TYPE_OPTIONS[0]);
  const [duration, setDuration] = useState<string>(DURATION_OPTIONS[0]);

  const [briefName, setBriefName] = useState('');
  const [briefEmail, setBriefEmail] = useState('');
  const [briefPhone, setBriefPhone] = useState('');
  const [briefSocial, setBriefSocial] = useState('');
  const [briefVision, setBriefVision] = useState('');
  const [briefSubmitting, setBriefSubmitting] = useState(false);
  const [briefSuccess, setBriefSuccess] = useState(false);
  const [briefError, setBriefError] = useState<string | null>(null);

  // Smooth scroll helper
  useEffect(() => {
    document.documentElement.style.scrollBehavior = 'smooth';
    return () => {
      document.documentElement.style.scrollBehavior = 'auto';
    };
  }, []);

  useEffect(() => {
    if (!showContact) {
      setBriefSuccess(false);
      setBriefError(null);
      setBriefSubmitting(false);
      setBriefName('');
      setBriefEmail('');
      setBriefPhone('');
      setBriefSocial('');
      setBriefVision('');
      setEventType(EVENT_TYPE_OPTIONS[0]);
      setDuration(DURATION_OPTIONS[0]);
    }
  }, [showContact]);

  const handleLogin = (selectedRole: UserRole) => {
    setRole(selectedRole);
    setShowLogin(false);
  };

  const handleLogout = () => {
    setRole(UserRole.PUBLIC);
  };

  const openBriefMailto = () => {
    const body = [
      `Name: ${briefName}`,
      `Email: ${briefEmail}`,
      `Phone: ${briefPhone}`,
      `Instagram / social: ${briefSocial || '—'}`,
      `Event type: ${eventType}`,
      `Duration: ${duration}`,
      '',
      'Vision / concept:',
      briefVision,
    ].join('\n');
    window.location.href = `mailto:${PROJECT_BRIEF_EMAIL}?subject=${encodeURIComponent(
      'TORP — Project Brief'
    )}&body=${encodeURIComponent(body)}`;
  };

  const handleBriefSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBriefError(null);
    setBriefSubmitting(true);
    try {
      const res = await fetch(
        `https://formsubmit.co/ajax/${encodeURIComponent(PROJECT_BRIEF_EMAIL)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            _subject: 'TORP — New Project Brief',
            _template: 'table',
            _captcha: false,
            name: briefName,
            email: briefEmail,
            phone: briefPhone,
            social_or_instagram: briefSocial.trim() || '—',
            event_type: eventType,
            shoot_duration: duration,
            vision: briefVision,
          }),
        }
      );
      const data = (await res.json()) as { success?: string | boolean; message?: string };
      if (!res.ok) {
        throw new Error(data.message ?? 'Could not send. Try again or use email below.');
      }
      if (data.success === false || String(data.success).toLowerCase() === 'false') {
        throw new Error(data.message ?? 'Could not send.');
      }
      setBriefSuccess(true);
    } catch (err) {
      setBriefError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBriefSubmitting(false);
    }
  };

  // Render Dashboard based on Role
  if (role !== UserRole.PUBLIC) {
    return (
      <DashboardLayout role={role} onLogout={handleLogout}>
        {role === UserRole.ADMIN && <AdminView />}
        {role === UserRole.STAFF && <StaffView />}
        {role === UserRole.CLIENT && <ClientView />}
      </DashboardLayout>
    );
  }

  // Render Landing Page (Public)
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-white selection:text-black">
      <Hero />
      <TrustTicker />
      <WorkGrid />
      
      {/* Philosophy Section */}
      <section className="py-32 px-4 md:px-12 bg-zinc-950 border-t border-zinc-900">
        <div className="max-w-4xl mx-auto text-center md:text-left">
          <h2 className="text-3xl md:text-5xl font-bold leading-tight mb-8">
            We don’t just capture footage. <br />
            <span className="text-zinc-500">We engineer aesthetic authority.</span>
          </h2>
          <p className="text-lg text-zinc-400 md:max-w-2xl leading-relaxed">
            TORP partners with global brands to translate complex identities into high-velocity visual assets. From the storyboard to the final color grade, we operate as an extension of your internal team.
          </p>
        </div>
      </section>

      {/* Contact / Call to Action Section */}
      <section className="py-24 bg-zinc-900 border-t border-zinc-800 text-center px-4">
         <h2 className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tight">Ready to shoot?</h2>
         <p className="text-zinc-400 max-w-xl mx-auto mb-10 text-lg">
           Let's build something cinematic. Tell us about your vision.
         </p>
         <button 
           onClick={() => setShowContact(true)}
           className="bg-white text-black px-8 py-4 rounded-full font-bold text-lg hover:scale-105 transition-transform flex items-center gap-2 mx-auto"
         >
           Start a Project <ArrowRight size={20} />
         </button>
      </section>

      {/* Footer / Login Trigger */}
      <footer className="py-12 border-t border-zinc-900 bg-black flex flex-col items-center gap-8">
        <div className="text-center">
           <h3 className="text-3xl font-black tracking-tighter text-white">TORP</h3>
           <p className="text-xs text-zinc-600 mt-2">© 2024 TORP HQ. All Rights Reserved.</p>
        </div>

        <div className="flex items-center gap-6">
            <a href="https://www.instagram.com/torpros?igsh=ZjkycjM3anBqa3h3" target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-white transition-colors group">
                <Instagram size={24} className="group-hover:scale-110 transition-transform" />
            </a>
            <a
                href={`mailto:${PROJECT_BRIEF_EMAIL}`}
                className="text-zinc-400 hover:text-white transition-colors group"
                aria-label="Email TORP"
            >
                <Mail size={24} className="group-hover:scale-110 transition-transform" />
            </a>
        </div>
        
        <button 
            onClick={() => setShowLogin(true)}
            className="inline-flex items-center gap-2 text-[10px] text-zinc-800 hover:text-zinc-600 transition-colors uppercase tracking-widest font-bold mt-4"
        >
            <Lock size={10} /> HQ Access
        </button>
      </footer>

      {/* Login Modal */}
      {showLogin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl w-full max-w-md shadow-2xl relative">
                <button 
                    onClick={() => setShowLogin(false)}
                    className="absolute top-4 right-4 text-zinc-500 hover:text-white"
                >
                    <X size={20} />
                </button>
                
                <h3 className="text-xl font-bold text-white mb-6 text-center">Select Portal Access</h3>
                
                <div className="space-y-3">
                    <button 
                        onClick={() => handleLogin(UserRole.ADMIN)}
                        className="w-full bg-white hover:bg-zinc-200 text-black font-bold py-4 rounded-xl transition-all hover:scale-[1.02]"
                    >
                        Staff Portal
                    </button>
                    
                    <button 
                        onClick={() => handleLogin(UserRole.CLIENT)}
                        className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-4 rounded-xl transition-all hover:scale-[1.02]"
                    >
                        Client Portal
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Contact Modal */}
      {showContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200">
           <div className="bg-zinc-950 border border-zinc-800 p-8 rounded-2xl w-full max-w-lg shadow-2xl relative max-h-[90vh] overflow-y-auto">
              <button onClick={() => setShowContact(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white">
                <X size={20} />
              </button>
              
              <h3 className="text-2xl font-bold text-white mb-2">Project Brief</h3>
              <p className="text-zinc-500 mb-6 text-sm">Tell us about your production needs.</p>

              {briefSuccess ? (
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-6 py-10 text-center">
                  <p className="text-lg font-bold text-white">Message received</p>
                  <p className="mt-2 text-sm text-zinc-400">
                    Someone from TORP will reach out to you soon.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowContact(false)}
                    className="mt-8 w-full rounded-lg bg-white py-4 text-sm font-bold uppercase tracking-wide text-black transition-colors hover:bg-zinc-200"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <form className="space-y-4" onSubmit={handleBriefSubmit} noValidate>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className={LANDING_LABEL} htmlFor="brief-name">
                        Name
                      </label>
                      <input
                        id="brief-name"
                        required
                        type="text"
                        autoComplete="name"
                        value={briefName}
                        onChange={(ev) => setBriefName(ev.target.value)}
                        className={LANDING_CONTROL}
                        placeholder="John Doe"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className={LANDING_LABEL} htmlFor="brief-email">
                        Email
                      </label>
                      <input
                        id="brief-email"
                        required
                        type="email"
                        autoComplete="email"
                        value={briefEmail}
                        onChange={(ev) => setBriefEmail(ev.target.value)}
                        className={LANDING_CONTROL}
                        placeholder="john@company.com"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className={LANDING_LABEL} htmlFor="brief-phone">
                        Phone
                      </label>
                      <input
                        id="brief-phone"
                        required
                        type="tel"
                        autoComplete="tel"
                        value={briefPhone}
                        onChange={(ev) => setBriefPhone(ev.target.value)}
                        className={LANDING_CONTROL}
                        placeholder="(555) 123-4567"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className={LANDING_LABEL} htmlFor="brief-social">
                        Instagram / social{' '}
                        <span className="font-normal normal-case text-zinc-600">(optional)</span>
                      </label>
                      <input
                        id="brief-social"
                        type="text"
                        autoComplete="username"
                        value={briefSocial}
                        onChange={(ev) => setBriefSocial(ev.target.value)}
                        className={LANDING_CONTROL}
                        placeholder="@handle or profile link"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className={LANDING_LABEL} htmlFor="contact-event-type">
                        Event Type
                      </label>
                      <LandingSelect
                        id="contact-event-type"
                        name="eventType"
                        options={EVENT_TYPE_OPTIONS}
                        value={eventType}
                        onChange={setEventType}
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className={LANDING_LABEL} htmlFor="contact-duration">
                        Duration
                      </label>
                      <LandingSelect
                        id="contact-duration"
                        name="duration"
                        options={DURATION_OPTIONS}
                        value={duration}
                        onChange={setDuration}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className={LANDING_LABEL} htmlFor="brief-vision">
                      Vision / Concept
                    </label>
                    <textarea
                      id="brief-vision"
                      required
                      rows={4}
                      value={briefVision}
                      onChange={(ev) => setBriefVision(ev.target.value)}
                      className={`${LANDING_CONTROL} resize-none`}
                      placeholder="Briefly describe the project styling and goals..."
                    />
                  </div>

                  {briefError && (
                    <div className="rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-200">
                      <p>{briefError}</p>
                      <button
                        type="button"
                        onClick={openBriefMailto}
                        className="mt-2 text-xs font-bold uppercase tracking-wider text-white underline underline-offset-2 hover:text-zinc-200"
                      >
                        Open in email app instead
                      </button>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={briefSubmitting}
                    className="mt-2 w-full rounded-lg bg-white py-4 font-bold uppercase tracking-wide text-black transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {briefSubmitting ? 'Sending…' : 'Send Request'}
                  </button>
                </form>
              )}
           </div>
        </div>
      )}
    </div>
  );
};

export default App;