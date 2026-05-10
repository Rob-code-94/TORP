import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { attachMediaToCrewProfile, upsertCrewMediaPolicy } from '../../../data/hqCrewCrud';
import { getAssetsSync, getHqCrewDirectory } from '../../../data/hqSyncDirectory';
import { useHqOrgTick } from '../HqFirestoreProvider';
import { createCrew, deleteCrew, sendCrewResetLink, setCrewPassword, updateCrew } from '../../../data/adminProjectsApi';
import { useAuth } from '../../../lib/auth';
import { isFirebaseConfigured } from '../../../lib/firebase';
import { useAdminTheme } from '../../../lib/adminTheme';
import { appInputClass, appLinkMutedClass, appPanelClass } from '../../../lib/appThemeClasses';
import { sendCrewAuthPasswordReset, setCrewAuthTempPassword } from '../../../lib/crewAuthAdmin';
import AdminFormDrawer from './AdminFormDrawer';
import type { CrewFeatureKey, CrewProfile } from '../../../types';
import { UserRole } from '../../../types';

const WEEKDAY_OPTIONS = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
] as const;

const FEATURE_ACCESS_FIELDS = [
  { key: 'quick.addClient', label: 'Quick action: Add client' },
  { key: 'page.clients', label: 'Clients page access' },
  { key: 'quick.addProject', label: 'Quick action: Add project' },
  { key: 'page.financials', label: 'Financials page access' },
  { key: 'quick.addTaskShoot', label: 'Quick actions: Add task / shoot' },
  { key: 'page.settings', label: 'Settings page access' },
] as const;

type CrewDraft = {
  displayName: string;
  role: CrewProfile['role'];
  systemRole: CrewProfile['systemRole'];
  featureAccess: CrewProfile['featureAccess'];
  email: string;
  phone: string;
  rateShootHour: string;
  rateEditHour: string;
  active: boolean;
  timezone: string;
  availableDays: Array<0 | 1 | 2 | 3 | 4 | 5 | 6>;
  weekdayStart: string;
  weekdayEnd: string;
  exceptionStart: string;
  exceptionEnd: string;
  availabilityNotes: string;
  tempPassword: string;
};

const EMPTY_CREW_DRAFT: CrewDraft = {
  displayName: '',
  role: 'other',
  systemRole: UserRole.STAFF,
  featureAccess: {},
  email: '',
  phone: '',
  rateShootHour: '0',
  rateEditHour: '0',
  active: true,
  timezone: 'America/New_York',
  availableDays: [1, 2, 3, 4, 5],
  weekdayStart: '09:00',
  weekdayEnd: '17:00',
  exceptionStart: '',
  exceptionEnd: '',
  availabilityNotes: '',
  tempPassword: '',
};

