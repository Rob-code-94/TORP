import { useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { getAdminShootById } from '../../data/adminMock';
import { isShootVisibleToCrew } from '../../lib/staffShoots';
import { UserRole } from '../../types';

/**
 * Print-only call sheet. Opens from StaffView; auto-invokes print dialog when ready.
 */
export default function CallSheetPrintView() {
  const { shootId = '' } = useParams();
  const { user } = useAuth();
  const crewId = user?.crewId;

  const shoot = useMemo(() => getAdminShootById(shootId), [shootId]);
  const canView = useMemo(
    () => (!shoot ? false : isShootVisibleToCrew(shoot, crewId)),
    [crewId, shoot],
  );

  useEffect(() => {
    if (shoot && canView) {
      const t = setTimeout(() => window.print(), 200);
      return () => clearTimeout(t);
    }
  }, [shoot, canView]);

  if (user?.role === UserRole.STAFF && !crewId) {
    return (
      <div className="min-h-screen bg-zinc-950 p-6 text-sm text-zinc-300 print:bg-white print:text-zinc-900">
        <p>Profile not loaded. Return to the dashboard and try again.</p>
        <Link to="/hq/staff" className="text-white underline print:text-zinc-900">
          Back
        </Link>
      </div>
    );
  }

  if (!shoot || !canView) {
    return (
      <div className="min-h-screen bg-zinc-950 p-6 text-sm text-zinc-300 print:bg-white print:text-zinc-900">
        <p>Call sheet not found or you do not have access.</p>
        <Link to="/hq/staff" className="text-white underline print:text-zinc-900">
          Back
        </Link>
      </div>
    );
  }

  const gear = shoot.gearItems?.length
    ? shoot.gearItems
    : (shoot.gearSummary ? [shoot.gearSummary] : []);

  return (
    <div className="min-h-screen bg-zinc-950 p-6 text-zinc-100 print:bg-white print:p-8 print:text-zinc-900">
      <div className="mb-4 flex print:hidden">
        <Link to="/hq/staff" className="text-sm text-zinc-400 hover:text-zinc-200">
          ← Back
        </Link>
        <span className="ml-auto text-xs text-zinc-500">This window is for printing. Use the browser print dialog.</span>
      </div>

      <header className="mb-6 border-b border-zinc-800 pb-4 print:border-zinc-300">
        <p className="text-xs font-medium uppercase tracking-widest text-zinc-500 print:text-zinc-600">Call sheet</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white print:text-zinc-900">{shoot.title}</h1>
        <p className="mt-1 text-sm text-zinc-400 print:text-zinc-600">{shoot.projectTitle}</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <h2 className="text-xs font-medium uppercase tracking-widest text-zinc-500 print:text-zinc-600">Date & time</h2>
          <p className="mt-1 text-base text-zinc-100 print:text-zinc-900">
            {shoot.date} · Call {shoot.callTime}
          </p>
        </div>
        <div>
          <h2 className="text-xs font-medium uppercase tracking-widest text-zinc-500 print:text-zinc-600">Location</h2>
          <p className="mt-1 text-base text-zinc-100 print:text-zinc-900">{shoot.location}</p>
        </div>
      </div>

      <section className="mt-6">
        <h2 className="text-xs font-medium uppercase tracking-widest text-zinc-500 print:text-zinc-600">Crew (sheet)</h2>
        <ul className="mt-2 list-inside list-disc text-sm text-zinc-200 print:text-zinc-800">
          {shoot.crew.map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ul>
      </section>

      {shoot.description ? (
        <section className="mt-6">
          <h2 className="text-xs font-medium uppercase tracking-widest text-zinc-500 print:text-zinc-600">Notes</h2>
          <p className="mt-2 text-sm text-zinc-200 print:text-zinc-800">{shoot.description}</p>
        </section>
      ) : null}

      <section className="mt-6">
        <h2 className="text-xs font-medium uppercase tracking-widest text-zinc-500 print:text-zinc-600">Gear</h2>
        <ul className="mt-2 list-inside list-disc text-sm text-zinc-200 print:text-zinc-800">
          {gear.map((g) => (
            <li key={g}>{g}</li>
          ))}
        </ul>
        {gear.length === 0 ? <p className="text-sm text-zinc-500">—</p> : null}
      </section>
    </div>
  );
}
