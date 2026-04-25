import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, KanbanSquare, ListFilter, Search } from 'lucide-react';
import { MOCK_ADMIN_PROJECTS, PROJECT_STAGE_ORDER } from '../../../data/adminMock';
import { useAuth } from '../../../lib/auth';
import { useAdminTheme } from '../../../lib/adminTheme';
import { hasProjectCapability } from '../../../lib/projectPermissions';
import type { AdminProject, ProjectStage } from '../../../types';
import { formatAdminDate, formatStage, stageClassForTheme } from './adminFormat';
import AdminProjectWizard from './AdminProjectWizard';

type ViewMode = 'list' | 'board' | 'calendar';

const SAVED_VIEWS_KEY = 'torp.projects.savedViews';

interface SavedView {
  id: string;
  label: string;
  q: string;
  stage: ProjectStage | 'all';
}

const AdminProjects: React.FC = () => {
  const { user } = useAuth();
  const { theme } = useAdminTheme();
  const isDark = theme === 'dark';
  const [q, setQ] = useState('');
  const [stage, setStage] = useState<ProjectStage | 'all'>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [savedViews, setSavedViews] = useState<SavedView[]>(() => {
    try {
      const raw = localStorage.getItem(SAVED_VIEWS_KEY);
      return raw ? (JSON.parse(raw) as SavedView[]) : [];
    } catch {
      return [];
    }
  });

  const persistSavedViews = (next: SavedView[]) => {
    setSavedViews(next);
    localStorage.setItem(SAVED_VIEWS_KEY, JSON.stringify(next));
  };

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return MOCK_ADMIN_PROJECTS.filter(
      (p) =>
        (!s ||
          p.title.toLowerCase().includes(s) ||
          p.clientName.toLowerCase().includes(s) ||
          p.packageLabel.toLowerCase().includes(s)) &&
        (stage === 'all' || p.stage === stage)
    );
  }, [q, stage]);

  const canBulkAssign = hasProjectCapability(user?.role, 'project.bulk.assign');
  const canBulkArchive = hasProjectCapability(user?.role, 'project.bulk.archive');
  const canMoveStage = hasProjectCapability(user?.role, 'project.stage.move');

  const groupedByStage = useMemo(
    () =>
      PROJECT_STAGE_ORDER.map((stageItem) => ({
        stage: stageItem,
        rows: rows.filter((item) => item.stage === stageItem),
      })),
    [rows]
  );

  const sortedByDate = useMemo(
    () => [...rows].sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    [rows]
  );

  const toggleSelection = (projectId: string) => {
    setSelectedIds((current) => (current.includes(projectId) ? current.filter((id) => id !== projectId) : [...current, projectId]));
  };

  const applyBulkAssign = () => {
    if (!canBulkAssign) return;
    setFeedback(selectedIds.length === 0 ? 'Select at least one project.' : `Assigned ${selectedIds.length} project(s).`);
    setSelectedIds([]);
  };

  const applyBulkArchive = () => {
    if (!canBulkArchive) return;
    setFeedback(selectedIds.length === 0 ? 'Select at least one project.' : `Archived ${selectedIds.length} project(s).`);
    setSelectedIds([]);
  };

  const applyBulkMoveToPost = () => {
    if (!canMoveStage) return;
    if (selectedIds.length === 0) {
      setFeedback('Select at least one project.');
      return;
    }
    selectedIds.forEach((id) => {
      const p = MOCK_ADMIN_PROJECTS.find((item) => item.id === id);
      if (p) p.stage = 'post';
    });
    setFeedback(`Moved ${selectedIds.length} project(s) to Post.`);
    setSelectedIds([]);
  };

  const saveCurrentView = () => {
    const label = window.prompt('Saved view name');
    if (!label?.trim()) return;
    const next = [
      ...savedViews,
      { id: `sv-${Date.now()}`, label: label.trim(), q, stage },
    ];
    persistSavedViews(next);
    setFeedback(`Saved view "${label.trim()}"`);
  };

  const applySavedView = (view: SavedView) => {
    setQ(view.q);
    setStage(view.stage);
    setFeedback(`Applied "${view.label}"`);
  };

  const removeSavedView = (id: string) => {
    persistSavedViews(savedViews.filter((view) => view.id !== id));
  };

  const renderProjectMeta = (p: AdminProject) => (
    <><p className={`text-sm ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>{p.clientName}</p><p className={`text-xs mt-1 ${isDark ? 'text-zinc-600' : 'text-zinc-500'}`}>{p.packageLabel}</p></>
  );

  return (
    <div className="max-w-6xl min-w-0 space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className={`text-xs font-mono uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>Projects</p>
          <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>All project profiles</h2>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto sm:min-w-[420px]">
          <div className="relative max-w-sm w-full">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} size={16} aria-hidden />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Filter by title, client, package…"
              className={`w-full rounded-lg border pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                isDark
                  ? 'border-zinc-800 bg-zinc-900/80 text-white placeholder:text-zinc-600 focus:ring-white/15 focus:border-zinc-600'
                  : 'border-zinc-300 bg-white text-zinc-900 placeholder:text-zinc-400 focus:ring-zinc-300/70 focus:border-zinc-400'
              }`}
            />
          </div>
          <button
            type="button"
            onClick={() => setWizardOpen(true)}
            className="rounded-lg bg-white text-black px-3 py-2 text-xs font-bold uppercase tracking-wide"
          >
            New Project
          </button>
        </div>
      </div>

      <div className={`rounded-xl border p-3 sm:p-4 space-y-3 ${isDark ? 'border-zinc-800 bg-zinc-900/30' : 'border-zinc-300 bg-white'}`}>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-bold uppercase ${
              viewMode === 'list'
                ? 'border-white bg-white text-black'
                : isDark
                  ? 'border-zinc-700 text-zinc-300 hover:border-zinc-500'
                  : 'border-zinc-300 text-zinc-700 hover:border-zinc-400'
            }`}
          >
            <ListFilter size={14} /> List
          </button>
          <button
            type="button"
            onClick={() => setViewMode('board')}
            className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-bold uppercase ${
              viewMode === 'board'
                ? 'border-white bg-white text-black'
                : isDark
                  ? 'border-zinc-700 text-zinc-300 hover:border-zinc-500'
                  : 'border-zinc-300 text-zinc-700 hover:border-zinc-400'
            }`}
          >
            <KanbanSquare size={14} /> Board
          </button>
          <button
            type="button"
            onClick={() => setViewMode('calendar')}
            className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-bold uppercase ${
              viewMode === 'calendar'
                ? 'border-white bg-white text-black'
                : isDark
                  ? 'border-zinc-700 text-zinc-300 hover:border-zinc-500'
                  : 'border-zinc-300 text-zinc-700 hover:border-zinc-400'
            }`}
          >
            <CalendarDays size={14} /> Calendar
          </button>
          <select
            value={stage}
            onChange={(e) => setStage(e.target.value as ProjectStage | 'all')}
            className={`ml-auto min-w-[180px] rounded-md border px-2.5 py-1.5 text-xs focus:outline-none ${isDark ? 'border-zinc-700 bg-zinc-900 text-zinc-200' : 'border-zinc-300 bg-white text-zinc-800'}`}
          >
            <option value="all">All stages</option>
            {PROJECT_STAGE_ORDER.map((item) => (
              <option key={item} value={item}>
                {formatStage(item)}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={saveCurrentView}
            className={`rounded-md border px-3 py-1.5 text-xs font-bold uppercase ${isDark ? 'border-zinc-700 text-zinc-300 hover:border-zinc-500' : 'border-zinc-300 text-zinc-700 hover:border-zinc-400'}`}
          >
            Save View
          </button>
        </div>

        {savedViews.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {savedViews.map((view) => (
              <div key={view.id} className={`inline-flex items-center gap-2 rounded-md border px-2 py-1 text-xs ${isDark ? 'border-zinc-700' : 'border-zinc-300'}`}>
                <button type="button" onClick={() => applySavedView(view)} className={isDark ? 'text-zinc-200 hover:text-white' : 'text-zinc-700 hover:text-zinc-900'}>
                  {view.label}
                </button>
                <button type="button" onClick={() => removeSavedView(view.id)} className={isDark ? 'text-zinc-500 hover:text-zinc-200' : 'text-zinc-500 hover:text-zinc-700'}>
                  x
                </button>
              </div>
            ))}
          </div>
        )}

        <div className={`flex flex-wrap items-center gap-2 rounded-lg border p-2 ${isDark ? 'border-zinc-800 bg-zinc-950/40' : 'border-zinc-300 bg-zinc-50'}`}>
          <span className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>{selectedIds.length} selected</span>
          <button
            type="button"
            disabled={!canBulkAssign}
            onClick={applyBulkAssign}
            className="rounded-md border border-zinc-700 px-2.5 py-1 text-xs text-zinc-200 disabled:opacity-40"
          >
            Bulk assign
          </button>
          <button
            type="button"
            disabled={!canMoveStage}
            onClick={applyBulkMoveToPost}
            className="rounded-md border border-zinc-700 px-2.5 py-1 text-xs text-zinc-200 disabled:opacity-40"
          >
            Move to Post
          </button>
          <button
            type="button"
            disabled={!canBulkArchive}
            onClick={applyBulkArchive}
            className="rounded-md border border-red-900/60 px-2.5 py-1 text-xs text-red-300 disabled:opacity-40"
          >
            Archive
          </button>
          {!canBulkArchive && <span className="text-[11px] text-zinc-500">Archive is Admin-only</span>}
        </div>

        {feedback && <p className="text-xs text-zinc-400">{feedback}</p>}
      </div>

      {viewMode === 'list' && (
        <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl overflow-hidden min-w-0">
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm text-left min-w-[760px]">
              <thead className="text-xs text-zinc-500 uppercase bg-zinc-950/80">
                <tr>
                  <th className="px-4 py-3 font-medium w-8" />
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
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(p.id)}
                        onChange={() => toggleSelection(p.id)}
                        className="accent-white"
                      />
                    </td>
                    <td className="px-4 py-3 text-white font-medium">{p.title}</td>
                    <td className="px-4 py-3 text-zinc-300">{p.clientName}</td>
                    <td className="px-4 py-3 text-zinc-500 max-w-xs truncate" title={p.packageLabel}>
                      {p.packageLabel}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] uppercase font-bold tracking-wide px-2 py-0.5 rounded ${stageClassForTheme(p.stage, theme)}`}>
                        {formatStage(p.stage)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-200">${p.budget.toLocaleString()}</td>
                    <td className="px-4 py-3 text-zinc-500">{formatAdminDate(p.dueDate)}</td>
                    <td className="px-4 py-3 text-zinc-400">{p.ownerName}</td>
                    <td className="px-4 py-3 text-right">
                      <Link to={`/hq/admin/projects/${p.id}`} className="text-xs font-bold text-white border border-zinc-700 rounded-md px-2.5 py-1 hover:bg-white hover:text-black transition-colors">
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="sm:hidden divide-y divide-zinc-800/70">
            {rows.map((p) => (
              <div key={p.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <label className="inline-flex items-center gap-2 text-sm text-zinc-200">
                    <input type="checkbox" checked={selectedIds.includes(p.id)} onChange={() => toggleSelection(p.id)} className="accent-white" />
                    <span className="font-medium">{p.title}</span>
                  </label>
                  <span className={`text-[10px] uppercase font-bold tracking-wide px-2 py-0.5 rounded ${stageClassForTheme(p.stage, theme)}`}>
                    {formatStage(p.stage)}
                  </span>
                </div>
                {renderProjectMeta(p)}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">${p.budget.toLocaleString()}</span>
                  <span className="text-zinc-500">{formatAdminDate(p.dueDate)}</span>
                  <Link to={`/hq/admin/projects/${p.id}`} className="rounded-md border border-zinc-700 px-2 py-1 text-zinc-200">
                    Open
                  </Link>
                </div>
              </div>
            ))}
          </div>
          {rows.length === 0 && <p className="p-6 text-sm text-zinc-500">No matches.</p>}
        </div>
      )}

      {viewMode === 'board' && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-3 min-w-0">
          <div className="overflow-x-auto">
            <div className="grid min-w-[860px] grid-cols-4 gap-3">
              {groupedByStage.map((group) => (
                <div key={group.stage} className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-2.5 space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wide text-zinc-400">
                    {formatStage(group.stage)} <span className="text-zinc-600">({group.rows.length})</span>
                  </p>
                  {group.rows.length === 0 && <p className="text-xs text-zinc-600">No projects</p>}
                  {group.rows.map((p) => (
                    <Link key={p.id} to={`/hq/admin/projects/${p.id}`} className="block rounded-md border border-zinc-800 bg-zinc-900 p-2 hover:border-zinc-600">
                      <p className="text-sm text-white">{p.title}</p>
                      <p className="text-xs text-zinc-500 mt-1">{p.clientName}</p>
                    </Link>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {viewMode === 'calendar' && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 divide-y divide-zinc-800/80">
          {sortedByDate.map((p) => (
            <div key={p.id} className="p-3 sm:p-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-white font-medium">{p.title}</p>
                <p className="text-xs text-zinc-500 mt-1">{p.clientName}</p>
                <p className="text-xs text-zinc-600 mt-1">Due {formatAdminDate(p.dueDate)}</p>
              </div>
              <Link to={`/hq/admin/projects/${p.id}`} className="rounded-md border border-zinc-700 px-2.5 py-1 text-xs text-zinc-200">
                Open
              </Link>
            </div>
          ))}
          {sortedByDate.length === 0 && <p className="p-4 text-sm text-zinc-500">No projects in this range.</p>}
        </div>
      )}

      <AdminProjectWizard open={wizardOpen} onClose={() => setWizardOpen(false)} onCreated={() => setFeedback('Project created successfully.')} />
    </div>
  );
};

export default AdminProjects;
