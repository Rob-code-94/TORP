import type { AuthUser } from './auth';
import { getHqCrewDirectory, getProjectByIdSync } from '../data/hqSyncDirectory';
import { UserRole, type CrewFeatureKey, type CrewProfile } from '../types';

/**
 * Org-level HQ admin shell visibility (not project-scoped capabilities).
 * Project managers see a subset of admin routes by default.
 */
export type HqAdminNavId =
  | 'command'
  | 'crew'
  | 'projects'
  | 'planner'
  | 'financials'
  | 'clients'
  | 'settings';

const ALL_HQ_ADMIN_NAV: HqAdminNavId[] = [
  'command',
  'crew',
  'projects',
  'planner',
  'financials',
  'clients',
  'settings',
];

const PROJECT_MANAGER_NAV: ReadonlySet<HqAdminNavId> = new Set([
  'command',
  'crew',
  'projects',
  'planner',
]);

const NAV_FEATURE_REQUIREMENT: Partial<Record<HqAdminNavId, CrewFeatureKey>> = {
  clients: 'page.clients',
  financials: 'page.financials',
  settings: 'page.settings',
};

const ROLE_DEFAULT_FEATURES: Record<UserRole, Partial<Record<CrewFeatureKey, boolean>>> = {
  [UserRole.PUBLIC]: {},
  [UserRole.CLIENT]: {},
  [UserRole.STAFF]: {
    'quick.addClient': false,
    'page.clients': false,
    'quick.addProject': false,
    'page.financials': false,
    'quick.addTaskShoot': false,
    'page.settings': false,
  },
  [UserRole.PROJECT_MANAGER]: {
    'quick.addClient': false,
    'page.clients': false,
    'quick.addProject': true,
    'page.financials': false,
    'quick.addTaskShoot': true,
    'page.settings': false,
  },
  [UserRole.ADMIN]: {
    'quick.addClient': true,
    'page.clients': true,
    'quick.addProject': true,
    'page.financials': true,
    'quick.addTaskShoot': true,
    'page.settings': true,
  },
};

export function hqAdminNavIdsForRole(role: UserRole | null | undefined): HqAdminNavId[] {
  if (role === UserRole.PROJECT_MANAGER) {
    return ALL_HQ_ADMIN_NAV.filter((id) => PROJECT_MANAGER_NAV.has(id));
  }
  if (role === UserRole.ADMIN) {
    return [...ALL_HQ_ADMIN_NAV];
  }
  return [];
}

export function getCrewByAuthUser(user: AuthUser | null | undefined): CrewProfile | undefined {
  if (!user) return undefined;
  const crew = getHqCrewDirectory();
  if (user.crewId) {
    const byId = crew.find((c) => c.id === user.crewId);
    if (byId) return byId;
  }
  const email = user.email?.trim().toLowerCase();
  if (!email) return undefined;
  return crew.find((c) => c.email.trim().toLowerCase() === email);
}

/** STAFF may open `/hq/admin/projects/:projectId` for assigned (or owner) projects only. */
export function staffCanViewProject(user: AuthUser, projectId: string): boolean {
  if (user.role !== UserRole.STAFF || !user.crewId) return false;
  const p = getProjectByIdSync(projectId);
  if (!p) return false;
  if (p.ownerCrewId === user.crewId) return true;
  return (p.assignedCrewIds || []).includes(user.crewId);
}

function projectIdFromHqAdminProjectsDetail(pathname: string): string | null {
  const m = pathname.match(/^\/hq\/admin\/projects\/([^/]+)\/?$/);
  if (!m || !m[1]) return null;
  return m[1];
}

export function hasHqFeatureAccess(
  user: AuthUser | null | undefined,
  feature: CrewFeatureKey
): boolean {
  if (!user) return false;
  const roleDefault = Boolean(ROLE_DEFAULT_FEATURES[user.role]?.[feature]);
  const crew = getCrewByAuthUser(user);
  const override = crew?.featureAccess?.[feature];
  return override === undefined ? roleDefault : override;
}

export function resolveHqAdminNavId(pathname: string): HqAdminNavId | null {
  if (pathname === '/hq/admin' || pathname === '/hq/admin/') return 'command';
  if (pathname.startsWith('/hq/admin/crew')) return 'crew';
  if (pathname.startsWith('/hq/admin/projects')) return 'projects';
  if (pathname.startsWith('/hq/admin/planner')) return 'planner';
  if (pathname.startsWith('/hq/admin/financials')) return 'financials';
  if (pathname.startsWith('/hq/admin/clients')) return 'clients';
  if (pathname.startsWith('/hq/admin/settings')) return 'settings';
  return null;
}

export function canHqAdminAccessPath(pathname: string, role: UserRole | null | undefined): boolean {
  if (role !== UserRole.PROJECT_MANAGER) return true;
  const navId = resolveHqAdminNavId(pathname);
  if (!navId) return true;
  return PROJECT_MANAGER_NAV.has(navId);
}

export function hqAdminNavIdsForUser(user: AuthUser | null | undefined): HqAdminNavId[] {
  if (!user) return [];
  const candidateNav =
    user.role === UserRole.ADMIN
      ? [...ALL_HQ_ADMIN_NAV]
      : user.role === UserRole.PROJECT_MANAGER
        ? [...ALL_HQ_ADMIN_NAV]
        : [];
  return candidateNav.filter((navId) => {
    const feature = NAV_FEATURE_REQUIREMENT[navId];
    if (!feature) {
      if (user.role === UserRole.ADMIN) return true;
      if (user.role === UserRole.PROJECT_MANAGER) return PROJECT_MANAGER_NAV.has(navId);
      return false;
    }
    return hasHqFeatureAccess(user, feature);
  });
}

export function canHqAdminAccessPathForUser(
  pathname: string,
  user: AuthUser | null | undefined
): boolean {
  if (!user) return false;
  if (user.role === UserRole.STAFF) {
    const projectId = projectIdFromHqAdminProjectsDetail(pathname);
    if (projectId) return staffCanViewProject(user, projectId);
    return false;
  }
  const navId = resolveHqAdminNavId(pathname);
  // Default-deny: any /hq/admin/* path that resolveHqAdminNavId does not
  // explicitly map is blocked. Adding a new admin route therefore requires
  // updating the resolver, preventing accidental access leaks.
  if (!navId) return false;
  const feature = NAV_FEATURE_REQUIREMENT[navId];
  if (!feature) return canHqAdminAccessPath(pathname, user.role);
  return hasHqFeatureAccess(user, feature);
}
