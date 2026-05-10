import type { CrewProfile } from '../types';
import { UserRole } from '../types';
import { getHqCrewDirectory, getHqProjectDirectory } from './hqSyncDirectory';
import { hqDeleteCrew, hqUpsertCrew } from './hqFirestoreService';
import { getHqTenantForWrites } from './hqWriteContext';

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function nextCrewId(): string {
  const nums = getHqCrewDirectory()
    .map((c) => Number.parseInt(String(c.id).replace(/^cr-/, ''), 10))
    .filter((n) => Number.isFinite(n));
  const max = nums.length ? Math.max(...nums) : 0;
  return `cr-${max + 1}`;
}

function defaultAvailability(): CrewProfile['availabilityDetail'] {
  return {
    timezone: 'America/New_York',
    windows: [
      { id: `av-${Date.now()}-1`, dayOfWeek: 1, startTime: '09:00', endTime: '17:00' },
      { id: `av-${Date.now()}-2`, dayOfWeek: 2, startTime: '09:00', endTime: '17:00' },
      { id: `av-${Date.now()}-3`, dayOfWeek: 3, startTime: '09:00', endTime: '17:00' },
      { id: `av-${Date.now()}-4`, dayOfWeek: 4, startTime: '09:00', endTime: '17:00' },
      { id: `av-${Date.now()}-5`, dayOfWeek: 5, startTime: '09:00', endTime: '17:00' },
    ],
    exceptions: [],
    notes: '',
  };
}

function summarizeAvailability(detail: CrewProfile['availabilityDetail']) {
  if (detail.exceptions.length) {
    const latest = detail.exceptions[0];
    return `Limited ${latest.startDate}–${latest.endDate}`;
  }
  const weekdays = detail.windows.filter((window) => window.dayOfWeek >= 1 && window.dayOfWeek <= 5).length;
  if (!weekdays) return 'No weekly hours configured';
  return `${weekdays} weekday window${weekdays === 1 ? '' : 's'} configured`;
}

function validateAvailability(detail: CrewProfile['availabilityDetail']): string | null {
  if (!detail.timezone.trim()) return 'Availability timezone is required.';
  if (!detail.windows.length) return 'Select at least one availability day.';
  for (const window of detail.windows) {
    if (window.startTime >= window.endTime) return 'Availability windows must have a valid time range.';
  }
  for (const exception of detail.exceptions) {
    if (exception.endDate < exception.startDate) return 'Availability exceptions must have a valid date range.';
  }
  return null;
}

export function createCrewMemberProfile(input: {
  displayName: string;
  role: CrewProfile['role'];
  email: string;
  phone?: string;
  rateShootHour: number;
  rateEditHour: number;
  active?: boolean;
  systemRole?: CrewProfile['systemRole'];
  featureAccess?: CrewProfile['featureAccess'];
}): { ok: true; crew: CrewProfile } | { ok: false; error: string } {
  const displayName = input.displayName.trim();
  const email = normalizeEmail(input.email);
  if (!displayName) return { ok: false, error: 'Crew member name is required.' };
  if (!isValidEmail(email)) return { ok: false, error: 'Valid crew email is required.' };
  if (getHqCrewDirectory().some((item) => item.email.toLowerCase() === email)) {
    return { ok: false, error: 'A crew member with this email already exists.' };
  }
  if (input.rateShootHour < 0 || input.rateEditHour < 0) {
    return { ok: false, error: 'Rates must be non-negative values.' };
  }
  const availabilityDetail = defaultAvailability();
  const crew: CrewProfile = {
    id: nextCrewId(),
    displayName,
    role: input.role,
    systemRole: input.systemRole ?? UserRole.STAFF,
    featureAccess: input.featureAccess,
    email,
    phone: input.phone?.trim() || '',
    rateShootHour: input.rateShootHour,
    rateEditHour: input.rateEditHour,
    active: input.active ?? true,
    assignedProjectIds: [],
    availability: summarizeAvailability(availabilityDetail),
    availabilityDetail,
  };
  void hqUpsertCrew(getHqTenantForWrites(), crew).catch((err) => console.error('[hq] createCrewMemberProfile', err));
  return { ok: true, crew };
}

