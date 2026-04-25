import React from 'react';

const AdminSettings: React.FC = () => {
  return (
    <div className="max-w-2xl space-y-4 text-sm text-zinc-300">
      <div>
        <p className="text-xs font-mono uppercase text-zinc-500">Settings</p>
        <h2 className="text-xl font-bold text-white">Admin &amp; org (placeholders)</h2>
        <p className="text-zinc-500 mt-1">Wire to Firebase: identity, org, integrations, and notification rules.</p>
      </div>
      <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4">
        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Service packages (from source doc)</h3>
        <ul className="list-disc list-inside text-zinc-200 space-y-1">
          <li>Essentials: 5h shoot, 5 deliverables (20–60s), 7h edit, 2 rev — $2,500 (per TORP facts doc)</li>
          <li>Podcast pack: 3h shoot, episode + promos, $800–$5,000 (per episode model)</li>
        </ul>
        <p className="text-xs text-zinc-500 mt-2">Canonical copy &amp; rate cards live in docs/torp-facts.md and the Google doc export.</p>
      </div>
      <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4 text-zinc-500">
        <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">Integrations (upcoming)</h3>
        <p>Stripe Invoicing, Resend, Google Calendar, Storage — connect after auth + data layer.</p>
      </div>
    </div>
  );
};

export default AdminSettings;