const AdminCrew: React.FC = () => {
  const { theme } = useAdminTheme();
  const isDark = theme === 'dark';
  const { user, isFirebase } = useAuth();
  const isAdmin = user?.role === UserRole.ADMIN;
  const isProjectManager = user?.role === UserRole.PROJECT_MANAGER;
  const crewReadOnly = isProjectManager;
  const actorLabel = user?.displayName?.trim() || user?.email || 'HQ';

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingCrewId, setEditingCrewId] = useState<string | null>(null);
  const [draft, setDraft] = useState<CrewDraft>(EMPTY_CREW_DRAFT);
  const [status, setStatus] = useState<string | null>(null);
  const [statusTone, setStatusTone] = useState<'ok' | 'error'>('ok');
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [mediaAssetToAttach, setMediaAssetToAttach] = useState('');
  const [directoryQuery, setDirectoryQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | CrewProfile['role']>('all');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [listVersion, setListVersion] = useState(0);
  const hqTick = useHqOrgTick();
  const editingCrew = useMemo(
    () => getHqCrewDirectory().find((crew) => crew.id === editingCrewId),
    [editingCrewId, hqTick]
  );

  const filteredCrew = useMemo(() => {
    return getHqCrewDirectory().filter((c) => {
      const t = directoryQuery.trim().toLowerCase();
      if (t) {
        const blob = `${c.displayName} ${c.email} ${c.role}`.toLowerCase();
        if (!blob.includes(t)) return false;
      }
      if (roleFilter !== 'all' && c.role !== roleFilter) return false;
      if (activeFilter === 'active' && !c.active) return false;
      if (activeFilter === 'inactive' && c.active) return false;
      return true;
    });
  }, [directoryQuery, roleFilter, activeFilter, listVersion, hqTick]);

  // Detect availability records the simple single-window editor cannot represent
  // without losing data. The editor flattens all selected days to one (start,end)
  // pair and serializes a single exception range; if the underlying record has
  // multiple distinct windows or multiple exceptions, save would silently drop them.
  const availabilityRichness = useMemo(() => {
    if (!editingCrew) return { distinctWindows: 0, exceptions: 0 };
    const pairs = new Set(
      editingCrew.availabilityDetail.windows.map((w) => `${w.startTime}-${w.endTime}`)
    );
    return {
      distinctWindows: pairs.size,
      exceptions: editingCrew.availabilityDetail.exceptions.length,
    };
  }, [editingCrew]);
  const availabilityBlocked =
    availabilityRichness.distinctWindows > 1 || availabilityRichness.exceptions > 1;

  const openCreate = () => {
    setEditingCrewId(null);
    setDraft(EMPTY_CREW_DRAFT);
    setStatus(null);
    setDrawerOpen(true);
  };

  const openEdit = (crewId: string) => {
    const crew = getHqCrewDirectory().find((item) => item.id === crewId);
    if (!crew) return;
    setEditingCrewId(crew.id);
    setDraft({
      displayName: crew.displayName,
      role: crew.role,
      systemRole: crew.systemRole,
      featureAccess: { ...(crew.featureAccess || {}) },
      email: crew.email,
      phone: crew.phone || '',
      rateShootHour: String(crew.rateShootHour),
      rateEditHour: String(crew.rateEditHour),
      active: crew.active,
      timezone: crew.availabilityDetail.timezone,
      availableDays: Array.from(new Set(crew.availabilityDetail.windows.map((window) => window.dayOfWeek))).sort() as Array<
        0 | 1 | 2 | 3 | 4 | 5 | 6
      >,
      weekdayStart: crew.availabilityDetail.windows[0]?.startTime || '09:00',
      weekdayEnd: crew.availabilityDetail.windows[0]?.endTime || '17:00',
      exceptionStart: crew.availabilityDetail.exceptions[0]?.startDate || '',
      exceptionEnd: crew.availabilityDetail.exceptions[0]?.endDate || '',
      availabilityNotes: crew.availabilityDetail.notes || '',
      tempPassword: '',
    });
    setStatus(null);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditingCrewId(null);
    setDraft(EMPTY_CREW_DRAFT);
    setConfirmDeleteOpen(false);
    setStatus(null);
  };

  const availabilityDetail = {
    timezone: draft.timezone,
    windows: draft.availableDays.map((day) => ({
      id: `window-${day}`,
      dayOfWeek: day,
      startTime: draft.weekdayStart,
      endTime: draft.weekdayEnd,
    })),
    exceptions:
      draft.exceptionStart && draft.exceptionEnd
        ? [{ id: 'ex-1', startDate: draft.exceptionStart, endDate: draft.exceptionEnd, reason: 'Unavailable' }]
        : [],
    notes: draft.availabilityNotes,
  };

  const saveCrew = () => {
    if (crewReadOnly) return;
    if (draft.systemRole === UserRole.ADMIN && !isAdmin) {
      setStatus('Only an admin can assign the Admin system role.');
      setStatusTone('error');
      return;
    }
    const basePayload = {
      displayName: draft.displayName,
      role: draft.role,
      systemRole: draft.systemRole,
      featureAccess: draft.featureAccess,
      email: draft.email,
      phone: draft.phone,
      rateShootHour: Number(draft.rateShootHour || 0),
      rateEditHour: Number(draft.rateEditHour || 0),
      active: draft.active,
    };
    /** Rich availability is read-only here; omit so update preserves on-file windows/exceptions (see updateCrewMemberProfile). */
    const updatePayload =
      editingCrewId && availabilityBlocked ? basePayload : { ...basePayload, availabilityDetail };
    const result = editingCrewId ? updateCrew(editingCrewId, updatePayload) : createCrew(basePayload);
    if (!result.ok) {
      setStatus('error' in result ? result.error : 'Could not save crew profile.');
      setStatusTone('error');
      return;
    }
    setListVersion((n) => n + 1);
    closeDrawer();
  };

  const attachMedia = () => {
    if (!editingCrewId || !mediaAssetToAttach) return;
    const result = attachMediaToCrewProfile(editingCrewId, mediaAssetToAttach);
    if (!result.ok) {
      setStatus(result.error || 'Could not attach media.');
      setStatusTone('error');
      return;
    }
    setStatus('Media attached to crew profile.');
    setStatusTone('ok');
    setMediaAssetToAttach('');
    setListVersion((n) => n + 1);
  };

  const updateMediaPolicy = (
    assetId: string,
    patch: Partial<{ visibility: 'internal' | 'client' | 'hidden'; usageRights: 'licensed' | 'owned' | 'restricted'; expiresAt?: string }>
  ) => {
    if (!editingCrewId || !editingCrew) return;
    const existing = editingCrew.mediaPolicies?.find((item) => item.assetId === assetId);
    const result = upsertCrewMediaPolicy(editingCrewId, {
      assetId,
      visibility: patch.visibility || existing?.visibility || 'internal',
      usageRights: patch.usageRights || existing?.usageRights || 'owned',
      expiresAt: patch.expiresAt !== undefined ? patch.expiresAt : existing?.expiresAt,
    });
    if (!result.ok) {
      setStatus(result.error || 'Could not update media rights.');
      setStatusTone('error');
      return;
    }
    setListVersion((n) => n + 1);
  };

  const sendResetLink = async () => {
    if (!editingCrewId || crewReadOnly) return;
    if (isFirebaseConfigured() && isFirebase) {
      const r = await sendCrewAuthPasswordReset(draft.email);
      if (r.ok === false) {
        setStatus(r.error);
        setStatusTone('error');
        return;
      }
      const result = sendCrewResetLink(editingCrewId, actorLabel);
      if (result.ok) {
        setStatus(
          `Password reset email sent. Logged in directory at ${new Date(result.crew.lastResetRequestedAt || '').toLocaleString()}.`
        );
        setStatusTone('ok');
      } else {
        setStatus('Email was sent, but the crew record could not be updated.');
        setStatusTone('ok');
      }
      return;
    }
    const result = sendCrewResetLink(editingCrewId, actorLabel);
    if (!result.ok) {
      setStatus('error' in result ? result.error : 'Could not send reset link.');
      setStatusTone('error');
      return;
    }
    setStatus(`Reset link sent at ${new Date(result.crew.lastResetRequestedAt || '').toLocaleString()}.`);
    setStatusTone('ok');
  };

  const toggleDay = (day: 0 | 1 | 2 | 3 | 4 | 5 | 6) => {
    if (crewReadOnly) return;
    setDraft((current) => ({
      ...current,
      availableDays: current.availableDays.includes(day)
        ? current.availableDays.filter((item) => item !== day)
        : [...current.availableDays, day].sort() as Array<0 | 1 | 2 | 3 | 4 | 5 | 6>,
    }));
  };

  const saveTempPassword = async () => {
    if (!editingCrewId || crewReadOnly) return;
    if (isFirebaseConfigured() && isFirebase) {
      const r = await setCrewAuthTempPassword(draft.email, draft.tempPassword);
      if (r.ok === false) {
        setStatus(r.error);
        setStatusTone('error');
        return;
      }
      const result = setCrewPassword(editingCrewId, actorLabel, draft.tempPassword);
      if (!result.ok) {
        setStatus('Firebase password was updated, but the crew record could not be time-stamped locally.');
        setStatusTone('ok');
        return;
      }
      setDraft((current) => ({ ...current, tempPassword: '' }));
      setStatus(`Temporary password set in Auth at ${new Date(result.crew.lastTempPasswordSetAt || '').toLocaleString()}.`);
      setStatusTone('ok');
      return;
    }
    const result = setCrewPassword(editingCrewId, actorLabel, draft.tempPassword);
    if (!result.ok) {
      setStatus('error' in result ? result.error : 'Could not set temporary password.');
      setStatusTone('error');
      return;
    }
    setDraft((current) => ({ ...current, tempPassword: '' }));
    setStatus(`Temporary password set at ${new Date(result.crew.lastTempPasswordSetAt || '').toLocaleString()}.`);
    setStatusTone('ok');
  };

  const confirmDeleteCrew = () => {
    if (!editingCrewId || !editingCrew || !isAdmin) return;
    const selfByCrewId = user?.crewId && user.crewId === editingCrewId;
    const selfByEmail = user?.email && editingCrew.email.trim().toLowerCase() === user.email.trim().toLowerCase();
    if (selfByCrewId || selfByEmail) {
      setStatus('You cannot delete your own crew profile while signed in.');
      setStatusTone('error');
      setConfirmDeleteOpen(false);
      return;
    }
    const result = deleteCrew(editingCrewId);
    if (!result.ok) {
      setStatus('error' in result ? result.error : 'Could not delete crew member.');
      setStatusTone('error');
      setConfirmDeleteOpen(false);
      return;
    }
    setDrawerOpen(false);
    setEditingCrewId(null);
    setDraft(EMPTY_CREW_DRAFT);
    setConfirmDeleteOpen(false);
    setStatus('Crew member deleted.');
    setStatusTone('ok');
    setListVersion((n) => n + 1);
  };

  const toggleFeatureAccess = (key: CrewFeatureKey) => {
    if (crewReadOnly || !isAdmin) return;
    setDraft((current) => ({
      ...current,
      featureAccess: {
        ...(current.featureAccess || {}),
        [key]: !(current.featureAccess?.[key] ?? false),
      },
    }));
  };

  return (
    <div className="max-w-4xl space-y-4">
      <div className="flex items-center justify-between gap-2" data-tour="crew-header">
        <div>
        <p className="text-xs font-mono uppercase text-zinc-500">Crew</p>
        <h2 className="text-xl font-bold text-white">Directory &amp; rates</h2>
        {crewReadOnly && <p className="text-xs text-zinc-500 mt-1">Read-only for project managers.</p>}
        </div>
        {!crewReadOnly && (
          <button
            type="button"
            onClick={openCreate}
            className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-zinc-200 shrink-0"
          >
            Add Crew Member
          </button>
        )}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end min-w-0" data-tour="crew-filters">
        <input
          type="search"
          value={directoryQuery}
          onChange={(e) => setDirectoryQuery(e.target.value)}
          placeholder="Search name, email, craft"
          className={appInputClass(isDark)}
          aria-label="Search crew"
        />
        <label className="text-xs text-zinc-500 flex flex-col gap-0.5 sm:min-w-[130px]">
          Craft
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as typeof roleFilter)}
            className={
              isDark
                ? 'rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-200'
                : 'rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900'
            }
          >
            <option value="all">All</option>
            <option value="director">Director</option>
            <option value="dp">DP</option>
            <option value="editor">Editor</option>
            <option value="producer">Producer</option>
            <option value="audio">Audio</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label className="text-xs text-zinc-500 flex flex-col gap-0.5 sm:min-w-[120px]">
          Status
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value as typeof activeFilter)}
            className={
              isDark
                ? 'rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-200'
                : 'rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900'
            }
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
        {(directoryQuery || roleFilter !== 'all' || activeFilter !== 'all') && (
          <button
            type="button"
            onClick={() => {
              setDirectoryQuery('');
              setRoleFilter('all');
              setActiveFilter('all');
            }}
            className={`text-xs underline self-start sm:mb-1 ${appLinkMutedClass(isDark)}`}
          >
            Clear
          </button>
        )}
      </div>
      <div className={`rounded-xl overflow-x-auto min-w-0 ${appPanelClass(isDark)}`} data-tour="crew-list">
        <table className="w-full text-sm min-w-[720px]">
          <thead
            className={`text-xs uppercase border-b ${
              isDark ? 'text-zinc-500 border-zinc-800 bg-zinc-950/60' : 'text-zinc-600 border-zinc-200 bg-zinc-100'
            }`}
          >
            <tr>
              <th className="text-left px-3 py-2">Name</th>
              <th className="text-left px-3 py-2">Craft</th>
              <th className="text-left px-3 py-2">System</th>
              <th className="text-right px-3 py-2">Shoot $/hr</th>
              <th className="text-right px-3 py-2">Edit $/hr</th>
              <th className="text-left px-3 py-2">Availability</th>
              <th className="text-left px-3 py-2">Projects</th>
            </tr>
          </thead>
          <tbody className={isDark ? 'divide-y divide-zinc-800/80' : 'divide-y divide-zinc-200'}>
            {filteredCrew.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-4 text-sm text-zinc-500">
                  No people match your filters.
                </td>
              </tr>
            ) : (
              filteredCrew.map((c) => (
              <tr
                key={c.id}
                className={isDark ? 'text-zinc-200' : 'text-zinc-800'}
              >
                <td
                  className={`px-3 py-2.5 font-medium ${
                    isDark ? 'text-white' : 'text-zinc-900'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => openEdit(c.id)}
                    className={
                      isDark
                        ? 'underline decoration-zinc-700 underline-offset-2'
                        : 'underline decoration-zinc-300 underline-offset-2'
                    }
                  >
                    {c.displayName}
                  </button>
                </td>
                <td className="px-3 py-2.5 text-zinc-500">{c.role}</td>
                <td className="px-3 py-2.5 text-zinc-500 text-xs">{c.systemRole}</td>
                <td className="px-3 py-2.5 text-right font-mono text-xs">{c.rateShootHour}</td>
                <td className="px-3 py-2.5 text-right font-mono text-xs">{c.rateEditHour}</td>
                <td className="px-3 py-2.5 text-zinc-500 text-xs max-w-xs">{c.availability}</td>
                <td className="px-3 py-2.5 text-xs text-zinc-500">
                  {c.assignedProjectIds.map((pid) => (
                    <Link
                      key={pid}
                      to={`/hq/admin/projects/${pid}`}
                      className={`mr-2 ${appLinkMutedClass(isDark)}`}
                    >
                      {pid}
                    </Link>
                  ))}
                </td>
              </tr>
            ))
            )}
          </tbody>
        </table>
      </div>
      <div data-tour="crew-editor">
      <AdminFormDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        title={editingCrewId ? 'Crew Member Settings' : 'Add Crew Member'}
        subtitle="Manage profile, account, rates, and availability"
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" onClick={closeDrawer} className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300">
              Cancel
            </button>
            {!crewReadOnly && (
              <button
                type="button"
                onClick={saveCrew}
                title={
                  availabilityBlocked
                    ? 'Availability on file uses multiple windows or exceptions and cannot be edited here. This save updates profile, role, rates, and account—hours stay as stored.'
                    : undefined
                }
                className="rounded-md bg-white px-3 py-1.5 text-xs font-bold text-black hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {editingCrewId ? 'Save Changes' : 'Create Crew'}
              </button>
            )}
          </div>
        }
      >
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              value={draft.displayName}
              onChange={(e) => setDraft((v) => ({ ...v, displayName: e.target.value }))}
              placeholder="Full name"
              disabled={crewReadOnly}
              className={`${appInputClass(isDark)} disabled:opacity-50`}
            />
            <select
              value={draft.role}
              onChange={(e) => setDraft((v) => ({ ...v, role: e.target.value as CrewProfile['role'] }))}
              disabled={crewReadOnly}
              className={`${appInputClass(isDark)} disabled:opacity-50`}
            >
              <option value="director">Director</option>
              <option value="dp">DP</option>
              <option value="editor">Editor</option>
              <option value="producer">Producer</option>
              <option value="audio">Audio</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-wide text-zinc-500 mb-1">System role (HQ access)</label>
            <select
              value={draft.systemRole}
              onChange={(e) => setDraft((v) => ({ ...v, systemRole: e.target.value as CrewProfile['systemRole'] }))}
              disabled={crewReadOnly || !isAdmin}
              className={`${appInputClass(isDark)} disabled:opacity-50`}
            >
              <option value={UserRole.STAFF}>Staff</option>
              <option value={UserRole.PROJECT_MANAGER}>Project manager</option>
              <option value={UserRole.ADMIN}>Admin</option>
            </select>
            {!isAdmin && !crewReadOnly && (
              <p className="text-[11px] text-zinc-500 mt-1">Only admins can change system role.</p>
            )}
          </div>
          <div className={`rounded-lg p-3 space-y-2 min-w-0 ${appPanelClass(isDark)}`}>
            <p className="text-xs uppercase tracking-wide text-zinc-500">Feature access (HQ)</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {FEATURE_ACCESS_FIELDS.map((item) => {
                const checked = Boolean(draft.featureAccess?.[item.key]);
                return (
                  <label key={item.key} className="flex items-start gap-2 text-xs text-zinc-300">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleFeatureAccess(item.key)}
                      disabled={crewReadOnly || !isAdmin}
                    />
                    <span>{item.label}</span>
                  </label>
                );
              })}
            </div>
            {!isAdmin && <p className="text-[11px] text-zinc-500">Only admins can change feature access.</p>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              value={draft.email}
              onChange={(e) => setDraft((v) => ({ ...v, email: e.target.value }))}
              placeholder="Email"
              disabled={crewReadOnly}
              className={`${appInputClass(isDark)} disabled:opacity-50`}
            />
            <input
              value={draft.phone}
              onChange={(e) => setDraft((v) => ({ ...v, phone: e.target.value }))}
              placeholder="Phone"
              disabled={crewReadOnly}
              className={`${appInputClass(isDark)} disabled:opacity-50`}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <label className="block text-[11px] uppercase tracking-wide text-zinc-500">
              Shoot Rate ($/hr)
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                <input
                  value={draft.rateShootHour}
                  onChange={(e) => setDraft((v) => ({ ...v, rateShootHour: e.target.value.replace(/[^\d.]/g, '') }))}
                  placeholder="0.00"
                  disabled={crewReadOnly}
                  className={`w-full pl-7 pr-3 ${appInputClass(isDark)} disabled:opacity-50`}
                />
              </div>
            </label>
            <label className="block text-[11px] uppercase tracking-wide text-zinc-500">
              Edit Rate ($/hr)
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                <input
                  value={draft.rateEditHour}
                  onChange={(e) => setDraft((v) => ({ ...v, rateEditHour: e.target.value.replace(/[^\d.]/g, '') }))}
                  placeholder="0.00"
                  disabled={crewReadOnly}
                  className={`w-full pl-7 pr-3 ${appInputClass(isDark)} disabled:opacity-50`}
                />
              </div>
            </label>
          </div>
          <div className={`rounded-lg p-3 space-y-2 min-w-0 ${appPanelClass(isDark)}`}>
            <p className="text-xs uppercase tracking-wide text-zinc-500">Availability</p>
            {availabilityBlocked && (
              <div className="rounded-md border border-zinc-700/80 bg-zinc-900/60 p-2 text-[11px] leading-snug text-zinc-300">
                <p className="font-semibold uppercase tracking-wide text-zinc-400">Availability not editable here</p>
                <p className="mt-1 text-zinc-400">
                  This profile has{' '}
                  {availabilityRichness.distinctWindows > 1 && (
                    <>{availabilityRichness.distinctWindows} different time windows</>
                  )}
                  {availabilityRichness.distinctWindows > 1 && availabilityRichness.exceptions > 1 && ' and '}
                  {availabilityRichness.exceptions > 1 && (
                    <>{availabilityRichness.exceptions} time-off exceptions</>
                  )}
                  . The simple editor cannot represent that without losing data, so hours stay read-only. You can still save{' '}
                  <span className="text-zinc-200">name, role, feature access, rates, email, and account</span>
                  —on-file availability is unchanged until adjusted elsewhere or an advanced editor is available.
                </p>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {WEEKDAY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  disabled={crewReadOnly || availabilityBlocked}
                  onClick={() => toggleDay(option.value)}
                  className={`rounded-full border px-2.5 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-50 ${
                    draft.availableDays.includes(option.value)
                      ? 'border-white bg-white text-black'
                      : 'border-zinc-700 text-zinc-300'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                value={draft.timezone}
                onChange={(e) => setDraft((v) => ({ ...v, timezone: e.target.value }))}
                placeholder="Timezone"
                disabled={crewReadOnly || availabilityBlocked}
                className={`${appInputClass(isDark)} disabled:opacity-50`}
              />
              <input
                type="time"
                value={draft.weekdayStart}
                onChange={(e) => setDraft((v) => ({ ...v, weekdayStart: e.target.value }))}
                disabled={crewReadOnly || availabilityBlocked}
                className={`${appInputClass(isDark)} disabled:opacity-50`}
              />
              <input
                type="time"
                value={draft.weekdayEnd}
                onChange={(e) => setDraft((v) => ({ ...v, weekdayEnd: e.target.value }))}
                disabled={crewReadOnly || availabilityBlocked}
                className={`${appInputClass(isDark)} disabled:opacity-50`}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="date"
                value={draft.exceptionStart}
                onChange={(e) => setDraft((v) => ({ ...v, exceptionStart: e.target.value }))}
                disabled={crewReadOnly || availabilityBlocked}
                className={`${appInputClass(isDark)} disabled:opacity-50`}
              />
              <input
                type="date"
                value={draft.exceptionEnd}
                onChange={(e) => setDraft((v) => ({ ...v, exceptionEnd: e.target.value }))}
                disabled={crewReadOnly || availabilityBlocked}
                className={`${appInputClass(isDark)} disabled:opacity-50`}
              />
            </div>
            <textarea
              value={draft.availabilityNotes}
              onChange={(e) => setDraft((v) => ({ ...v, availabilityNotes: e.target.value }))}
              rows={2}
              placeholder="Availability notes"
              disabled={crewReadOnly || availabilityBlocked}
              className={`${appInputClass(isDark)} disabled:opacity-50`}
            />
          </div>
          <label className="flex items-center gap-2 text-xs text-zinc-300">
            <input
              type="checkbox"
              checked={draft.active}
              onChange={(e) => setDraft((v) => ({ ...v, active: e.target.checked }))}
              disabled={crewReadOnly}
            />
            Active crew member
          </label>
          {editingCrew && (
            <div className={`rounded-lg p-3 min-w-0 ${appPanelClass(isDark)}`}>
              <p className="text-xs uppercase tracking-wide text-zinc-500 mb-2">Account</p>
              {!crewReadOnly ? (
                <>
                  <button
                    type="button"
                    onClick={sendResetLink}
                    className="rounded-md border border-zinc-700 px-2.5 py-1.5 text-xs font-bold uppercase tracking-wide text-zinc-200"
                  >
                    Send Password Reset Link
                  </button>
                  <div className="mt-3 flex flex-col sm:flex-row gap-2">
                    <input
                      type="password"
                      value={draft.tempPassword}
                      onChange={(e) => setDraft((v) => ({ ...v, tempPassword: e.target.value }))}
                      placeholder="Set temporary password"
                      className={appInputClass(isDark)}
                    />
                    <button
                      type="button"
                      onClick={saveTempPassword}
                      className="rounded-md border border-zinc-700 px-3 py-2 text-xs font-bold uppercase tracking-wide text-zinc-200"
                    >
                      Set Password
                    </button>
                  </div>
                  {isAdmin && editingCrew && (
                    <div className="mt-3 border-t border-zinc-800 pt-3">
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteOpen((v) => !v)}
                        className="rounded-md border border-red-800/70 px-2.5 py-1.5 text-xs font-bold uppercase tracking-wide text-red-300"
                      >
                        Delete Crew Member
                      </button>
                      {confirmDeleteOpen && (
                        <div className="mt-2 rounded-md border border-red-900/60 bg-red-950/30 p-3">
                          <p className="text-xs text-red-200">
                            Delete {editingCrew.displayName}? This cannot be undone. Assigned crew cannot be deleted.
                          </p>
                          <div className="mt-2 flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteOpen(false)}
                              className="rounded-md border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-300"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={confirmDeleteCrew}
                              className="rounded-md border border-red-700 bg-red-900/40 px-2.5 py-1.5 text-xs font-bold text-red-200"
                            >
                              Confirm Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-xs text-zinc-500">Account actions are admin-only.</p>
              )}
              {editingCrew.lastResetRequestedAt && (
                <p className="mt-2 text-xs text-zinc-500">
                  Last reset: {new Date(editingCrew.lastResetRequestedAt).toLocaleString()}
                </p>
              )}
              {editingCrew.lastTempPasswordSetAt && (
                <p className="mt-1 text-xs text-zinc-500">
                  Temp password set: {new Date(editingCrew.lastTempPasswordSetAt).toLocaleString()}
                </p>
              )}
            </div>
          )}
          {editingCrew && (
            <div className={`rounded-lg p-3 min-w-0 ${appPanelClass(isDark)}`}>
              <p className="text-xs uppercase tracking-wide text-zinc-500 mb-2">Crew media</p>
              <div className="flex flex-col sm:flex-row gap-2 min-w-0">
                <select
                  value={mediaAssetToAttach}
                  onChange={(e) => setMediaAssetToAttach(e.target.value)}
                  className={`${appInputClass(isDark)} min-w-0`}
                >
                  <option value="">Select project asset to attach</option>
                  {getAssetsSync().filter((asset) => editingCrew.assignedProjectIds.includes(asset.projectId)).map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={attachMedia}
                  disabled={crewReadOnly || !mediaAssetToAttach}
                  className="rounded-md border border-zinc-700 px-3 py-2 text-xs font-bold uppercase tracking-wide text-zinc-200 disabled:opacity-50"
                >
                  Attach media
                </button>
              </div>
              <div className="mt-3 space-y-2">
                {(editingCrew.mediaAssetIds || []).length === 0 ? (
                  <p className="text-xs text-zinc-500">No media attached.</p>
                ) : (
                  (editingCrew.mediaAssetIds || []).map((assetId) => {
                    const asset = getAssetsSync().find((item) => item.id === assetId);
                    const policy = editingCrew.mediaPolicies?.find((item) => item.assetId === assetId);
                    const expired = policy?.expiresAt ? new Date(policy.expiresAt).getTime() < Date.now() : false;
                    return (
                      <div key={assetId} className={`rounded-md border p-2 ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
                        <p className={`text-xs font-semibold ${isDark ? 'text-zinc-200' : 'text-zinc-900'}`}>
                          {asset?.label || `Unknown asset ${assetId}`}
                        </p>
                        <div className="mt-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <select
                            disabled={crewReadOnly}
                            value={policy?.visibility || 'internal'}
                            onChange={(e) =>
                              updateMediaPolicy(assetId, { visibility: e.target.value as 'internal' | 'client' | 'hidden' })
                            }
                            className={appInputClass(isDark)}
                          >
                            <option value="internal">Internal</option>
                            <option value="client">Client</option>
                            <option value="hidden">Hidden</option>
                          </select>
                          <select
                            disabled={crewReadOnly}
                            value={policy?.usageRights || 'owned'}
                            onChange={(e) =>
                              updateMediaPolicy(assetId, { usageRights: e.target.value as 'licensed' | 'owned' | 'restricted' })
                            }
                            className={appInputClass(isDark)}
                          >
                            <option value="owned">Owned</option>
                            <option value="licensed">Licensed</option>
                            <option value="restricted">Restricted</option>
                          </select>
                          <input
                            type="date"
                            disabled={crewReadOnly}
                            value={policy?.expiresAt || ''}
                            onChange={(e) => updateMediaPolicy(assetId, { expiresAt: e.target.value || undefined })}
                            className={appInputClass(isDark)}
                          />
                        </div>
                        {expired && (
                          <p className="text-[11px] text-rose-300 mt-1">
                            Rights expired. This media should not be client-visible.
                          </p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
          {status && <p className={`text-xs ${statusTone === 'error' ? 'text-red-300' : 'text-emerald-300'}`}>{status}</p>}
        </div>
      </AdminFormDrawer>
      </div>
    </div>
  );
};

export default AdminCrew;
