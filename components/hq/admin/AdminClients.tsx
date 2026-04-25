import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { MOCK_CLIENTS } from '../../../data/adminMock';
import { PROJECT_WIZARD_DRAFT_KEY } from './AdminProjectWizard';

const AdminClients: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const returnToProjects = params.get('returnTo') === 'projects';
  const hasWizardDraft = typeof window !== 'undefined' && !!sessionStorage.getItem(PROJECT_WIZARD_DRAFT_KEY);

  return (
    <div className="max-w-4xl space-y-4">
      {returnToProjects && hasWizardDraft && (
        <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-zinc-300">Project draft is saved. Return when client setup is done.</p>
          <button
            type="button"
            onClick={() => navigate('/hq/admin/projects')}
            className="rounded-md border border-zinc-600 px-3 py-1.5 text-xs font-bold text-zinc-200"
          >
            Return to Projects
          </button>
        </div>
      )}
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
