import React from 'react';
import { buildIcsFileContent, downloadIcsFile } from '../../../lib/calendarEvent';
import { useAdminTheme } from '../../../lib/adminTheme';

const AdminSettings: React.FC = () => {
  const { theme } = useAdminTheme();
  const isDark = theme === 'dark';
  return (
    <div className="max-w-2xl min-w-0 space-y-4 text-sm text-zinc-300">
      <div>
        <p className="text-xs font-mono uppercase text-zinc-500">Settings</p>
        <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>Admin &amp; org</h2>
        <p className="text-zinc-500 mt-1">Identity, org defaults, and calendar integrations (mock; wire to Firebase as needed).</p>
      </div>

      <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4">
        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Service packages (reference)</h3>
        <ul className="list-disc list-inside text-zinc-200 space-y-1">
          <li>Essentials: 5h shoot, 5 deliverables (20–60s), 7h edit, 2 rev</li>
          <li>Podcast pack: 3h shoot, episode + promos</li>
        </ul>
        <p className="text-xs text-zinc-500 mt-2">Canonical copy in docs and project facts when connected.</p>
      </div>

      <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4 space-y-3 min-w-0">
        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Google Calendar</h3>
        <p className="text-zinc-400 text-sm">
          <strong className="text-zinc-200">Add to Google Calendar</strong> in Planner and on project schedules uses an <strong>open link</strong> to Google’s event template.
          You do <strong>not</strong> need to connect an account to draft or save events from the browser.
        </p>
        <p className="text-zinc-500 text-xs">
          <strong>Connect Google (coming soon)</strong> will use OAuth2 and the Calendar API to sync shoot/meetings and push updates automatically. No tokens are stored in this mock build.
        </p>
        <button
          type="button"
          disabled
          className="rounded-md border border-zinc-700 px-3 py-2 text-xs text-zinc-500 cursor-not-allowed opacity-70"
        >
          Connect Google Calendar (coming soon)
        </button>
      </div>

      <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4 space-y-3 min-w-0">
        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Apple Calendar (ICS)</h3>
        <p className="text-zinc-400 text-sm">
          Apple Calendar does <strong>not</strong> offer a web &quot;Sign in with iCloud&quot; the way Google does. In TORP you can{' '}
          <strong>download a .ics file</strong> or use the same file from the event sheet. You can also subscribe to a <strong>private feed URL</strong> in a future release (not available in the mock).
        </p>
        <ol className="list-decimal list-inside text-zinc-400 text-xs space-y-1">
          <li>Download a .ics from an event, or use the sample below.</li>
          <li>On Mac: double-click the .ics or File → Import.</li>
          <li>On iPhone: share → Calendar, or import via Mail.</li>
          <li>Keep iCloud in sync using your normal iCloud account on the device.</li>
        </ol>
        <button
          type="button"
          onClick={() => {
            const start = new Date();
            start.setHours(12, 0, 0, 0);
            const ics = buildIcsFileContent(
              {
                title: 'TORP sample event',
                start,
                allDay: false,
                end: new Date(start.getTime() + 60 * 60 * 1000),
                location: 'Your studio or video link',
                description: 'Sample export from HQ Settings. Replace with a real event from the planner or a project schedule.',
              },
              { productId: '-//TORP//Settings Demo//EN' }
            );
            downloadIcsFile('torp-sample.ics', ics);
          }}
          className="rounded-md border border-zinc-600 bg-zinc-900 px-3 py-2 text-xs text-zinc-100 hover:bg-zinc-800"
        >
          Download sample .ics
        </button>
      </div>
    </div>
  );
};

export default AdminSettings;
