import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { MOCK_ADMIN_PROJECTS } from '../../../data/adminMock';
import { formatStage, stageClass } from './adminFormat';

const AdminProjects: React.FC = () => {
  const [q, setQ] = useState('');

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return MOCK_ADMIN_PROJECTS;
    return MOCK_ADMIN_PROJECTS.filter(
      (p) =>
        p.title.toLowerCase().includes(s) ||
        p.clientName.toLowerCase().includes(s) ||
        p.packageLabel.toLowerCase().includes(s)
    );
  }, [q]);

  return (
    <div className="max-w-6xl min-w-0 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-widest text-zinc-500">Projects</p>
          <h2 className="text-xl font-bold text-white">All project profiles</h2>
        </div>
        <div className="relative max-w-sm w-full">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
            size={16}
            aria-hidden
          />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter by title, client, package…"
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900/80 pl-9 pr-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-white/15 focus:border-zinc-600"
          />
        </div>
      </div>

      <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl overflow-hidden min-w-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left min-w-[680px]">
            <thead className="text-xs text-zinc-500 uppercase bg-zinc-950/80">
              <tr>
                <th className="px-4 py-3 font-medium">Project</th>
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Package</th>
                <th className="px-4 py-3 font-medium">Stage</th>
                <th className="px-4 py-3 font-medium text-right">Budget</th>
                <th className="px-4 py-3 font-medium">Due</th>
                <th className="px-4 py-3 font-medium">Owner</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80">
              {rows.map((p) => (
                <tr key={p.id} className="hover:bg-zinc-900/40 transition-colors">
                  <td className="px-4 py-3 text-white font-medium">{p.title}</td>
                  <td className="px-4 py-3 text-zinc-300">{p.clientName}</td>
                  <td className="px-4 py-3 text-zinc-500 max-w-xs truncate" title={p.packageLabel}>
                    {p.packageLabel}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] uppercase font-bold tracking-wide px-2 py-0.5 rounded ${stageClass(p.stage)}`}>
                      {formatStage(p.stage)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-200">
                    ${p.budget.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-zinc-500">{p.dueDate}</td>
                  <td className="px-4 py-3 text-zinc-400">{p.ownerName}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/hq/admin/projects/${p.id}`}
                      className="text-xs font-bold text-white border border-zinc-700 rounded-md px-2.5 py-1 hover:bg-white hover:text-black transition-colors"
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && <p className="p-6 text-sm text-zinc-500">No matches.</p>}
      </div>
    </div>
  );
};

export default AdminProjects;
