import type { Config, DriveStep } from 'driver.js';
import { UserRole } from '../types';

const TOUR_POPOVER_CLASS = 'torp-driver-popover';
const TOUR_STYLE_ID = 'torp-driver-tour-style';

export type TourRole = UserRole.ADMIN | UserRole.PROJECT_MANAGER | UserRole.STAFF;

export type TourPackId =
  | 'admin-command'
  | 'admin-projects'
  | 'admin-planner'
  | 'admin-crew'
  | 'admin-financials'
  | 'admin-clients'
  | 'admin-settings'
  | 'project-detail-full'
  | 'project-detail-staff'
  | 'staff-home'
  | 'staff-settings';

type TourStepDef = {
  id: string;
  title: string;
  description: string;
  descriptionByRole?: Partial<Record<TourRole, string>>;
  selector?: string;
  roles?: TourRole[];
  requiresNavIds?: string[];
};

type TourPack = {
  id: TourPackId;
  routePrefixes: string[];
  roles: TourRole[];
  steps: TourStepDef[];
};

export type TourContext = {
  pathname: string;
  role: TourRole;
  allowedNavIds?: string[];
};

const PACKS: TourPack[] = [
  {
    id: 'admin-command',
    routePrefixes: ['/hq/admin', '/hq/admin/'],
    roles: [UserRole.ADMIN, UserRole.PROJECT_MANAGER],
    steps: [
      { id: 'welcome', title: 'Welcome', description: 'Command is your daily operating start point.' },
      { id: 'shell', title: 'Navigation', description: 'Use sidebar modules to move from triage to execution.', selector: '#hq-sidebar' },
      { id: 'guide', title: 'Product guide', description: 'Use this to relaunch tours or read role-aware help.', selector: '[data-tour="hq-header-guide"]' },
      {
        id: 'quick',
        title: 'Quick actions',
        description: 'Create key records here without leaving the page.',
        descriptionByRole: {
          [UserRole.ADMIN]: 'Use this panel to create clients, projects, tasks, and shoots quickly.',
          [UserRole.PROJECT_MANAGER]:
            'Use this panel to move delivery forward quickly; if a client action is restricted, hand off to Admin.',
        },
        selector: '[data-tour="command-quick-actions"]',
      },
      {
        id: 'kpi',
        title: 'KPI snapshot',
        description: 'Use KPIs to spot blockers and urgent work.',
        descriptionByRole: {
          [UserRole.ADMIN]: 'Use these KPIs to prioritize org-level risk, approvals, and cash-health decisions.',
          [UserRole.PROJECT_MANAGER]:
            'Use these KPIs to prioritize team execution and flag any finance/client escalations to Admin.',
        },
        selector: '[data-tour="command-kpis"]',
      },
      {
        id: 'priority',
        title: 'Priority feed',
        description: 'Work top-down through urgent tasks and near-term shoots.',
        descriptionByRole: {
          [UserRole.ADMIN]: 'Clear urgent tasks and shoot issues here before switching to project detail.',
          [UserRole.PROJECT_MANAGER]:
            'Use this as your execution queue: clear urgent items, then route blockers to the right owner.',
        },
        selector: '[data-tour="command-priority-feed"]',
      },
      { id: 'storage', title: 'Storage ops', description: 'Resolve failed links/retries so delivery stays on track.', selector: '[data-tour="command-storage-ops"]' },
    ],
  },
  {
    id: 'admin-projects',
    routePrefixes: ['/hq/admin/projects'],
    roles: [UserRole.ADMIN, UserRole.PROJECT_MANAGER],
    steps: [
      {
        id: 'header',
        title: 'Projects workspace',
        description: 'Manage project lifecycle from inquiry to archive.',
        descriptionByRole: {
          [UserRole.ADMIN]: 'Use this workspace to oversee portfolio health and standardize stage progression.',
          [UserRole.PROJECT_MANAGER]:
            'Use this workspace to run active delivery and keep each project moving to the next stage.',
        },
        selector: '[data-tour="projects-header"]',
      },
      { id: 'search', title: 'Search and filters', description: 'Find projects by title/client and narrow stage.', selector: '[data-tour="projects-search"]' },
      { id: 'modes', title: 'View modes', description: 'Switch list/board/calendar based on your workflow.', selector: '[data-tour="projects-view-modes"]' },
      {
        id: 'lanes',
        title: 'Stage lanes',
        description: 'Use lanes to see pipeline pressure and move work.',
        descriptionByRole: {
          [UserRole.ADMIN]: 'Use lanes for portfolio balancing and intervention decisions across teams.',
          [UserRole.PROJECT_MANAGER]:
            'Use lanes to unblock day-to-day execution and maintain realistic delivery pacing.',
        },
        selector: '[data-tour="projects-stage-lanes"]',
      },
      {
        id: 'open',
        title: 'Open detail',
        description: 'Open project detail to run brief, schedule, assets, and deliverables.',
        descriptionByRole: {
          [UserRole.ADMIN]: 'Open detail for full governance controls, financial context, and cross-functional visibility.',
          [UserRole.PROJECT_MANAGER]:
            'Open detail to execute project operations; use available tabs to keep work moving end to end.',
        },
        selector: '[data-tour="projects-open-detail"]',
      },
    ],
  },
  {
    id: 'admin-planner',
    routePrefixes: ['/hq/admin/planner'],
    roles: [UserRole.ADMIN, UserRole.PROJECT_MANAGER],
    steps: [
      {
        id: 'header',
        title: 'Planner workspace',
        description: 'Coordinate cross-project execution here.',
        descriptionByRole: {
          [UserRole.ADMIN]: 'Use Planner for portfolio-level scheduling visibility and risk intervention.',
          [UserRole.PROJECT_MANAGER]:
            'Use Planner as your primary production board for sequencing, ownership, and due-date control.',
        },
        selector: '[data-tour="planner-header"]',
      },
      { id: 'quick-cal', title: 'Quick calendar', description: 'Add calendar items rapidly for schedule changes.', selector: '[data-tour="planner-quick-calendar"]' },
      { id: 'modes', title: 'Planner modes', description: 'Calendar for timing, list for triage, board for flow.', selector: '[data-tour="planner-view-modes"]' },
      { id: 'main', title: 'Main content', description: 'Execute tasks, priorities, and due dates across projects.', selector: '[data-tour="planner-main-content"]' },
      { id: 'actions', title: 'Task actions', description: 'Attach assets and update status for handoffs.', selector: '[data-tour="planner-task-actions"]' },
    ],
  },
  {
    id: 'admin-crew',
    routePrefixes: ['/hq/admin/crew'],
    roles: [UserRole.ADMIN, UserRole.PROJECT_MANAGER],
    steps: [
      {
        id: 'header',
        title: 'Crew directory',
        description: 'Manage people, roles, and access.',
        descriptionByRole: {
          [UserRole.ADMIN]: 'Admins can manage access, rates, and account controls from this area.',
          [UserRole.PROJECT_MANAGER]:
            'Project Managers use this mostly as a read-only directory for staffing and assignment context.',
        },
        selector: '[data-tour="crew-header"]',
      },
      { id: 'filters', title: 'Crew filters', description: 'Filter directory by role and activity.', selector: '[data-tour="crew-filters"]' },
      { id: 'list', title: 'Crew list', description: 'Open profiles to edit rates, availability, and permissions.', selector: '[data-tour="crew-list"]' },
      { id: 'editor', title: 'Crew editor', description: 'Admin can update access and profile settings here.', selector: '[data-tour="crew-editor"]', roles: [UserRole.ADMIN] },
    ],
  },
  {
    id: 'admin-financials',
    routePrefixes: ['/hq/admin/financials'],
    roles: [UserRole.ADMIN, UserRole.PROJECT_MANAGER],
    steps: [
      {
        id: 'header',
        title: 'Financials overview',
        description: 'Track invoices, proposals, and cash state.',
        descriptionByRole: {
          [UserRole.ADMIN]: 'Use Financials for org-level invoice control and cash tracking.',
          [UserRole.PROJECT_MANAGER]:
            'If your role has Financials access, use this for project billing visibility and coordination.',
        },
        selector: '[data-tour="financials-header"]',
        requiresNavIds: ['financials'],
      },
      { id: 'kpi', title: 'Financial KPIs', description: 'Review open AR and active project finance load.', selector: '[data-tour="financials-kpis"]', requiresNavIds: ['financials'] },
      { id: 'filters', title: 'Invoice filters', description: 'Slice invoice lists by status, date, and project.', selector: '[data-tour="financials-filters"]', requiresNavIds: ['financials'] },
      { id: 'table', title: 'Invoice table', description: 'Use row actions for sent/paid/edit lifecycle.', selector: '[data-tour="financials-invoices"]', requiresNavIds: ['financials'] },
      { id: 'proposals', title: 'Proposals', description: 'Review proposal pipeline and status progression.', selector: '[data-tour="financials-proposals"]', requiresNavIds: ['financials'] },
    ],
  },
  {
    id: 'admin-clients',
    routePrefixes: ['/hq/admin/clients'],
    roles: [UserRole.ADMIN, UserRole.PROJECT_MANAGER],
    steps: [
      {
        id: 'header',
        title: 'Client profiles',
        description: 'This is your client record source of truth.',
        descriptionByRole: {
          [UserRole.ADMIN]: 'Use this as the canonical client system for org relationships and handoffs.',
          [UserRole.PROJECT_MANAGER]:
            'If enabled for your role, use this to verify client context before project operations.',
        },
        selector: '[data-tour="clients-header"]',
        requiresNavIds: ['clients'],
      },
      { id: 'filters', title: 'Search and relationship filters', description: 'Find active/prospect clients quickly.', selector: '[data-tour="clients-filters"]', requiresNavIds: ['clients'] },
      { id: 'list', title: 'Client list', description: 'Open or edit profiles and verify linked projects.', selector: '[data-tour="clients-list"]', requiresNavIds: ['clients'] },
      { id: 'drawer', title: 'Quick add/edit drawer', description: 'Create or update client data for project setup.', selector: '[data-tour="clients-drawer"]', requiresNavIds: ['clients'] },
    ],
  },
  {
    id: 'admin-settings',
    routePrefixes: ['/hq/admin/settings'],
    roles: [UserRole.ADMIN, UserRole.PROJECT_MANAGER],
    steps: [
      {
        id: 'header',
        title: 'Settings home',
        description: 'Manage profile, notifications, security, and integrations.',
        descriptionByRole: {
          [UserRole.ADMIN]: 'Admins can manage both personal settings and organization-level setup from here.',
          [UserRole.PROJECT_MANAGER]:
            'Use this area for personal account settings and allowed workspace preferences.',
        },
        selector: '[data-tour="settings-header"]',
      },
      { id: 'tabs', title: 'Settings tabs', description: 'Switch sections from mobile pills or desktop left rail.', selector: '[data-tour="settings-shell"]' },
      { id: 'content', title: 'Settings content', description: 'Each tab contains its own save/reset workflow.', selector: '[data-tour="settings-content"]' },
    ],
  },
  {
    id: 'project-detail-full',
    routePrefixes: ['/hq/admin/projects/'],
    roles: [UserRole.ADMIN, UserRole.PROJECT_MANAGER],
    steps: [
      { id: 'head', title: 'Project header', description: 'Check stage, due date, and owner before editing.', selector: '[data-tour="project-header"]' },
      { id: 'tabs', title: 'Project tabs', description: 'Run lifecycle work tab by tab from overview to activity.', selector: '[data-tour="project-tabs"]' },
      { id: 'content', title: 'Active tab panel', description: 'Complete key work in the active tab before moving on.', selector: '[data-tour="project-tab-content"]' },
      { id: 'controls', title: 'Controls and financial tabs', description: 'These tabs are for admin/PM oversight and governance.', selector: '[data-tour="project-tab-controls"]' },
    ],
  },
  {
    id: 'project-detail-staff',
    routePrefixes: ['/hq/admin/projects/'],
    roles: [UserRole.STAFF],
    steps: [
      { id: 'head', title: 'Project header', description: 'Use this page to execute your assigned project work clearly and on schedule.', selector: '[data-tour="project-header"]' },
      { id: 'tabs', title: 'Crew tab set', description: 'You have a focused tab set: overview, brief, planner, schedule, assets, and deliverables.', selector: '[data-tour="project-tabs"]' },
      { id: 'content', title: 'Active work area', description: 'Complete your task, update status, and keep the next handoff unblocked.', selector: '[data-tour="project-tab-content"]' },
    ],
  },
  {
    id: 'staff-home',
    routePrefixes: ['/hq/staff'],
    roles: [UserRole.STAFF],
    steps: [
      { id: 'header', title: 'Crew home', description: 'Start here each day to see assignments, shoots, and what to do next.', selector: '[data-tour="staff-home-header"]' },
      { id: 'profile', title: 'Profile summary', description: 'Check role/contact details so scheduling stays accurate.', selector: '[data-tour="staff-profile"]' },
      { id: 'availability', title: 'Availability', description: 'Update your work window and exceptions so producers can schedule you correctly.', selector: '[data-tour="staff-availability"]' },
      { id: 'tasks', title: 'My assignments', description: 'Move your assignments forward and keep statuses up to date.', selector: '[data-tour="staff-assignments"]' },
      { id: 'projects', title: 'My projects', description: 'Open each assigned project to execute deliverables and next steps.', selector: '[data-tour="staff-projects"]' },
      { id: 'shoots', title: 'Call sheets', description: 'Prepare shoot logistics and print call sheets when needed.', selector: '[data-tour="staff-shoots"]' },
    ],
  },
  {
    id: 'staff-settings',
    routePrefixes: ['/hq/staff/settings'],
    roles: [UserRole.STAFF],
    steps: [
      { id: 'header', title: 'Staff settings', description: 'Manage your account preferences and security.', selector: '[data-tour="settings-header"]' },
      { id: 'tabs', title: 'Settings sections', description: 'Use tabs to switch profile, notifications, security, and integrations.', selector: '[data-tour="settings-shell"]' },
      { id: 'content', title: 'Settings forms', description: 'Save updates in each section to keep your account current.', selector: '[data-tour="settings-content"]' },
    ],
  },
];

