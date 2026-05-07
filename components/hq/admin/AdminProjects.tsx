import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, KanbanSquare, ListFilter, MoreVertical, Search } from 'lucide-react';
import { MOCK_ADMIN_PROJECTS, MOCK_CREW, PROJECT_STAGE_ORDER, transitionProjectStage } from '../../../data/adminMock';
import {
  archiveProject,
  archiveProjects,
  bulkAssignCrew,
  deleteProject,
  getProjectCascadeCounts,
} from '../../../data/adminProjectsApi';
import type { ProjectCascadeCounts } from '../../../data/adminProjectsApi';
import { useAuth } from '../../../lib/auth';
import { useAdminTheme } from '../../../lib/adminTheme';
import { hasProjectCapability } from '../../../lib/projectPermissions';
import type { AdminProject, ProjectStage } from '../../../types';
import { formatAdminDate, formatStage, stageClassForTheme } from './adminFormat';
import AdminProjectWizard from './AdminProjectWizard';
import { PROJECT_WIZARD_DRAFT_KEY } from './AdminProjectWizard';
import type { CreateProjectRequest } from '../../../data/adminProjectsApi';

type ViewMode = 'list' | 'board' | 'calendar';

const VIEW_MODE_KEY = 'torp.projects.viewMode';
const STAGE_FILTER_KEY = 'torp.projects.stageFilter';

