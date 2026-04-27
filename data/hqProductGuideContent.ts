import type { GuideSection } from '../lib/hqProductGuideModel';

/** Full training copy for the HQ admin shell (filtered per role in code). */
export const ADMIN_GUIDE_SECTIONS: GuideSection[] = [
  {
    id: 'command',
    title: 'Command',
    summary:
      'Your org-wide home: high-level health, quick actions, and a snapshot of what needs attention. Start here for daily check-ins before diving into a specific project.',
    navKeys: ['command'],
  },
  {
    id: 'crew',
    title: 'Crew',
    summary: 'Directory of people, roles, and who is available. Use it to see who is on the team and to prepare call sheets or planning.',
    navKeys: ['crew'],
  },
  {
    id: 'projects',
    title: 'Projects',
    summary:
      'The portfolio of all productions. Open a project to work its brief, schedule, assets, and delivery. Admins and project managers see the full list; crew members only open projects they are assigned to.',
    navKeys: ['projects'],
  },
  {
    id: 'project-detail',
    title: 'Project detail (tabs)',
    summary:
      'Inside a project, tabs organize the job from idea to delivery. Admins and PMs see every tab. Crew on an assigned project use a focused set (no internal Controls, full Financials, or global Activity in the org sense).',
    navKeys: ['project-detail'],
    bullets: [
      {
        title: 'Overview',
        body: 'Status, key dates, and a quick read on where the project stands.',
      },
      { title: 'Brief', body: 'Creative and logistical brief: goals, scope, and references.' },
      {
        title: 'Planner',
        body: 'Project-scoped tasks and planning tied to this production.',
      },
      { title: 'Schedule', body: 'Shoots, meetings, and calendar items for this project.' },
      { title: 'Assets', body: 'Files, uploads, and storage tied to the job (subject to your org’s rules).' },
      { title: 'Deliverables', body: 'What you owe the client, formats, and handoff status.' },
      {
        title: 'Controls (admin / PM)',
        body: 'Internal levers, approvals, and project-level settings—only for roles with access.',
      },
      {
        title: 'Financials (admin / PM)',
        body: 'Quotes, invoices, and project money — hidden from crew in this product area.',
      },
      {
        title: 'Activity (admin / PM)',
        body: 'A running log of changes and notable events for audit and handoffs.',
      },
    ],
  },
  {
    id: 'planner',
    title: 'Planner',
    summary:
      'Cross-project view of work: list, board, and calendar. Use it when you are scheduling across more than one job or checking conflicts.',
    navKeys: ['planner'],
  },
  {
    id: 'financials',
    title: 'Financials',
    summary:
      'Invoices, proposals, and org-level money movement. In default permissions this tab is for administrators; project-level money may appear inside a project depending on your org.',
    navKeys: ['financials'],
  },
  {
    id: 'clients',
    title: 'Clients',
    summary:
      'Client organizations and primary contacts. Link projects to the right company and keep context for comms and delivery. In default setup this tab is for administrators, not project managers.',
    navKeys: ['clients'],
  },
  {
    id: 'settings',
    title: 'Settings',
    summary:
      'Org identity, integrations, profile, security, and notifications. In default permissions this is for administrators. You can also open profile-related items from the account menu when available.',
    navKeys: ['settings'],
  },
];

/** Crew home (`/hq/staff`) — short overview. */
export const STAFF_GUIDE_SECTIONS: GuideSection[] = [
  {
    id: 'staff-home',
    title: 'Crew home',
    summary:
      'Your day-to-day hub: what you are assigned to, today’s shoots or tasks, and quick links. Use the profile menu (top) for your account, photo, and notifications.',
    navKeys: ['staff-limited-intro'],
  },
  {
    id: 'staff-open-projects',
    title: 'Opening a project',
    summary:
      'When a project is assigned to you, open it from your dashboard or a link. You land in the admin-style project view with a focused set of tabs: Overview, Brief, Planner, Schedule, Assets, and Deliverables—without org-wide money or internal controls.',
    navKeys: ['staff-limited-intro'],
  },
  {
    id: 'staff-limited',
    title: 'Limited admin view',
    summary:
      'If you are inside `/hq/admin` on a project, the sidebar is intentionally minimal. Use “Crew home” in the sidebar to return to your portal. The Guide in the header still explains the product for training—including tabs you may not have yet.',
    navKeys: ['staff-limited-intro'],
  },
];

const clientSections: GuideSection[] = [
  {
    id: 'client-home',
    title: 'Client suite',
    summary:
      'A simplified view of your productions with TORP: what is in progress, what is coming up, and how to get deliverables. Use the Guide in the header whenever you need a quick reminder of what each part does.',
    navKeys: ['staff-limited-intro'],
  },
  {
    id: 'client-delivery',
    title: 'Deliverables and comms',
    summary:
      'Project-specific areas show status of delivery and any actions that need your attention. If something looks wrong, use your normal contact with the production team.',
    navKeys: ['staff-limited-intro'],
  },
];

export const CLIENT_GUIDE_SECTIONS: GuideSection[] = clientSections;
