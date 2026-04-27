import {
  ADMIN_GUIDE_SECTIONS,
  CLIENT_GUIDE_SECTIONS,
  STAFF_GUIDE_SECTIONS,
} from '../data/hqProductGuideContent';
import type { AuthUser } from './auth';
import { hqAdminNavIdsForUser } from './hqAccess';
import type { GuideNavKey, GuideSection, GuideSurface } from './hqProductGuideModel';
import { UserRole } from '../types';

function sectionVisibleForAdminNav(
  section: GuideSection,
  allowed: ReadonlySet<GuideNavKey>
): boolean {
  return section.navKeys.some((key) => {
    if (key === 'project-detail') {
      return allowed.has('projects');
    }
    if (key === 'staff-limited-intro') {
      return false;
    }
    return allowed.has(key);
  });
}

/**
 * Returns guide sections for the current viewer. Admin/PM use `hqAdminNavIdsForUser`
 * (same rules as the sidebar). STAFF in the admin shell on a project see project
 * detail plus crew-specific context.
 */
export function getGuideSectionsForContext(input: {
  surface: GuideSurface;
  user: AuthUser | null;
  /**
   * True when a crew member is on `/hq/admin/projects/:id` (limited admin chrome).
   */
  staffInAdminProject?: boolean;
}): GuideSection[] {
  const { surface, user, staffInAdminProject } = input;

  if (surface === 'client') {
    return [...CLIENT_GUIDE_SECTIONS];
  }
  if (surface === 'staff') {
    return [...STAFF_GUIDE_SECTIONS];
  }

  if (surface === 'admin') {
    if (!user) {
      return [];
    }

    if (user.role === UserRole.STAFF) {
      if (staffInAdminProject) {
        const projectDetail = ADMIN_GUIDE_SECTIONS.find((s) => s.id === 'project-detail');
        if (!projectDetail) {
          return [...STAFF_GUIDE_SECTIONS];
        }
        return [projectDetail, ...STAFF_GUIDE_SECTIONS];
      }
      return [];
    }

    const navIds = hqAdminNavIdsForUser(user);
    const allowed = new Set<GuideNavKey>(navIds);
    if (navIds.includes('projects')) {
      allowed.add('project-detail');
    }

    const filtered = ADMIN_GUIDE_SECTIONS.filter((s) => sectionVisibleForAdminNav(s, allowed));
    return filtered.length > 0 ? filtered : [];
  }

  return [];
}