function ensureTourStyles() {
  if (document.getElementById(TOUR_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = TOUR_STYLE_ID;
  style.textContent = `
.${TOUR_POPOVER_CLASS} {
  max-width: min(340px, calc(100vw - 24px));
  font-size: 14px;
}
.${TOUR_POPOVER_CLASS} .driver-popover-title {
  font-size: 15px;
  line-height: 1.2;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.${TOUR_POPOVER_CLASS} .driver-popover-description {
  font-size: 13px;
  line-height: 1.35;
}
.${TOUR_POPOVER_CLASS} .driver-popover-progress-text {
  font-size: 12px;
}
.${TOUR_POPOVER_CLASS} .driver-popover-navigation-btns button {
  font-size: 12px;
}
`;
  document.head.appendChild(style);
}

function packForRoute(pathname: string, role: TourRole): TourPack | null {
  const isProjectDetail = /^\/hq\/admin\/projects\/[^/]+\/?$/.test(pathname);
  if (isProjectDetail && role === UserRole.STAFF) {
    return PACKS.find((pack) => pack.id === 'project-detail-staff') || null;
  }
  if (isProjectDetail) {
    return PACKS.find((pack) => pack.id === 'project-detail-full') || null;
  }
  const candidates = PACKS.filter((pack) => pack.roles.includes(role))
    .map((pack) => ({
      pack,
      matchLen: pack.routePrefixes
        .filter((prefix) => pathname.startsWith(prefix))
        .reduce((max, prefix) => Math.max(max, prefix.length), -1),
    }))
    .filter((x) => x.matchLen >= 0)
    .sort((a, b) => b.matchLen - a.matchLen);
  return candidates[0]?.pack || null;
}

export function resolveTourPackId(pathname: string, role: TourRole): TourPackId | null {
  return packForRoute(pathname, role)?.id || null;
}

function stepAllowed(step: TourStepDef, ctx: TourContext): boolean {
  if (step.roles && !step.roles.includes(ctx.role)) return false;
  if (step.requiresNavIds && step.requiresNavIds.length > 0) {
    const allowed = new Set(ctx.allowedNavIds || []);
    if (!step.requiresNavIds.some((id) => allowed.has(id))) return false;
  }
  return true;
}

export function buildTourStepsForContext(
  ctx: TourContext,
  hasSelector: (selector: string) => boolean
): DriveStep[] {
  const pack = packForRoute(ctx.pathname, ctx.role);
  if (!pack) return [];

  const out: DriveStep[] = [];
  for (const step of pack.steps) {
    if (!stepAllowed(step, ctx)) continue;
    if (step.selector && !hasSelector(step.selector)) continue;
    out.push({
      ...(step.selector ? { element: step.selector } : {}),
      popover: {
        title: step.title,
        description: step.descriptionByRole?.[ctx.role] ?? step.description,
        popoverClass: TOUR_POPOVER_CLASS,
      },
    });
  }
  return out;
}

function selectorVisible(selector: string): boolean {
  const nodes = Array.from(document.querySelectorAll<HTMLElement>(selector));
  if (nodes.length === 0) return false;
  return nodes.some((node) => {
    const rect = node.getBoundingClientRect();
    const style = window.getComputedStyle(node);
    return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
  });
}

export async function startHqAdminShellTour(ctx: TourContext): Promise<boolean> {
  ensureTourStyles();
  await import('driver.js/dist/driver.css');
  const { driver } = await import('driver.js');

  const steps = buildTourStepsForContext(ctx, selectorVisible);
  if (steps.length === 0) return false;

  const config: Config = {
    showProgress: true,
    showButtons: ['next', 'close'],
    progressText: '{{current}} / {{total}}',
    steps,
  };
  const d = driver(config);
  d.drive();
  return true;
}
