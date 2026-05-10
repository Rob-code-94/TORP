import { getHqProjectDirectory } from '../data/hqSyncDirectory';
import type { AdminShoot } from '../types';

export function isShootVisibleToCrew(shoot: AdminShoot, crewId: string | null | undefined): boolean {
  if (!crewId) return false;
  if (shoot.crewIds?.includes(crewId)) return true;
  const p = getHqProjectDirectory().find((x) => x.id === shoot.projectId);
  if (!p) return false;
  if (p.ownerCrewId === crewId) return true;
  return (p.assignedCrewIds || []).includes(crewId);
}