const AdminProjects: React.FC = () => {
  const { user } = useAuth();
  const { theme } = useAdminTheme();
  const isDark = theme === 'dark';
  const [q, setQ] = useState('');
  const [stage, setStage] = useState<ProjectStage | 'all'>(() => {
    const raw = localStorage.getItem(STAGE_FILTER_KEY);
    if (
      raw === 'all' ||
      raw === 'inquiry' ||
      raw === 'scope' ||
      raw === 'estimate' ||
      raw === 'pre_production' ||
      raw === 'production' ||
      raw === 'post' ||
      raw === 'delivered' ||
      raw === 'archived'
    ) {
      return raw;
    }
    return 'all';
  });
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const raw = localStorage.getItem(VIEW_MODE_KEY);
    if (raw === 'list' || raw === 'board' || raw === 'calendar') return raw;
    return 'list';
  });
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardDraft, setWizardDraft] = useState<CreateProjectRequest | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<ProjectStage | null>(null);
  const [assignPickerOpen, setAssignPickerOpen] = useState(false);
  const [pickerCrewIds, setPickerCrewIds] = useState<string[]>([]);
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
  /** Bumps when archive/delete mutates `MOCK_ADMIN_PROJECTS` so memoized rows refresh. */
  const [version, setVersion] = useState(0);
  const [rowMenuId, setRowMenuId] = useState<string | null>(null);
  const [rowArchiveTarget, setRowArchiveTarget] = useState<AdminProject | null>(null);
  const [rowDeleteTarget, setRowDeleteTarget] = useState<AdminProject | null>(null);
  const [deleteCounts, setDeleteCounts] = useState<ProjectCascadeCounts | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

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
  }, [q, stage, version]);

  const canBulkAssign = hasProjectCapability(user?.role, 'project.bulk.assign');
  const canBulkArchive = hasProjectCapability(user?.role, 'project.bulk.archive');
  const canMoveStage = hasProjectCapability(user?.role, 'project.stage.move');
  const canArchive = hasProjectCapability(user?.role, 'project.archive');
  const canDelete = hasProjectCapability(user?.role, 'project.delete');
  const showRowMenu = canArchive || canDelete;

  const groupedByStage = useMemo(
    () => {
      const laneStages =
        stage === 'archived'
          ? (['archived'] as ProjectStage[])
          : PROJECT_STAGE_ORDER.filter((item) => item !== 'archived');
      return laneStages.map((stageItem) => ({
        stage: stageItem,
        rows: rows.filter((item) => item.stage === stageItem),
      }));
    },
    [rows, stage]
  );

  const sortedByDate = useMemo(
    () => [...rows].sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    [rows]
  );

  const toggleSelection = (projectId: string) => {
    setSelectedIds((current) => (current.includes(projectId) ? current.filter((id) => id !== projectId) : [...current, projectId]));
  };

  const openBulkAssignPicker = () => {
    if (!bulkMode || !canBulkAssign) return;
    if (selectedIds.length === 0) {
      setFeedback('Select at least one project.');
      return;
    }
    setPickerCrewIds([]);
    setAssignPickerOpen(true);
  };

  const confirmBulkAssign = () => {
    if (!canBulkAssign) return;
    if (pickerCrewIds.length === 0) {
      setFeedback('Pick at least one crew member.');
      return;
    }
    const result = bulkAssignCrew(selectedIds, pickerCrewIds, user?.displayName || 'System');
    setFeedback(
      result.ok
        ? `Assigned ${pickerCrewIds.length} crew to ${result.affected.length} project(s).`
        : `Assigned to ${result.affected.length} project(s); ${result.failed.length} failed.`
    );
    setAssignPickerOpen(false);
    setPickerCrewIds([]);
    setSelectedIds([]);
  };

  const requestBulkArchive = () => {
    if (!bulkMode || !canBulkArchive) return;
    if (selectedIds.length === 0) {
      setFeedback('Select at least one project.');
      return;
    }
    setArchiveConfirmOpen(true);
  };

  const confirmBulkArchive = () => {
    if (!canBulkArchive) return;
    const result = archiveProjects(selectedIds, user?.displayName || 'System');
    setFeedback(
      result.ok
        ? `Archived ${result.affected.length} project(s).`
        : `Archived ${result.affected.length} project(s); ${result.failed.length} failed.`
    );
    setArchiveConfirmOpen(false);
    setSelectedIds([]);
    setVersion((n) => n + 1);
  };

  const applyBulkMoveToPost = () => {
    if (!bulkMode) return;
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

  const renderProjectMeta = (p: AdminProject) => (
    <>
      <p className={`text-sm ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>{p.clientName}</p>
      <p className={`text-xs mt-1 ${isDark ? 'text-zinc-600' : 'text-zinc-500'}`}>{p.packageLabel}</p>
    </>
  );

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(PROJECT_WIZARD_DRAFT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as CreateProjectRequest;
      setWizardDraft(parsed);
      setWizardOpen(true);
      sessionStorage.removeItem(PROJECT_WIZARD_DRAFT_KEY);
      setFeedback('Restored project draft from Clients.');
    } catch {
      sessionStorage.removeItem(PROJECT_WIZARD_DRAFT_KEY);
    }
  }, []);

  useEffect(() => {
    setSelectedIds([]);
  }, [viewMode, q, stage]);

  useEffect(() => {
    localStorage.setItem(VIEW_MODE_KEY, viewMode);
  }, [viewMode]);

  useEffect(() => {
    localStorage.setItem(STAGE_FILTER_KEY, stage);
  }, [stage]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDraggingId(null);
        setDragOverStage(null);
        setRowMenuId(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const rowMenuRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!rowMenuId) return;
    const onClickAway = (event: MouseEvent) => {
      if (!rowMenuRef.current) return;
      if (rowMenuRef.current.contains(event.target as Node)) return;
      setRowMenuId(null);
    };
    document.addEventListener('mousedown', onClickAway);
    return () => document.removeEventListener('mousedown', onClickAway);
  }, [rowMenuId]);

  const openRowArchive = (project: AdminProject) => {
    setRowMenuId(null);
    if (!canArchive) return;
    setRowArchiveTarget(project);
  };

  const openRowDelete = (project: AdminProject) => {
    setRowMenuId(null);
    if (!canDelete) return;
    setRowDeleteTarget(project);
    setDeleteCounts(getProjectCascadeCounts(project.id));
    setDeleteConfirmText('');
  };

  const confirmRowArchive = () => {
    if (!rowArchiveTarget || !canArchive) return;
    const result = archiveProject(rowArchiveTarget.id, user?.displayName || 'System');
    setFeedback(
      result.ok
        ? `Archived ${rowArchiveTarget.title}.`
        : result.error || 'Could not archive project.'
    );
    setRowArchiveTarget(null);
    setVersion((n) => n + 1);
  };

  const confirmRowDelete = () => {
    if (!rowDeleteTarget || !canDelete) return;
    const expected = rowDeleteTarget.title.trim().toLowerCase();
    if (deleteConfirmText.trim().toLowerCase() !== expected) return;
    const result = deleteProject(rowDeleteTarget.id, user?.displayName || 'System');
    if (result.ok) {
      const total = result.counts
        ? Object.values(result.counts).reduce((a, b) => a + b, 0)
        : 0;
      setFeedback(`Deleted ${rowDeleteTarget.title} and ${total} related record(s).`);
    } else {
      setFeedback(result.error || 'Could not delete project.');
    }
    setRowDeleteTarget(null);
    setDeleteCounts(null);
    setDeleteConfirmText('');
    setVersion((n) => n + 1);
  };

  const onDropToStage = (targetStage: ProjectStage) => {
    if (!draggingId || !hasProjectCapability(user?.role, 'project.stage.move')) {
      setDraggingId(null);
      setDragOverStage(null);
      return;
    }
    const moved = MOCK_ADMIN_PROJECTS.find((item) => item.id === draggingId);
    const result = transitionProjectStage(draggingId, targetStage, user?.displayName || 'System');
    setFeedback(
      result.ok
        ? `Moved ${moved?.title || 'project'} to ${formatStage(targetStage)}.`
        : result.error || 'Unable to move project.'
    );
    setDraggingId(null);
    setDragOverStage(null);
  };

  return (
    <div className="max-w-6xl min-w-0 space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4" data-tour="projects-header">
        <div>
          <p className={`text-xs font-mono uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>Projects</p>
          <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>All project profiles</h2>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto sm:min-w-[420px]">
          <div className="relative max-w-sm w-full" data-tour="projects-search">
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
            className={`rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wide transition-colors ${
              isDark
                ? 'bg-white text-black hover:bg-zinc-200'
                : 'bg-zinc-900 text-white hover:bg-zinc-800'
            }`}
          >
            New Project
          </button>
        </div>
      </div>

      <div className={`rounded-xl border p-3 sm:p-4 space-y-3 ${isDark ? 'border-zinc-800 bg-zinc-900/30' : 'border-zinc-300 bg-white'}`}>
        <div className="flex flex-wrap gap-2" data-tour="projects-view-modes">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-bold uppercase ${
              viewMode === 'list'
                ? 'border-white bg-white text-black'
                : isDark
                  ? 'border-zinc-700 text-zinc-300 hover:border-zinc-500'
                  : 'border-zinc-300 bg-zinc-50 text-zinc-700 hover:border-zinc-400'
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
                  : 'border-zinc-300 bg-zinc-50 text-zinc-700 hover:border-zinc-400'
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
                  : 'border-zinc-300 bg-zinc-50 text-zinc-700 hover:border-zinc-400'
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
            onClick={() => {
              setBulkMode((current) => {
                const next = !current;
                if (!next) setSelectedIds([]);
                return next;
              });
            }}
            className={`rounded-md border px-3 py-1.5 text-xs font-bold uppercase ${
              bulkMode
                ? 'border-white bg-white text-black'
                : isDark
                  ? 'border-zinc-700 text-zinc-300 hover:border-zinc-500'
                  : 'border-zinc-300 text-zinc-700 hover:border-zinc-400'
            }`}
          >
            {bulkMode ? 'Exit Bulk Edit' : 'Bulk Edit'}
          </button>
        </div>

        {bulkMode && (
          <div className={`flex flex-wrap items-center gap-2 rounded-lg border p-2 ${isDark ? 'border-zinc-800 bg-zinc-950/40' : 'border-zinc-300 bg-zinc-50'}`}>
            <span className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>{selectedIds.length} selected</span>
            <button
              type="button"
              disabled={!canBulkAssign || selectedIds.length === 0}
              onClick={openBulkAssignPicker}
              title={selectedIds.length === 0 ? 'Select at least one project' : undefined}
              className={`rounded-md border px-2.5 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-40 ${
                isDark ? 'border-zinc-700 text-zinc-200' : 'border-zinc-300 text-zinc-700'
              }`}
            >
              Bulk assign
            </button>
            <button
              type="button"
              disabled={!canMoveStage}
              onClick={applyBulkMoveToPost}
              className={`rounded-md border px-2.5 py-1 text-xs disabled:opacity-40 ${
                isDark ? 'border-zinc-700 text-zinc-200' : 'border-zinc-300 text-zinc-700'
              }`}
            >
              Move to Post
            </button>
            <button
              type="button"
              disabled={!canBulkArchive || selectedIds.length === 0}
              onClick={requestBulkArchive}
              title={selectedIds.length === 0 ? 'Select at least one project' : undefined}
              className={`rounded-md border px-2.5 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-40 ${
                isDark ? 'border-red-900/60 text-red-300' : 'border-red-300 text-red-700'
              }`}
            >
              Archive
            </button>
            {!canBulkArchive && <span className={`text-[11px] ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>Archive is Admin-only</span>}
          </div>
        )}

        {feedback && <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>{feedback}</p>}
      </div>

      {viewMode === 'list' && (
        <div className={`rounded-xl overflow-hidden min-w-0 border ${isDark ? 'bg-zinc-900/30 border-zinc-800' : 'bg-white border-zinc-300 shadow-[0_1px_0_0_rgba(24,24,27,0.02)]'}`}>
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm text-left min-w-[760px]">
              <thead className={`text-xs uppercase ${isDark ? 'text-zinc-500 bg-zinc-950/80' : 'text-zinc-600 bg-zinc-100/90'}`}>
                <tr>
                  {bulkMode && <th className="px-4 py-3 font-medium w-8" />}
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
              <tbody className={isDark ? 'divide-y divide-zinc-800/80' : 'divide-y divide-zinc-200'}>
                {rows.map((p) => (
                  <tr key={p.id} className={`transition-colors ${isDark ? 'hover:bg-zinc-900/40' : 'hover:bg-zinc-50'}`}>
                    {bulkMode && (
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(p.id)}
                          onChange={() => toggleSelection(p.id)}
                          className={isDark ? 'accent-white' : 'accent-zinc-900'}
                        />
                      </td>
                    )}
                    <td className={`px-4 py-3 font-medium ${isDark ? 'text-white' : 'text-zinc-900'}`}>{p.title}</td>
                    <td className={`px-4 py-3 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>{p.clientName}</td>
                    <td className={`px-4 py-3 max-w-xs truncate ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`} title={p.packageLabel}>
                      {p.packageLabel}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] uppercase font-bold tracking-wide px-2 py-0.5 rounded ${stageClassForTheme(p.stage, theme)}`}>
                        {formatStage(p.stage)}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-right ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>${p.budget.toLocaleString()}</td>
                    <td className={`px-4 py-3 ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>{formatAdminDate(p.dueDate)}</td>
                    <td className={`px-4 py-3 ${isDark ? 'text-zinc-400' : 'text-zinc-700'}`}>{p.ownerName}</td>
                    <td className="px-4 py-3 text-right" data-tour="projects-open-detail">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          to={`/hq/admin/projects/${p.id}`}
                          className={`text-xs font-bold border rounded-md px-2.5 py-1 transition-colors ${
                            isDark
                              ? 'text-white border-zinc-700 hover:bg-white hover:text-black'
                              : 'text-zinc-800 border-zinc-300 hover:bg-zinc-900 hover:text-white hover:border-zinc-900'
                          }`}
                        >
                          Open
                        </Link>
                        {showRowMenu && (
                          <div className="relative" ref={rowMenuId === p.id ? rowMenuRef : undefined}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setRowMenuId((current) => (current === p.id ? null : p.id));
                              }}
                              aria-label={`Project actions for ${p.title}`}
                              aria-haspopup="menu"
                              aria-expanded={rowMenuId === p.id}
                              className={`rounded-md border p-1.5 transition-colors ${
                                isDark
                                  ? 'border-zinc-700 text-zinc-300 hover:bg-zinc-800'
                                  : 'border-zinc-300 text-zinc-600 hover:bg-zinc-100'
                              }`}
                            >
                              <MoreVertical size={14} aria-hidden />
                            </button>
                            {rowMenuId === p.id && (
                              <div
                                role="menu"
                                className={`absolute right-0 mt-1 z-30 w-44 rounded-md border shadow-lg overflow-hidden ${
                                  isDark
                                    ? 'border-zinc-700 bg-zinc-950 text-zinc-200'
                                    : 'border-zinc-200 bg-white text-zinc-800'
                                }`}
                              >
                                {canArchive && p.stage !== 'archived' && (
                                  <button
                                    type="button"
                                    role="menuitem"
                                    onClick={() => openRowArchive(p)}
                                    className={`block w-full text-left px-3 py-2 text-xs ${
                                      isDark ? 'hover:bg-zinc-900' : 'hover:bg-zinc-100'
                                    }`}
                                  >
                                    Archive project
                                  </button>
                                )}
                                {canDelete && (
                                  <button
                                    type="button"
                                    role="menuitem"
                                    onClick={() => openRowDelete(p)}
                                    className={`block w-full text-left px-3 py-2 text-xs font-semibold ${
                                      isDark
                                        ? 'text-red-300 hover:bg-red-950/50'
                                        : 'text-red-700 hover:bg-red-50'
                                    }`}
                                  >
                                    Delete…
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={isDark ? 'sm:hidden divide-y divide-zinc-800/70' : 'sm:hidden divide-y divide-zinc-200'}>
            {rows.map((p) => (
              <div key={p.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <label className={`inline-flex items-center gap-2 text-sm ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                    {bulkMode && (
                      <input type="checkbox" checked={selectedIds.includes(p.id)} onChange={() => toggleSelection(p.id)} className={isDark ? 'accent-white' : 'accent-zinc-900'} />
                    )}
                    <span className="font-medium">{p.title}</span>
                  </label>
                  <span className={`text-[10px] uppercase font-bold tracking-wide px-2 py-0.5 rounded ${stageClassForTheme(p.stage, theme)}`}>
                    {formatStage(p.stage)}
                  </span>
                </div>
                {renderProjectMeta(p)}
                <div className="flex items-center justify-between text-xs gap-2">
                  <span className={isDark ? 'text-zinc-400' : 'text-zinc-700'}>${p.budget.toLocaleString()}</span>
                  <span className={isDark ? 'text-zinc-500' : 'text-zinc-600'}>{formatAdminDate(p.dueDate)}</span>
                  <div className="ml-auto flex items-center gap-1.5">
                    <Link
                      to={`/hq/admin/projects/${p.id}`}
                      className={`rounded-md border px-2 py-1 ${
                        isDark ? 'border-zinc-700 text-zinc-200' : 'border-zinc-300 text-zinc-800'
                      }`}
                    >
                      Open
                    </Link>
                    {showRowMenu && (
                      <div className="relative" ref={rowMenuId === p.id ? rowMenuRef : undefined}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRowMenuId((current) => (current === p.id ? null : p.id));
                          }}
                          aria-label={`Project actions for ${p.title}`}
                          aria-haspopup="menu"
                          aria-expanded={rowMenuId === p.id}
                          className={`rounded-md border p-1.5 ${
                            isDark
                              ? 'border-zinc-700 text-zinc-300 hover:bg-zinc-800'
                              : 'border-zinc-300 text-zinc-600 hover:bg-zinc-100'
                          }`}
                        >
                          <MoreVertical size={14} aria-hidden />
                        </button>
                        {rowMenuId === p.id && (
                          <div
                            role="menu"
                            className={`absolute right-0 mt-1 z-30 w-44 rounded-md border shadow-lg overflow-hidden ${
                              isDark
                                ? 'border-zinc-700 bg-zinc-950 text-zinc-200'
                                : 'border-zinc-200 bg-white text-zinc-800'
                            }`}
                          >
                            {canArchive && p.stage !== 'archived' && (
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => openRowArchive(p)}
                                className={`block w-full text-left px-3 py-2 text-xs ${
                                  isDark ? 'hover:bg-zinc-900' : 'hover:bg-zinc-100'
                                }`}
                              >
                                Archive project
                              </button>
                            )}
                            {canDelete && (
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => openRowDelete(p)}
                                className={`block w-full text-left px-3 py-2 text-xs font-semibold ${
                                  isDark
                                    ? 'text-red-300 hover:bg-red-950/50'
                                    : 'text-red-700 hover:bg-red-50'
                                }`}
                              >
                                Delete…
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {rows.length === 0 && <p className={`p-6 text-sm ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>No matches.</p>}
        </div>
      )}

      {viewMode === 'board' && (
        <div
          className={`rounded-2xl border p-4 sm:p-5 min-w-0 ${isDark ? 'border-zinc-700/80 bg-zinc-900/40 shadow-[0_0_0_1px_rgba(63,63,70,0.35)]' : 'border-zinc-300 bg-white'}`}
          data-tour="projects-stage-lanes"
        >
          <div className="overflow-x-auto">
            <div
              className="grid gap-4"
              style={{
                minWidth: `${Math.max(groupedByStage.length * 260, 980)}px`,
                gridTemplateColumns: `repeat(${groupedByStage.length}, minmax(240px, 1fr))`,
              }}
            >
              {groupedByStage.map((group) => (
                <div
                  key={group.stage}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverStage(group.stage);
                  }}
                  onDragEnter={() => setDragOverStage(group.stage)}
                  onDragLeave={() =>
                    setDragOverStage((current) => (current === group.stage ? null : current))
                  }
                  onDrop={() => onDropToStage(group.stage)}
                  className={`rounded-xl border p-3 space-y-3 min-h-[360px] transition-colors duration-150 ${
                    dragOverStage === group.stage
                      ? isDark
                        ? 'border-sky-400/70 bg-sky-950/20 shadow-[0_0_0_1px_rgba(56,189,248,0.45)]'
                        : 'border-sky-500 bg-sky-50/70'
                      : isDark
                        ? 'border-zinc-800 bg-zinc-950/55'
                        : 'border-zinc-200 bg-zinc-50/60'
                  }`}
                >
                  <p className={`text-xs font-bold uppercase tracking-wide ${isDark ? 'text-zinc-400' : 'text-zinc-700'}`}>
                    {formatStage(group.stage)} <span className={isDark ? 'text-zinc-600' : 'text-zinc-500'}>({group.rows.length})</span>
                  </p>
                  {draggingId && dragOverStage === group.stage && (
                    <p className={`text-[11px] font-semibold ${isDark ? 'text-sky-300' : 'text-sky-700'}`}>
                      Drop here to move to {formatStage(group.stage)}
                    </p>
                  )}
                  {group.rows.length === 0 && <p className={`text-xs ${isDark ? 'text-zinc-600' : 'text-zinc-500'}`}>No projects</p>}
                  {group.rows.map((p) => (
                    <div
                      key={p.id}
                      draggable
                      onDragStart={() => setDraggingId(p.id)}
                      onDragEnd={() => {
                        setDraggingId(null);
                        setDragOverStage(null);
                      }}
                      className={`rounded-lg border p-3 transition-all duration-150 cursor-grab active:cursor-grabbing ${
                        draggingId === p.id ? 'opacity-65' : ''
                      } ${
                        isDark
                          ? 'border-zinc-800 bg-zinc-900 hover:border-zinc-600'
                          : 'border-zinc-200 bg-white hover:border-zinc-300'
                      } ${draggingId === p.id ? 'scale-[1.01] ring-1 ring-sky-400/60 shadow-lg' : ''}`}
                    >
                      <Link to={`/hq/admin/projects/${p.id}`} className="block">
                        <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-zinc-900'}`}>{p.title}</p>
                        <p className={`text-xs mt-1 ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>{p.clientName}</p>
                      </Link>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {viewMode === 'calendar' && (
        <div className={`rounded-xl border divide-y ${isDark ? 'border-zinc-800 bg-zinc-900/30 divide-zinc-800/80' : 'border-zinc-300 bg-white divide-zinc-200'}`}>
          {sortedByDate.map((p) => (
            <div key={p.id} className="p-3 sm:p-4 flex items-start justify-between gap-3">
              <div>
                <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-zinc-900'}`}>{p.title}</p>
                <p className={`text-xs mt-1 ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>{p.clientName}</p>
                <p className={`text-xs mt-1 ${isDark ? 'text-zinc-600' : 'text-zinc-600'}`}>Due {formatAdminDate(p.dueDate)}</p>
              </div>
              <Link
                to={`/hq/admin/projects/${p.id}`}
                className={`rounded-md border px-2.5 py-1 text-xs ${
                  isDark ? 'border-zinc-700 text-zinc-200' : 'border-zinc-300 text-zinc-800'
                }`}
              >
                Open
              </Link>
            </div>
          ))}
          {sortedByDate.length === 0 && <p className={`p-4 text-sm ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>No projects in this range.</p>}
        </div>
      )}

      {assignPickerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="bulk-assign-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setAssignPickerOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-md rounded-xl border p-5 ${
              isDark ? 'border-zinc-800 bg-zinc-950 text-white' : 'border-zinc-300 bg-white text-zinc-900'
            }`}
          >
            <h3 id="bulk-assign-title" className="text-base font-bold">Bulk assign crew</h3>
            <p className={`mt-1 text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
              Adds selected crew to {selectedIds.length} project(s). Existing assignments are preserved.
            </p>
            <div className="mt-4 max-h-64 overflow-y-auto space-y-1.5 pr-1">
              {MOCK_CREW.filter((c) => c.active).map((c) => {
                const checked = pickerCrewIds.includes(c.id);
                return (
                  <label
                    key={c.id}
                    className={`flex items-center gap-2 rounded-md border px-2.5 py-2 text-sm ${
                      isDark ? 'border-zinc-800 bg-zinc-900/40' : 'border-zinc-200 bg-zinc-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setPickerCrewIds((current) =>
                          checked ? current.filter((id) => id !== c.id) : [...current, c.id]
                        )
                      }
                      className={isDark ? 'accent-white' : 'accent-zinc-900'}
                    />
                    <span className="flex-1">{c.displayName}</span>
                    <span className={`text-[11px] ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>{c.role}</span>
                  </label>
                );
              })}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAssignPickerOpen(false)}
                className={`rounded-md border px-3 py-1.5 text-xs ${
                  isDark ? 'border-zinc-700 text-zinc-300' : 'border-zinc-300 text-zinc-700'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmBulkAssign}
                disabled={pickerCrewIds.length === 0}
                className={`rounded-md px-3 py-1.5 text-xs font-bold uppercase tracking-wide disabled:cursor-not-allowed disabled:opacity-50 ${
                  isDark ? 'bg-white text-black hover:bg-zinc-200' : 'bg-zinc-900 text-white hover:bg-zinc-800'
                }`}
              >
                Assign {pickerCrewIds.length || ''}
              </button>
            </div>
          </div>
        </div>
      )}

      {archiveConfirmOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="bulk-archive-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setArchiveConfirmOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-md rounded-xl border p-5 ${
              isDark ? 'border-zinc-800 bg-zinc-950 text-white' : 'border-zinc-300 bg-white text-zinc-900'
            }`}
          >
            <h3 id="bulk-archive-title" className="text-base font-bold">Archive projects</h3>
            <p className={`mt-2 text-sm ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
              Archive {selectedIds.length} selected project(s)? They will be moved to the Archived stage and marked complete.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setArchiveConfirmOpen(false)}
                className={`rounded-md border px-3 py-1.5 text-xs ${
                  isDark ? 'border-zinc-700 text-zinc-300' : 'border-zinc-300 text-zinc-700'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmBulkArchive}
                className="rounded-md border border-red-700 bg-red-900/40 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-red-200 hover:bg-red-900/60"
              >
                Archive {selectedIds.length}
              </button>
            </div>
          </div>
        </div>
      )}

      {rowArchiveTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="row-archive-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setRowArchiveTarget(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-md rounded-xl border p-5 ${
              isDark ? 'border-zinc-800 bg-zinc-950 text-white' : 'border-zinc-300 bg-white text-zinc-900'
            }`}
          >
            <h3 id="row-archive-title" className="text-base font-bold">
              Archive {rowArchiveTarget.title}?
            </h3>
            <p className={`mt-2 text-sm ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
              The project moves to the Archived stage and is marked complete. You can find it again with the
              Archived filter at any time.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRowArchiveTarget(null)}
                className={`rounded-md border px-3 py-1.5 text-xs ${
                  isDark ? 'border-zinc-700 text-zinc-300' : 'border-zinc-300 text-zinc-700'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmRowArchive}
                className={`rounded-md px-3 py-1.5 text-xs font-bold uppercase tracking-wide ${
                  isDark
                    ? 'bg-white text-black hover:bg-zinc-200'
                    : 'bg-zinc-900 text-white hover:bg-zinc-800'
                }`}
              >
                Archive project
              </button>
            </div>
          </div>
        </div>
      )}

      {rowDeleteTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="row-delete-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 sm:p-6"
          onClick={() => {
            setRowDeleteTarget(null);
            setDeleteCounts(null);
            setDeleteConfirmText('');
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border p-5 ${
              isDark ? 'border-red-800/60 bg-zinc-950 text-white' : 'border-red-300 bg-white text-zinc-900'
            }`}
          >
            <h3 id="row-delete-title" className="text-base font-bold">
              Delete {rowDeleteTarget.title}?
            </h3>
            <p
              className={`mt-2 text-sm ${
                isDark ? 'text-red-300' : 'text-red-700'
              }`}
            >
              This is permanent. The project and every related record listed below will be removed. There is no
              undo.
            </p>

            {deleteCounts && (
              <ul
                className={`mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs rounded-md border p-3 ${
                  isDark ? 'border-zinc-800 bg-zinc-900/50' : 'border-zinc-200 bg-zinc-50'
                }`}
              >
                {(
                  [
                    ['planner', 'Planner items'],
                    ['shoots', 'Shoots'],
                    ['meetings', 'Meetings'],
                    ['assets', 'Assets'],
                    ['invoices', 'Invoices'],
                    ['proposals', 'Proposals'],
                    ['expenses', 'Expenses'],
                    ['deliverables', 'Deliverables'],
                    ['risks', 'Risks'],
                    ['blockers', 'Blockers'],
                    ['dependencies', 'Dependencies'],
                    ['changeOrders', 'Change orders'],
                    ['stageTransitions', 'Stage history'],
                    ['activity', 'Activity entries'],
                  ] as Array<[keyof ProjectCascadeCounts, string]>
                ).map(([key, label]) => (
                  <li key={key} className="flex justify-between gap-2">
                    <span className={isDark ? 'text-zinc-400' : 'text-zinc-600'}>{label}</span>
                    <span className={`font-mono ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                      {deleteCounts[key]}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <label className="mt-4 block">
              <span
                className={`text-[11px] font-bold uppercase tracking-wide ${
                  isDark ? 'text-zinc-400' : 'text-zinc-700'
                }`}
              >
                Type the project title to confirm
              </span>
              <input
                type="text"
                autoFocus
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={rowDeleteTarget.title}
                className={`mt-1 w-full rounded-md border px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 ${
                  isDark
                    ? 'border-zinc-700 bg-zinc-900 text-white placeholder:text-zinc-600 focus:ring-red-500/40'
                    : 'border-zinc-300 bg-white text-zinc-900 placeholder:text-zinc-400 focus:ring-red-500/40'
                }`}
              />
            </label>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setRowDeleteTarget(null);
                  setDeleteCounts(null);
                  setDeleteConfirmText('');
                }}
                className={`rounded-md border px-3 py-1.5 text-xs ${
                  isDark ? 'border-zinc-700 text-zinc-300' : 'border-zinc-300 text-zinc-700'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmRowDelete}
                disabled={
                  deleteConfirmText.trim().toLowerCase() !== rowDeleteTarget.title.trim().toLowerCase()
                }
                className="rounded-md border border-red-700 bg-red-900/40 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-red-200 hover:bg-red-900/60 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Delete project
              </button>
            </div>
          </div>
        </div>
      )}

      <AdminProjectWizard
        open={wizardOpen}
        initialDraft={wizardDraft}
        onClose={() => {
          setWizardOpen(false);
          setWizardDraft(null);
        }}
        onCreated={() => setFeedback('Project created successfully.')}
      />
    </div>
  );
};

export default AdminProjects;
