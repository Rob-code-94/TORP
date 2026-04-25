import { UserRole } from '../types';

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

export function hqAdminNavIdsForRole(role: UserRole | null | undefined): HqAdminNavId[] {
  if (role === UserRole.PROJECT_MANAGER) {
    return ALL_HQ_ADMIN_NAV.filter((id) => PROJECT_MANAGER_NAV.has(id));
  }
  if (role === UserRole.ADMIN) {
    return [...ALL_HQ_ADMIN_NAV];
  }
  return [];
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
