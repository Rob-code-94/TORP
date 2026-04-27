import type { HqAdminNavId } from './hqAccess';

/**
 * Where the guide is shown. Used to pick copy sets and filter depth.
 * Stable for future spotlight tours (step targets use section `id`).
 */
export type GuideSurface = 'admin' | 'staff' | 'client';

/**
 * Which HQ admin area a section belongs to. `project-detail` is the project
 * profile tabs under `/hq/admin/projects/:id`. `staff-limited-intro` is only
 * for crew members in the admin shell on an assigned project.
 */
export type GuideNavKey = HqAdminNavId | 'project-detail' | 'staff-limited-intro';

export type GuideBullet = {
  title: string;
  body: string;
};

/**
 * One guide section (accordion item or card). `id` is kebab-case and stable
 * for anchors and `data-tour` / Driver.js steps.
 */
export type GuideSection = {
  id: string;
  title: string;
  /** Short lead paragraph */
  summary: string;
  /** Optional nested points (e.g. project tabs) */
  bullets?: GuideBullet[];
  /**
   * Section is shown if any key matches the viewer’s effective admin nav
   * (see `getGuideSectionsForContext`), with special handling for
   * `project-detail` and `staff-limited-intro`.
   */
  navKeys: GuideNavKey[];
};
