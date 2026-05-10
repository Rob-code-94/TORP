import { useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { getAdminShootById } from '../../data/hqOrgRead';
import { useHqOrgTick } from '../hq/HqFirestoreProvider';
import { isShootVisibleToCrew } from '../../lib/staffShoots';
import { UserRole } from '../../types';
import { useAdminTheme } from '../../lib/adminTheme';

/**
 * Print-only call sheet. Opens from StaffView; auto-invokes print dialog when ready.
 */
export default function CallSheetPrintView() {
  const { shootId = '' } = useParams();
  const { user } = useAuth();
  const { theme } = useAdminTheme();
  const isDark = theme === 'dark';
  const crewId = user?.crewId;
  const hqTick = useHqOrgTick();

  const shoot = useMemo(() => getAdminShootById(shootId), [shootId, hqTick]);
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

  const screenShell = isDark
    ? 'min-h-screen bg-zinc-950 p-6 text-sm text-zinc-300'
    : 'min-h-screen bg-zinc-50 p-6 text-sm text-zinc-800';
  const linkClass = isDark
    ? 'text-white underline print:text-zinc-900'
    : 'text-zinc-900 underline print:text-zinc-900';

  if (user?.role === UserRole.STAFF && !crewId) {
    return (
      <div className={`${screenShell} print:bg-white print:text-zinc-900`}>
        <p>Profile not loaded. Return to the dashboard and try again.</p>
        <Link to="/hq/staff" className={linkClass}>
          Back
        </Link>
      </div>
    );
  }

  if (!shoot || !canView) {
    return (
      <div className={`${screenShell} print:bg-white print:text-zinc-900`}>
        <p>Call sheet not found or you do not have access.</p>
        <Link to="/hq/staff" className={linkClass}>
          Back
        </Link>
      </div>
    );
  }

  const gear = shoot.gearItems?.length
    ? shoot.gearItems
    : (shoot.gearSummary ? [shoot.gearSummary] : []);

  return (
    <div
      className={`min-h-screen p-6 print:bg-white print:p-8 print:text-zinc-900 ${
        isDark ? 'bg-zinc-950 text-zinc-100' : 'bg-zinc-50 text-zinc-900'
      }`}
    >
      <div className="mb-4 flex print:hidden">
        <Link
          to="/hq/staff"
          className={isDark ? 'text-sm text-zinc-400 hover:text-zinc-200' : 'text-sm text-zinc-600 hover:text-zinc-900'}
        >
          ← Back
        </Link>
        <span
          className={`ml-auto text-xs print:hidden ${
            isDark ? 'text-zinc-500' : 'text-zinc-500'
          }`}
        >
          This window is for printing. Use the browser print dialog.
        </span>
      </div>

      <header
        className={`mb-6 border-b pb-4 print:border-zinc-300 ${
          isDark ? 'border-zinc-800' : 'border-zinc-200'
        }`}
      >
        <p className="text-xs font-medium uppercase tracking-widest text-zinc-500 print:text-zinc-600">Call sheet</p>
        <h1
          className={`mt-1 text-2xl font-semibold tracking-tight print:text-zinc-900 ${
            isDark ? 'text-white' : 'text-zinc-900'
          }`}
        >
          {shoot.title}
        </h1>
        <p className="mt-1 text-sm text-zinc-500 print:text-zinc-600">{shoot.projectTitle}</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <h2 className="text-xs font-medium uppercase tracking-widest text-zinc-500 print:text-zinc-600">Date & time</h2>
          <p
            className={`mt-1 text-base print:text-zinc-900 ${
              isDark ? 'text-zinc-100' : 'text-zinc-800'
            }`}
          >
            {shoot.date} · Call {shoot.callTime}
          </p>
        </div>
        <div>
          <h2 className="text-xs font-medium uppercase tracking-widest text-zinc-500 print:text-zinc-600">Location</h2>
          <p
            className={`mt-1 text-base print:text-zinc-900 ${
              isDark ? 'text-zinc-100' : 'text-zinc-800'
            }`}
          >
            {shoot.location}
          </p>
        </div>
      </div>

      <section className="mt-6">
        <h2 className="text-xs font-medium uppercase tracking-widest text-zinc-500 print:text-zinc-600">Crew (sheet)</h2>
        <ul
          className={`mt-2 list-inside list-disc text-sm print:text-zinc-800 ${
            isDark ? 'text-zinc-200' : 'text-zinc-800'
          }`}
        >
          {shoot.crew.map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ul>
      </section>

      {shoot.description ? (
        <section className="mt-6">
          <h2 className="text-xs font-medium uppercase tracking-widest text-zinc-500 print:text-zinc-600">Notes</h2>
          <p
            className={`mt-2 text-sm print:text-zinc-800 ${
              isDark ? 'text-zinc-200' : 'text-zinc-800'
            }`}
          >
            {shoot.description}
          </p>
        </section>
      ) : null}

      <section className="mt-6">
        <h2 className="text-xs font-medium uppercase tracking-widest text-zinc-500 print:text-zinc-600">Gear</h2>
        <ul
          className={`mt-2 list-inside list-disc text-sm print:text-zinc-800 ${
            isDark ? 'text-zinc-200' : 'text-zinc-800'
          }`}
        >
          {gear.map((g) => (
            <li key={g}>{g}</li>
          ))}
        </ul>
        {gear.length === 0 ? <p className="text-sm text-zinc-500">—</p> : null}
      </section>
    </div>
  );
}
