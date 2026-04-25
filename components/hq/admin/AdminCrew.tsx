import React from 'react';
import { Link } from 'react-router-dom';
import { MOCK_CREW } from '../../../data/adminMock';

const AdminCrew: React.FC = () => {
  return (
    <div className="max-w-4xl space-y-4">
      <div>
        <p className="text-xs font-mono uppercase text-zinc-500">Crew</p>
        <h2 className="text-xl font-bold text-white">Directory &amp; rates (mock)</h2>
      </div>
      <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead className="text-xs text-zinc-500 uppercase border-b border-zinc-800 bg-zinc-950/60">
            <tr>
              <th className="text-left px-3 py-2">Name</th>
              <th className="text-left px-3 py-2">Role</th>
              <th className="text-right px-3 py-2">Shoot $/hr</th>
              <th className="text-right px-3 py-2">Edit $/hr</th>
              <th className="text-left px-3 py-2">Availability</th>
              <th className="text-left px-3 py-2">Projects</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/80">
            {MOCK_CREW.map((c) => (
              <tr key={c.id} className="text-zinc-200">
                <td className="px-3 py-2.5 font-medium text-white">{c.displayName}</td>
                <td className="px-3 py-2.5 text-zinc-500">{c.role}</td>
                <td className="px-3 py-2.5 text-right font-mono text-xs">{c.rateShootHour}</td>
                <td className="px-3 py-2.5 text-right font-mono text-xs">{c.rateEditHour}</td>
                <td className="px-3 py-2.5 text-zinc-500 text-xs max-w-xs">{c.availability}</td>
                <td className="px-3 py-2.5 text-xs text-zinc-500">
                  {c.assignedProjectIds.map((pid) => (
                    <Link
                      key={pid}
                      to={`/hq/admin/projects/${pid}`}
                      className="mr-2 text-zinc-500 hover:text-white"
                    >
                      {pid}
                    </Link>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminCrew;
