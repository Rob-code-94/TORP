import React from 'react';
import { Link } from 'react-router-dom';
import { MOCK_CLIENTS } from '../../../data/adminMock';

const AdminClients: React.FC = () => {
  return (
    <div className="max-w-4xl space-y-4">
      <div>
        <p className="text-xs font-mono uppercase text-zinc-500">Clients</p>
        <h2 className="text-xl font-bold text-white">Client profiles (mock)</h2>
      </div>
      <ul className="space-y-3">
        {MOCK_CLIENTS.map((c) => (
          <li
            key={c.id}
            className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4 flex flex-col sm:flex-row sm:justify-between gap-3"
          >
            <div>
              <p className="text-white font-bold">{c.company}</p>
              <p className="text-sm text-zinc-400">{c.name}</p>
              <p className="text-xs text-zinc-500 mt-1">
                {c.email} · {c.phone}
                {c.city && ` · ${c.city}`}
              </p>
              {c.notes && <p className="text-sm text-zinc-500 mt-2">{c.notes}</p>}
            </div>
            <div className="text-xs text-zinc-500 flex flex-col items-start sm:items-end gap-1">
              <span>Projects</span>
              {c.projectIds.map((pid) => (
                <Link key={pid} to={`/hq/admin/projects/${pid}`} className="text-zinc-300 hover:text-white">
                  {pid}
                </Link>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AdminClients;
