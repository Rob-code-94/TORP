import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { MOCK_CLIENTS, MOCK_CREW, PROJECT_STAGE_ORDER } from '../../../data/adminMock';
import { createClient, createProject, type CreateProjectRequest } from '../../../data/adminProjectsApi';
import { adminDateTimeInputProps, useAdminTheme } from '../../../lib/adminTheme';
import type { ProjectStage } from '../../../types';
import { formatAdminDate, formatStage } from './adminFormat';
import ClientProfileForm, { EMPTY_CLIENT_PROFILE_DRAFT, type ClientProfileDraft } from './ClientProfileForm';

interface AdminProjectWizardProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  initialDraft?: CreateProjectRequest | null;
}

type Step = 1 | 2 | 3;

const PACKAGE_OPTIONS = [
  'Essentials (5h / 5 deliverables)',
  'Custom doc + 30s cutdowns',
  'Product + lookbook (custom)',
  'Podcast pack (1 ep)',
  'Campaign sprint',
  'Event coverage',
  'Social cutdown bundle',
];

const initial: CreateProjectRequest = {
  title: '',
  clientId: '',
  clientName: '',
  packageLabel: '',
  budget: 0,
  dueDate: '',
  ownerCrewId: '',
  ownerName: '',
  stage: 'inquiry',
};

export const PROJECT_WIZARD_DRAFT_KEY = 'torp.projects.wizardDraft';

