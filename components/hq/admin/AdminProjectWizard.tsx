import React, { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { MOCK_CLIENTS, MOCK_CREW, PROJECT_STAGE_ORDER } from '../../../data/adminMock';
import { createProject, type CreateProjectRequest } from '../../../data/adminProjectsApi';
import type { ProjectStage } from '../../../types';
import { formatAdminDate } from './adminFormat';

interface AdminProjectWizardProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

type Step = 1 | 2 | 3;

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

const AdminProjectWizard: React.FC<AdminProjectWizardProps> = ({ open, onClose, onCreated }) => {
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<CreateProjectRequest>(initial);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const selectedClient = useMemo(() => MOCK_CLIENTS.find((c) => c.id === form.clientId), [form.clientId]);
  const selectedOwner = useMemo(() => MOCK_CREW.find((c) => c.id === form.ownerCrewId), [form.ownerCrewId]);

  if (!open) return null;

  const closeAndReset = () => {
    setStep(1);
    setForm(initial);
    setError(null);
    setSaving(false);
    onClose();
  };

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
      <aside className="absolute right-0 top-0 h-full w-full sm:w-[520px] max-w-[100vw] border-l border-zinc-800 bg-zinc-950 flex flex-col">
        <div className="h-14 border-b border-zinc-800 px-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-zinc-500">New project</p>
            <h3 className="text-sm font-semibold text-white">Create project profile</h3>
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
              <label className="block text-xs text-zinc-400">
                Package / scope label
                <input
                  value={form.packageLabel}
                  onChange={(e) => setForm((v) => ({ ...v, packageLabel: e.target.value }))}
                  className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                />
              </label>
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
                  {PROJECT_STAGE_ORDER.map((stage) => (
                    <option key={stage} value={stage}>
                      {stage.replaceAll('_', ' ')}
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
                <input
                  type="number"
                  value={form.budget}
                  onChange={(e) => setForm((v) => ({ ...v, budget: Number(e.target.value || '0') }))}
                  className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                />
              </label>
              <label className="block text-xs text-zinc-400">
                Due date
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm((v) => ({ ...v, dueDate: e.target.value }))}
                  className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
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

        <div className="border-t border-zinc-800 p-3 sticky bottom-0 bg-zinc-950 flex items-center justify-between gap-2">
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
