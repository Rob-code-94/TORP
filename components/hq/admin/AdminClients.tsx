import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { MOCK_CLIENTS } from '../../../data/adminMock';
import { createClient, updateClient } from '../../../data/adminProjectsApi';
import { PROJECT_WIZARD_DRAFT_KEY } from './AdminProjectWizard';
import AdminFormDrawer from './AdminFormDrawer';
import { useAdminTheme } from '../../../lib/adminTheme';
import ClientProfileForm, { EMPTY_CLIENT_PROFILE_DRAFT, type ClientProfileDraft } from './ClientProfileForm';

const AdminClients: React.FC = () => {
  const { theme } = useAdminTheme();
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const returnToProjects = params.get('returnTo') === 'projects';
  const hasWizardDraft = typeof window !== 'undefined' && !!sessionStorage.getItem(PROJECT_WIZARD_DRAFT_KEY);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newClient, setNewClient] = useState<ClientProfileDraft>(EMPTY_CLIENT_PROFILE_DRAFT);

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditingClientId(null);
    setError(null);
    setNewClient(EMPTY_CLIENT_PROFILE_DRAFT);
  };

  const openCreateDrawer = () => {
    setDrawerOpen(true);
    setEditingClientId(null);
    setError(null);
    setNewClient(EMPTY_CLIENT_PROFILE_DRAFT);
  };

  const openEditDrawer = (clientId: string) => {
    const client = MOCK_CLIENTS.find((item) => item.id === clientId);
    if (!client) return;
    setNewClient({
      company: client.company,
      name: client.name,
      email: client.email,
      phone: client.phone,
      billingEmail: client.billingEmail,
      billingContactName: client.billingContactName,
      addressCity: client.addressCity,
      addressState: client.addressState,
      addressPostal: client.addressPostal,
      addressCountry: client.addressCountry,
      preferredCommunication: client.preferredCommunication,
      timezone: client.timezone,
      clientStatus: client.clientStatus,
      notes: client.notes || '',
    });
    setEditingClientId(client.id);
    setDrawerOpen(true);
    setError(null);
  };

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
        <div className="flex items-center justify-between gap-2">
          <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>Client profiles (mock)</h2>
          <button type="button" onClick={openCreateDrawer} className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-zinc-200">
            Quick Add Client
          </button>
        </div>
      </div>
      <ul className="space-y-3">
        {MOCK_CLIENTS.map((c) => (
          <li key={c.id} className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4 flex flex-col sm:flex-row sm:justify-between gap-3">
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
              <button
                type="button"
                onClick={() => openEditDrawer(c.id)}
                className="mt-1 rounded-md border border-zinc-700 px-2 py-1 text-[11px] uppercase tracking-wide text-zinc-300 hover:text-white"
              >
                Edit
              </button>
            </div>
          </li>
        ))}
      </ul>
      <AdminFormDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        title={editingClientId ? 'Edit Client' : 'Quick Add Client'}
        subtitle="Create a client profile for project setup"
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" onClick={closeDrawer} className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300">Cancel</button>
            <button
              type="button"
              onClick={() => {
                const result = editingClientId ? updateClient(editingClientId, newClient) : createClient(newClient);
                if (!result.ok) {
                  setError('error' in result ? result.error : 'Could not create client.');
                  return;
                }
                closeDrawer();
              }}
              className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-100"
            >
              {editingClientId ? 'Save Changes' : 'Save Client'}
            </button>
          </div>
        }
      >
        <ClientProfileForm value={newClient} onChange={setNewClient} />
        {error && <p className="text-xs text-red-300">{error}</p>}
      </AdminFormDrawer>
    </div>
  );
};

export default AdminClients;
