import React, { useState, useEffect } from 'react';
import { UserRole } from './types';
import Hero from './components/landing/Hero';
import TrustTicker from './components/landing/TrustTicker';
import WorkGrid from './components/landing/WorkGrid';
import DashboardLayout from './components/dashboard/DashboardLayout';
import AdminView from './components/dashboard/AdminView';
import StaffView from './components/dashboard/StaffView';
import ClientView from './components/dashboard/ClientView';
import { Lock, Instagram, Mail, X, ArrowRight } from 'lucide-react';

const App: React.FC = () => {
  const [role, setRole] = useState<UserRole>(UserRole.PUBLIC);
  const [showLogin, setShowLogin] = useState(false);
  const [showContact, setShowContact] = useState(false);

  // Smooth scroll helper
  useEffect(() => {
    document.documentElement.style.scrollBehavior = 'smooth';
    return () => {
      document.documentElement.style.scrollBehavior = 'auto';
    };
  }, []);

  const handleLogin = (selectedRole: UserRole) => {
    setRole(selectedRole);
    setShowLogin(false);
  };

  const handleLogout = () => {
    setRole(UserRole.PUBLIC);
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
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-white transition-colors group">
                <Instagram size={24} className="group-hover:scale-110 transition-transform" />
            </a>
            <button onClick={() => setShowContact(true)} className="text-zinc-400 hover:text-white transition-colors group">
                <Mail size={24} className="group-hover:scale-110 transition-transform" />
            </button>
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

              <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setShowContact(false); alert('Request Sent!'); }}>
                  <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                          <label className="text-xs text-zinc-400 uppercase font-bold tracking-wider">Name</label>
                          <input required type="text" className="w-full bg-zinc-900 border border-zinc-800 rounded p-3 text-white focus:outline-none focus:border-white transition-colors" placeholder="John Doe" />
                      </div>
                      <div className="space-y-1">
                          <label className="text-xs text-zinc-400 uppercase font-bold tracking-wider">Email</label>
                          <input required type="email" className="w-full bg-zinc-900 border border-zinc-800 rounded p-3 text-white focus:outline-none focus:border-white transition-colors" placeholder="john@company.com" />
                      </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1">
                          <label className="text-xs text-zinc-400 uppercase font-bold tracking-wider">Event Type</label>
                          <select className="w-full bg-zinc-900 border border-zinc-800 rounded p-3 text-white focus:outline-none focus:border-white transition-colors appearance-none cursor-pointer">
                              <option>Commercial</option>
                              <option>Music Video</option>
                              <option>Documentary</option>
                              <option>Social Content</option>
                              <option>Event Coverage</option>
                              <option>Other</option>
                          </select>
                      </div>
                       <div className="space-y-1">
                          <label className="text-xs text-zinc-400 uppercase font-bold tracking-wider">Duration</label>
                          <select className="w-full bg-zinc-900 border border-zinc-800 rounded p-3 text-white focus:outline-none focus:border-white transition-colors appearance-none cursor-pointer">
                              <option>Under 1 min</option>
                              <option>1 - 3 mins</option>
                              <option>3 - 5 mins</option>
                              <option>5+ mins</option>
                          </select>
                      </div>
                  </div>

                  <div className="space-y-1">
                      <label className="text-xs text-zinc-400 uppercase font-bold tracking-wider">Vision / Concept</label>
                      <textarea rows={4} className="w-full bg-zinc-900 border border-zinc-800 rounded p-3 text-white focus:outline-none focus:border-white transition-colors resize-none" placeholder="Briefly describe the project styling and goals..." />
                  </div>

                  <button type="submit" className="w-full bg-white text-black font-bold py-4 rounded-lg hover:bg-zinc-200 transition-colors mt-2 uppercase tracking-wide">
                      Send Request
                  </button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;