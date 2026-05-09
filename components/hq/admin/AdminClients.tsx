import React, { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { MOCK_CLIENTS } from '../../../data/adminMock';
import { createClient, deleteClient, updateClient } from '../../../data/adminProjectsApi';
import { PROJECT_WIZARD_DRAFT_KEY } from './AdminProjectWizard';
import AdminFormDrawer from './AdminFormDrawer';
import { useAdminTheme } from '../../../lib/adminTheme';
import { appInputClass, appLinkMutedClass, appPanelClass } from '../../../lib/appThemeClasses';
import type { ClientProfile } from '../../../types';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ClientProfile['clientStatus']>('all');
  const [listVersion, setListVersion] = useState(0);

  const filteredClients = useMemo(() => {
    return MOCK_CLIENTS.filter((c) => {
      const t = searchQuery.trim().toLowerCase();
      if (t) {
        const blob = `${c.company} ${c.name} ${c.email} ${c.billingEmail}`.toLowerCase();
        if (!blob.includes(t)) return false;
      }
      if (statusFilter !== 'all' && c.clientStatus !== statusFilter) return false;
      return true;
    });
  }, [searchQuery, statusFilter, listVersion]);

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

  const onDeleteClient = (c: ClientProfile) => {
    if (
      !window.confirm(
        `Delete ${c.company}? This cannot be undone. Clients linked to projects cannot be removed until those links are cleared.`
      )
    ) {
      return;
    }
    const r = deleteClient(c.id);
    if (r.ok === false) {
      setError(r.error);
      return;
    }
    setListVersion((n) => n + 1);
    if (editingClientId === c.id) {
      closeDrawer();
    }
  };

  return (
    <div className="max-w-4xl space-y-4 min-w-0">
      {returnToProjects && hasWizardDraft && (
        <div
          className={`rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 min-w-0 ${appPanelClass(
            isDark
          )}`}
        >
          <p className={`text-sm ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
            Project draft is saved. Return when client setup is done.
          </p>
          <button
            type="button"
            onClick={() => navigate('/hq/admin/projects')}
            className={
              isDark
                ? 'rounded-md border border-zinc-600 px-3 py-1.5 text-xs font-bold text-zinc-200'
                : 'rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-bold text-zinc-800'
            }
          >
            Return to Projects
          </button>
        </div>
      )}
      <div data-tour="clients-header">
        <p className="text-xs font-mono uppercase text-zinc-500">Clients</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0">
          <h2 className={`text-xl font-bold min-w-0 ${isDark ? 'text-white' : 'text-zinc-900'}`}>Client profiles</h2>
          <button
            type="button"
            onClick={openCreateDrawer}
            className={
              isDark
                ? 'w-full sm:w-auto rounded-md border border-zinc-700 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-zinc-200 shrink-0'
                : 'w-full sm:w-auto rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-zinc-800 shrink-0'
            }
          >
            Quick Add Client
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end min-w-0" data-tour="clients-filters">
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search company, name, or email"
          className={appInputClass(isDark)}
          aria-label="Search clients"
        />
        <label className="text-xs text-zinc-500 flex flex-col gap-0.5 sm:min-w-[150px]">
          Relationship
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className={
              isDark
                ? 'rounded-md border border-zinc-700 bg-zinc-900/40 px-2 py-1.5 text-sm text-zinc-200'
                : 'rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900'
            }
          >
            <option value="all">All</option>
            <option value="prospect">Prospect</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
          </select>
        </label>
        {(searchQuery || statusFilter !== 'all') && (
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('all');
            }}
            className={`text-xs underline self-start sm:mb-1 ${appLinkMutedClass(isDark)}`}
          >
            Clear
          </button>
        )}
      </div>

      {error && !drawerOpen && <p className="text-sm text-rose-300">{error}</p>}

      <ul className="space-y-3 min-w-0" data-tour="clients-list">
        {filteredClients.length === 0 ? (
          <li className="text-sm text-zinc-500">No clients match the current filters.</li>
        ) : (
          filteredClients.map((c) => (
            <li
              key={c.id}
              className={`rounded-xl p-4 flex flex-col sm:flex-row sm:justify-between gap-3 min-w-0 ${appPanelClass(
                isDark
              )}`}
            >
              <div className="min-w-0">
                <p className={`font-bold break-words ${isDark ? 'text-white' : 'text-zinc-900'}`}>{c.company}</p>
                <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>{c.name}</p>
                <p className="text-xs text-zinc-500 mt-1 break-words">
                  {c.email} · {c.phone}
                  {c.city && ` · ${c.city}`}
                </p>
                <p className="text-[10px] uppercase text-zinc-600 mt-1">{c.clientStatus}</p>
                {c.notes && <p className="text-sm text-zinc-500 mt-2 break-words">{c.notes}</p>}
              </div>
              <div className="text-xs text-zinc-500 flex flex-col items-start sm:items-end gap-1 shrink-0">
                <span>Projects</span>
                {c.projectIds.map((pid) => (
                  <Link
                    key={pid}
                    to={`/hq/admin/projects/${pid}`}
                    className={isDark ? 'text-zinc-300 hover:text-white' : 'text-zinc-700 hover:text-zinc-900'}
                  >
                    {pid}
                  </Link>
                ))}
                <div className="flex flex-wrap gap-1.5 mt-1">
                  <button
                    type="button"
                    onClick={() => openEditDrawer(c.id)}
                    className="rounded-md border border-zinc-700 px-2 py-1 text-[11px] uppercase tracking-wide text-zinc-300 hover:text-white"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteClient(c)}
                    className="rounded-md border border-rose-900/50 px-2 py-1 text-[11px] uppercase tracking-wide text-rose-200/90 hover:text-rose-100"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))
        )}
      </ul>
      <div data-tour="clients-drawer">
      <AdminFormDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        title={editingClientId ? 'Edit Client' : 'Quick Add Client'}
        subtitle="Create a client profile for project setup"
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={closeDrawer}
              className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                const result = editingClientId
                  ? updateClient(editingClientId, newClient)
                  : createClient(newClient, { quick: true });
                if (!result.ok) {
                  setError('error' in result ? result.error : 'Could not create client.');
                  return;
                }
                setListVersion((n) => n + 1);
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
    </div>
  );
};

export default AdminClients;