export function updateCrewMemberProfile(
  crewId: string,
  patch: Partial<{
    displayName: string;
    role: CrewProfile['role'];
    systemRole: CrewProfile['systemRole'];
    featureAccess: CrewProfile['featureAccess'];
    email: string;
    phone?: string;
    rateShootHour: number;
    rateEditHour: number;
    active: boolean;
    availabilityDetail: CrewProfile['availabilityDetail'];
  }>,
): { ok: true; crew: CrewProfile } | { ok: false; error: string } {
  const crew = getHqCrewDirectory().find((item) => item.id === crewId);
  if (!crew) return { ok: false, error: 'Crew member not found.' };

  let next: CrewProfile = { ...crew };

  if (patch.email) {
    const email = normalizeEmail(patch.email);
    if (!isValidEmail(email)) return { ok: false, error: 'Valid crew email is required.' };
    const duplicate = getHqCrewDirectory().find((item) => item.id !== crewId && item.email.toLowerCase() === email);
    if (duplicate) return { ok: false, error: 'A crew member with this email already exists.' };
    next = { ...next, email };
  }
  if (patch.displayName !== undefined) {
    const dn = patch.displayName.trim();
    if (!dn) return { ok: false, error: 'Crew member name is required.' };
    next = { ...next, displayName: dn };
  }
  if (patch.role) next = { ...next, role: patch.role };
  if (patch.systemRole !== undefined) next = { ...next, systemRole: patch.systemRole };
  if (patch.featureAccess !== undefined) next = { ...next, featureAccess: patch.featureAccess };
  if (patch.phone !== undefined) next = { ...next, phone: patch.phone.trim() };
  if (patch.rateShootHour !== undefined) {
    if (patch.rateShootHour < 0) return { ok: false, error: 'Shoot rate must be non-negative.' };
    next = { ...next, rateShootHour: patch.rateShootHour };
  }
  if (patch.rateEditHour !== undefined) {
    if (patch.rateEditHour < 0) return { ok: false, error: 'Edit rate must be non-negative.' };
    next = { ...next, rateEditHour: patch.rateEditHour };
  }
  if (patch.active !== undefined) next = { ...next, active: patch.active };
  if (patch.availabilityDetail) {
    const availabilityError = validateAvailability(patch.availabilityDetail);
    if (availabilityError) return { ok: false, error: availabilityError };
    next = {
      ...next,
      availabilityDetail: patch.availabilityDetail,
      availability: summarizeAvailability(patch.availabilityDetail),
    };
  }
  void hqUpsertCrew(getHqTenantForWrites(), next).catch((err) => console.error('[hq] updateCrewMemberProfile', err));
  return { ok: true, crew: next };
}

export function deleteCrewMemberProfile(
  crewId: string,
): { ok: true } | { ok: false; error: string } {
  const crew = getHqCrewDirectory().find((item) => item.id === crewId);
  if (!crew) return { ok: false, error: 'Crew member not found.' };
  if (crew.assignedProjectIds.length > 0) {
    return { ok: false, error: 'Cannot delete a crew member assigned to projects. Unassign first.' };
  }
  const assignedInProjects = getHqProjectDirectory().some(
    (project) => project.ownerCrewId === crewId || (project.assignedCrewIds || []).includes(crewId),
  );
  if (assignedInProjects) {
    return { ok: false, error: 'Cannot delete a crew member assigned to projects. Unassign first.' };
  }
  void hqDeleteCrew(getHqTenantForWrites(), crewId).catch((err) => console.error('[hq] deleteCrewMemberProfile', err));
  return { ok: true };
}

export function requestCrewPasswordReset(
  crewId: string,
  actorName: string,
): { ok: true; crew: CrewProfile } | { ok: false; error: string } {
  const crew = getHqCrewDirectory().find((item) => item.id === crewId);
  if (!crew) return { ok: false, error: 'Crew member not found.' };
  if (!isValidEmail(crew.email)) return { ok: false, error: 'Crew member email is invalid for reset.' };
  const next: CrewProfile = {
    ...crew,
    lastResetRequestedAt: new Date().toISOString(),
    lastResetRequestedBy: actorName,
  };
  void hqUpsertCrew(getHqTenantForWrites(), next).catch((err) => console.error('[hq] requestCrewPasswordReset', err));
  return { ok: true, crew: next };
}

export function attachMediaToCrewProfile(crewId: string, assetId: string): { ok: boolean; error?: string } {
  const crew = getHqCrewDirectory().find((item) => item.id === crewId);
  if (!crew) return { ok: false, error: 'Crew member not found.' };
  const existing = new Set(crew.mediaAssetIds || []);
  existing.add(assetId);
  const next: CrewProfile = { ...crew, mediaAssetIds: [...existing] };
  void hqUpsertCrew(getHqTenantForWrites(), next).catch((err) => console.error('[hq] attachMediaToCrewProfile', err));
  return { ok: true };
}

export function upsertCrewMediaPolicy(
  crewId: string,
  policy: {
    assetId: string;
    visibility: 'internal' | 'client' | 'hidden';
    usageRights: 'licensed' | 'owned' | 'restricted';
    expiresAt?: string;
  },
): { ok: boolean; error?: string } {
  const crew = getHqCrewDirectory().find((item) => item.id === crewId);
  if (!crew) return { ok: false, error: 'Crew member not found.' };
  const nextPolicies = [...(crew.mediaPolicies || [])];
  const idx = nextPolicies.findIndex((item) => item.assetId === policy.assetId);
  if (idx >= 0) nextPolicies[idx] = policy;
  else nextPolicies.push(policy);
  const next: CrewProfile = { ...crew, mediaPolicies: nextPolicies };
  void hqUpsertCrew(getHqTenantForWrites(), next).catch((err) => console.error('[hq] upsertCrewMediaPolicy', err));
  return { ok: true };
}

export function setCrewTemporaryPassword(
  crewId: string,
  actorName: string,
  temporaryPassword: string,
): { ok: true; crew: CrewProfile } | { ok: false; error: string } {
  const crew = getHqCrewDirectory().find((item) => item.id === crewId);
  if (!crew) return { ok: false, error: 'Crew member not found.' };
  if (temporaryPassword.trim().length < 8) {
    return { ok: false, error: 'Temporary password must be at least 8 characters.' };
  }
  const next: CrewProfile = {
    ...crew,
    lastTempPasswordSetAt: new Date().toISOString(),
    lastTempPasswordSetBy: actorName,
    forcePasswordChange: true,
  };
  void hqUpsertCrew(getHqTenantForWrites(), next).catch((err) => console.error('[hq] setCrewTemporaryPassword', err));
  return { ok: true, crew: next };
}
