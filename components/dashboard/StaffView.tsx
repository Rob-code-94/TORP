import React, { useMemo } from 'react';
import { MOCK_SCHEDULE } from '../../constants';
import { MOCK_ADMIN_PROJECTS, MOCK_CREW, MOCK_PLANNER } from '../../data/adminMock';
import { useAuth } from '../../lib/auth';
import type { PlannerItem } from '../../types';
import { MapPin, Clock, FileText, CheckSquare, Shield, ClipboardList, User } from 'lucide-react';

function taskAssignedToCrew(task: PlannerItem, crewId: string): boolean {
  if (task.assigneeCrewIds?.includes(crewId)) return true;
  return task.assigneeCrewId === crewId;
}

const StaffView: React.FC = () => {
  const { user } = useAuth();
  const crewId = user?.crewId ?? null;
  const crewProfile = useMemo(() => (crewId ? MOCK_CREW.find((c) => c.id === crewId) : undefined), [crewId]);

  const myTasks = useMemo(() => {
    if (!crewId) return [];
    return MOCK_PLANNER.filter((t) => taskAssignedToCrew(t, crewId) && !t.done);
  }, [crewId]);

  const myProjects = useMemo(() => {
    if (!crewId) return [];
    return MOCK_ADMIN_PROJECTS.filter(
      (p) => p.ownerCrewId === crewId || (p.assignedCrewIds || []).includes(crewId)
    );
  }, [crewId]);

  return (
    <div className="max-w-4xl min-w-0 space-y-10">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">My work</h2>
        <p className="text-zinc-500 text-sm">Planner assignments and profile from the crew directory (mock).</p>
      </div>

      {!crewId && (
        <div className="rounded-xl border border-amber-900/50 bg-amber-950/30 px-4 py-3 text-sm text-amber-100/90">
          No crew profile is linked to this session. Use <strong>Continue as Crew</strong> on HQ login or sign in with{' '}
          <span className="font-mono text-xs">staff@torp.life</span> to load demo assignments.
        </div>
      )}

      {crewProfile && (
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5 min-w-0">
          <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3 flex items-center gap-2">
            <User size={14} /> Profile
          </h3>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <p className="text-lg font-semibold text-white">{crewProfile.displayName}</p>
              <p className="text-sm text-zinc-400 mt-1">
                Craft: <span className="text-zinc-200">{crewProfile.role}</span>
                <span className="text-zinc-600 mx-2">·</span>
                HQ: <span className="text-zinc-200">{crewProfile.systemRole}</span>
              </p>
              <p className="text-sm text-zinc-500 mt-1">{crewProfile.email}</p>
            </div>
            <div className="text-sm text-zinc-400 shrink-0">
              <p className="text-zinc-500 text-[11px] uppercase tracking-wide mb-1">Availability</p>
              <p className="text-zinc-300">{crewProfile.availability}</p>
            </div>
          </div>
        </section>
      )}

      {crewId && (
        <section className="min-w-0">
          <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3 flex items-center gap-2">
            <ClipboardList size={14} /> My assignments
          </h3>
          {myTasks.length === 0 ? (
            <p className="text-sm text-zinc-500">No open planner tasks assigned to you in the mock data.</p>
          ) : (
            <ul className="space-y-2">
              {myTasks.map((t) => (
                <li
                  key={t.id}
                  className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 min-w-0"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-white truncate">{t.title}</p>
                    <p className="text-xs text-zinc-500 truncate">
                      {t.projectTitle} · {t.clientName}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 text-xs text-zinc-400">
                    <span className="font-mono">{t.dueDate}</span>
                    <span className="uppercase text-[10px] tracking-wide text-zinc-500">{t.column}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {crewId && myProjects.length > 0 && (
        <section className="min-w-0">
          <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3">My projects</h3>
          <ul className="space-y-2">
            {myProjects.map((p) => (
              <li key={p.id} className="text-sm text-zinc-300">
                <span className="font-medium text-white">{p.title}</span>
                <span className="text-zinc-600"> — {p.clientName}</span>
                <span className="ml-2 font-mono text-[11px] text-zinc-600">{p.id}</span>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-zinc-600 mt-2">
            Full project HQ views stay under admin routes; crew shell focuses on execution here.
          </p>
        </section>
      )}

      <div>
        <h3 className="text-xl font-bold text-white mb-2">Call sheets</h3>
        <p className="text-zinc-500 text-sm mb-6">Upcoming productions and gear requirements (demo).</p>

        <div className="space-y-6">
          {MOCK_SCHEDULE.map((shoot) => (
            <div key={shoot.id} className="bg-zinc-900/30 border border-zinc-800 rounded-xl overflow-hidden min-w-0">
              <div className="p-6 border-b border-zinc-800 flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <span className="bg-white text-black text-xs font-bold px-2 py-0.5 rounded uppercase shrink-0">Confirmed</span>
                    <h3 className="text-xl font-bold text-white">{shoot.title}</h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-sm text-zinc-400 mt-3">
                    <div className="flex items-center gap-2">
                      <Clock size={16} />
                      {shoot.date}
                    </div>
                    <div className="flex items-center gap-2 min-w-0">
                      <MapPin size={16} className="shrink-0" />
                      <span className="truncate">{shoot.location}</span>
                    </div>
                  </div>
                </div>
                <div className="shrink-0">
                  <button
                    type="button"
                    className="w-full sm:w-auto bg-white hover:bg-zinc-200 text-black px-4 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                  >
                    <FileText size={16} />
                    Download PDF
                  </button>
                </div>
              </div>

              <div className="p-6 bg-zinc-950/30 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
                    <Shield size={14} /> Crew manifest
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {shoot.crew.map((member, i) => (
                      <div key={i} className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-3 py-2 rounded-lg">
                        <div className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center text-[10px] text-white font-bold">
                          {member.charAt(0)}
                        </div>
                        <span className="text-sm text-zinc-300">{member}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
                    <CheckSquare size={14} /> Gear checklist (automated)
                  </h4>
                  <ul className="space-y-2 text-sm text-zinc-400">
                    <li className="flex items-center gap-2">
                      <input type="checkbox" checked readOnly className="accent-white bg-zinc-800 border-zinc-700 rounded" />
                      <span>RED Komodo-X (Pkg A)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <input type="checkbox" className="accent-white bg-zinc-800 border-zinc-700 rounded" />
                      <span>Atlas Orion Anamorphic Set</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <input type="checkbox" className="accent-white bg-zinc-800 border-zinc-700 rounded" />
                      <span>Teradek Bolt 6 Set</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StaffView;