const AdminProjectWizard: React.FC<AdminProjectWizardProps> = ({ open, onClose, onCreated, initialDraft }) => {
  const navigate = useNavigate();
  const { theme } = useAdminTheme();
  const isDark = theme === 'dark';
  const dateTimeInput = adminDateTimeInputProps(theme);
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<CreateProjectRequest>(initialDraft || initial);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [quickClientOpen, setQuickClientOpen] = useState(false);
  const [quickClient, setQuickClient] = useState<ClientProfileDraft>(EMPTY_CLIENT_PROFILE_DRAFT);
  const [customPackage, setCustomPackage] = useState('');
  const [budgetInput, setBudgetInput] = useState('0');

  const selectedClient = useMemo(() => MOCK_CLIENTS.find((c) => c.id === form.clientId), [form.clientId]);
  const selectedOwner = useMemo(() => MOCK_CREW.find((c) => c.id === form.ownerCrewId), [form.ownerCrewId]);

  useEffect(() => {
    if (open && initialDraft) {
      setForm(initialDraft);
      setBudgetInput(String(initialDraft.budget || 0));
    }
  }, [open, initialDraft]);

  if (!open) return null;

  const closeAndReset = () => {
    setStep(1);
    setForm(initial);
    setBudgetInput('0');
    setError(null);
    setSaving(false);
    onClose();
  };
  const updateBudget = (raw: string) => {
    const normalized = raw.replace(/[^\d]/g, '');
    const num = normalized ? Number(normalized) : 0;
    setBudgetInput(normalized);
    setForm((v) => ({ ...v, budget: num }));
  };


  const detourToClients = () => {
    sessionStorage.setItem(PROJECT_WIZARD_DRAFT_KEY, JSON.stringify(form));
    navigate('/hq/admin/clients?returnTo=projects');
  };

  const quickCreateClient = () => {
    const result = createClient(quickClient);
    if (!result.ok) {
      setError('error' in result ? result.error : 'Could not create client.');
      return;
    }
    setForm((current) => ({
      ...current,
      clientId: result.client.id,
      clientName: result.client.company,
    }));
    setQuickClientOpen(false);
    setQuickClient(EMPTY_CLIENT_PROFILE_DRAFT);
    setError(null);
  };

  const packageValue = PACKAGE_OPTIONS.includes(form.packageLabel) ? form.packageLabel : form.packageLabel ? '__custom__' : '';

  const goNext = () => {
    if (step === 1) {
      if (!form.title.trim() || !form.clientId) {
        setError('Project title and client are required.');
        return;
      }
    }
    if (step === 2) {
      if (!form.ownerCrewId || !form.dueDate) {
        setError('Owner and due date are required.');
        return;
      }
    }
    setError(null);
    setStep((Math.min(3, step + 1) as Step));
  };

  const submit = async () => {
    try {
      setSaving(true);
      setError(null);
      const payload: CreateProjectRequest = {
        ...form,
        clientName: selectedClient?.company || form.clientName,
        ownerName: selectedOwner?.displayName || form.ownerName,
      };
      createProject(payload);
      onCreated();
      closeAndReset();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create project.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50">
      <button type="button" onClick={closeAndReset} className="absolute inset-0 bg-black/70" aria-label="Close wizard" />
      <aside className={`absolute right-0 top-0 h-full w-full sm:w-[520px] max-w-[100vw] border-l flex flex-col ${isDark ? 'border-zinc-800 bg-zinc-950' : 'border-zinc-300 bg-white'}`}>
        <div className={`h-14 border-b px-4 flex items-center justify-between ${isDark ? 'border-zinc-800' : 'border-zinc-300'}`}>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-zinc-500">New project</p>
            <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-zinc-900'}`}>Create project profile</h3>
          </div>
          <button type="button" onClick={closeAndReset} className="p-1.5 rounded-md border border-zinc-800 text-zinc-400">
            <X size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-w-0">
          <div className="flex items-center gap-2 text-xs">
            {[1, 2, 3].map((idx) => (
              <div key={idx} className={`h-1.5 flex-1 rounded ${step >= idx ? 'bg-white' : 'bg-zinc-800'}`} />
            ))}
          </div>

          {step === 1 && (
            <div className="space-y-3">
              <label className="block text-xs text-zinc-400">
                Project title
                <input
                  value={form.title}
                  onChange={(e) => setForm((v) => ({ ...v, title: e.target.value }))}
                  className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                />
              </label>
              <label className="block text-xs text-zinc-400">
                Client
                <select
                  value={form.clientId}
                  onChange={(e) => setForm((v) => ({ ...v, clientId: e.target.value, clientName: MOCK_CLIENTS.find((c) => c.id === e.target.value)?.company || '' }))}
                  className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                >
                  <option value="">Select client</option>
                  {MOCK_CLIENTS.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.company}
                    </option>
                  ))}
                </select>
              </label>
              {MOCK_CLIENTS.length === 0 && (
                <p className="text-xs text-amber-300">
                  No clients found yet. Use Quick add client or create one in the Clients tab.
                </p>
              )}
              <div className="flex flex-wrap gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setQuickClientOpen((v) => !v)}
                  className={`rounded-md border px-2.5 py-1.5 ${isDark ? 'border-zinc-700 text-zinc-200' : 'border-zinc-300 text-zinc-700'}`}
                >
                  {quickClientOpen ? 'Cancel quick add' : 'Quick add client'}
                </button>
                <button
                  type="button"
                  onClick={detourToClients}
                  className={`rounded-md border px-2.5 py-1.5 ${isDark ? 'border-zinc-700 text-zinc-400' : 'border-zinc-300 text-zinc-600'}`}
                >
                  Create in Clients tab
                </button>
              </div>
              {quickClientOpen && (
                <div className={`rounded-lg border p-3 space-y-2 ${isDark ? 'border-zinc-800 bg-zinc-900/50' : 'border-zinc-300 bg-zinc-50'}`}>
                  <p className={`text-xs font-semibold ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>Quick Add Client</p>
                  <ClientProfileForm value={quickClient} onChange={setQuickClient} />
                  <button type="button" onClick={quickCreateClient} className="rounded-md bg-white text-black px-2.5 py-1.5 text-xs font-bold">
                    Save Client
                  </button>
                </div>
              )}
              <label className="block text-xs text-zinc-400">
                Package / scope label
                <select
                  value={packageValue}
                  onChange={(e) => {
                    const next = e.target.value;
                    if (next === '__custom__') {
                      setForm((v) => ({ ...v, packageLabel: customPackage }));
                      return;
                    }
                    setForm((v) => ({ ...v, packageLabel: next }));
                  }}
                  className={`mt-1 w-full rounded-md border px-3 py-2 text-sm ${
                    isDark ? 'border-zinc-700 bg-zinc-900 text-zinc-100' : 'border-zinc-300 bg-white text-zinc-900'
                  }`}
                >
                  <option value="">Select package</option>
                  {PACKAGE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                  <option value="__custom__">Custom package</option>
                </select>
              </label>
              {packageValue === '__custom__' && (
                <label className="block text-xs text-zinc-400">
                  Custom package label
                  <input
                    value={customPackage}
                    onChange={(e) => {
                      const next = e.target.value;
                      setCustomPackage(next);
                      setForm((v) => ({ ...v, packageLabel: next }));
                    }}
                    placeholder="Type package / scope label"
                    className={`mt-1 w-full rounded-md border px-3 py-2 text-sm ${
                      isDark ? 'border-zinc-700 bg-zinc-900 text-zinc-100' : 'border-zinc-300 bg-white text-zinc-900'
                    }`}
                  />
                </label>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <label className="block text-xs text-zinc-400">
                Stage
                <select
                  value={form.stage}
                  onChange={(e) => setForm((v) => ({ ...v, stage: e.target.value as ProjectStage }))}
                  className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                >
                  {PROJECT_STAGE_ORDER.filter((stage) => stage !== 'archived').map((stage) => (
                    <option key={stage} value={stage}>
                      {formatStage(stage)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs text-zinc-400">
                Owner
                <select
                  value={form.ownerCrewId}
                  onChange={(e) => setForm((v) => ({ ...v, ownerCrewId: e.target.value, ownerName: MOCK_CREW.find((c) => c.id === e.target.value)?.displayName || '' }))}
                  className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                >
                  <option value="">Select owner</option>
                  {MOCK_CREW.map((crew) => (
                    <option key={crew.id} value={crew.id}>
                      {crew.displayName}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs text-zinc-400">
                Budget (USD)
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">$</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={budgetInput}
                    onChange={(e) => updateBudget(e.target.value)}
                    className="w-full rounded-md border border-zinc-700 bg-zinc-900 pl-7 pr-3 py-2 text-sm text-zinc-100"
                  />
                </div>
              </label>
              <label className="block text-xs text-zinc-400">
                Due date
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm((v) => ({ ...v, dueDate: e.target.value }))}
                  style={dateTimeInput.style}
                  className={`mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 ${dateTimeInput.className}`}
                />
              </label>
            </div>
          )}

          {step === 3 && (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 text-sm space-y-2">
              <p className="text-zinc-100 font-medium">{form.title}</p>
              <p className="text-zinc-400">Client: {selectedClient?.company || '—'}</p>
              <p className="text-zinc-400">Owner: {selectedOwner?.displayName || '—'}</p>
              <p className="text-zinc-400">Stage: {form.stage.replaceAll('_', ' ')}</p>
              <p className="text-zinc-400">Budget: ${form.budget.toLocaleString()}</p>
              <p className="text-zinc-400">Due: {formatAdminDate(form.dueDate)}</p>
            </div>
          )}

          {error && <p className="text-xs text-red-300">{error}</p>}
        </div>

        <div className={`border-t p-3 sticky bottom-0 flex items-center justify-between gap-2 ${isDark ? 'border-zinc-800 bg-zinc-950' : 'border-zinc-300 bg-white'}`}>
          <button
            type="button"
            onClick={() => setStep((Math.max(1, step - 1) as Step))}
            disabled={step === 1 || saving}
            className="rounded-md border border-zinc-700 px-3 py-2 text-xs text-zinc-200 disabled:opacity-40"
          >
            Back
          </button>
          {step < 3 ? (
            <button type="button" onClick={goNext} className="rounded-md bg-white text-black px-3 py-2 text-xs font-bold">
              Continue
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={saving}
              className="rounded-md bg-white text-black px-3 py-2 text-xs font-bold disabled:opacity-50"
            >
              {saving ? 'Creating…' : 'Create Project'}
            </button>
          )}
        </div>
      </aside>
    </div>
  );
};

export default AdminProjectWizard;
