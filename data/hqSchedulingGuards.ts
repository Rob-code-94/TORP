import type { CrewProfile } from '../types';
import { getHqCrewDirectory, getProjectByIdSync } from './hqSyncDirectory';

export function projectAssignableCrew(projectId: string): CrewProfile[] {
  const project = getProjectByIdSync(projectId);
  if (!project) return [];
  const allowed = new Set<string>([project.ownerCrewId, ...(project.assignedCrewIds || [])]);
  return getHqCrewDirectory().filter((crew) => allowed.has(crew.id));
}

export function validateProjectAssignee(projectId: string, crewId: string): { ok: boolean; error?: string } {
  const allowed = projectAssignableCrew(projectId);
  if (!allowed.some((crew) => crew.id === crewId)) {
    return { ok: false, error: 'Assignee must be on this project team.' };
  }
  return { ok: true };
}

export function validateProjectAssignees(projectId: string, crewIds: string[]): { ok: boolean; error?: string } {
  if (!crewIds.length) return { ok: false, error: 'Select at least one assignee.' };
  const allowedIds = new Set(projectAssignableCrew(projectId).map((crew) => crew.id));
  const invalid = crewIds.find((crewId) => !allowedIds.has(crewId));
  if (invalid) return { ok: false, error: 'One or more assignees are not on this project team.' };
  return { ok: true };
}

export function validateProjectParticipants(
  projectId: string,
  participants: string[],
): { ok: true; crewIds: string[]; names: string[] } | { ok: false; error: string } {
  const allowed = projectAssignableCrew(projectId);
  const byId = new Map(allowed.map((crew) => [crew.id, crew]));
  const byName = new Map(allowed.map((crew) => [crew.displayName, crew]));
  const crewIds: string[] = [];
  const names: string[] = [];
  for (const participant of participants) {
    const found = byId.get(participant) || byName.get(participant);
    if (!found) return { ok: false, error: `${participant} is not on this project team.` };
    if (!crewIds.includes(found.id)) {
      crewIds.push(found.id);
      names.push(found.displayName);
    }
  }
  return { ok: true, crewIds, names };
}

export function validateCrewAvailabilityForDate(
  projectId: string,
  crewIds: string[],
  date: string,
): { ok: true } | { ok: false; error: string } {
  const allowed = projectAssignableCrew(projectId);
  const byId = new Map(allowed.map((crew) => [crew.id, crew]));
  const dateValue = new Date(`${date}T12:00:00`);
  if (Number.isNaN(dateValue.getTime())) return { ok: false, error: 'A valid schedule date is required.' };
  const day = dateValue.getDay();
  for (const crewId of crewIds) {
    const crew = byId.get(crewId);
    if (!crew) return { ok: false, error: 'One or more selected crew members are not on this project team.' };
    if (!crew.active) return { ok: false, error: `${crew.displayName} is inactive and cannot be scheduled.` };
    const inException = crew.availabilityDetail.exceptions.some(
      (exception) => date >= exception.startDate && date <= exception.endDate,
    );
    if (inException) return { ok: false, error: `${crew.displayName} is unavailable on ${date}.` };
    const hasWindow = crew.availabilityDetail.windows.some((window) => window.dayOfWeek === day);
    if (!hasWindow) return { ok: false, error: `${crew.displayName} has no availability window on ${date}.` };
  }
  return { ok: true };
}
