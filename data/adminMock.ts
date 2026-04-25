import type {
  ActivityEntry,
  AdminInvoice,
  AdminProject,
  AdminProposal,
  AdminShoot,
  ClientProfile,
  CrewProfile,
  PlannerItem,
  ProjectAsset,
  ProjectExpense,
} from '../types';

export const MOCK_CLIENTS: ClientProfile[] = [
  {
    id: 'cl-1',
    name: 'Jordan Team',
    company: 'Jordan Brand',
    email: 'prod@jordan.nike.com',
    phone: '(312) 555-0140',
    city: 'Chicago, IL',
    notes: 'High-touch brand; prefers overnight review windows.',
    projectIds: ['p1'],
  },
  {
    id: 'cl-2',
    name: 'Community Lead',
    company: 'Franklin County',
    email: 'media@franklincounty.gov',
    phone: '(614) 555-0199',
    city: 'Columbus, OH',
    notes: 'Civic approvals; add VO + captions deliverable every time.',
    projectIds: ['p2'],
  },
  {
    id: 'cl-3',
    name: 'Retail Director',
    company: 'Sole Classics',
    email: 'creative@soleclassics.com',
    phone: '(614) 555-0101',
    city: 'Columbus, OH',
    notes: 'Retail + social; fast turnaround on verticals.',
    projectIds: ['p3', 'p4'],
  },
];

export const MOCK_CREW: CrewProfile[] = [
  {
    id: 'cr-1',
    displayName: 'A. Vance',
    role: 'director',
    email: 'a@torp.life',
    rateShootHour: 175,
    rateEditHour: 75,
    active: true,
    assignedProjectIds: ['p1', 'p3'],
    availability: 'W14–W16 · mostly clear',
  },
  {
    id: 'cr-2',
    displayName: 'M. Reyes',
    role: 'dp',
    email: 'm@torp.life',
    rateShootHour: 100,
    rateEditHour: 75,
    active: true,
    assignedProjectIds: ['p1', 'p2'],
    availability: 'On location Mar 20–22',
  },
  {
    id: 'cr-3',
    displayName: 'J. Park',
    role: 'editor',
    email: 'j@torp.life',
    rateShootHour: 100,
    rateEditHour: 75,
    active: true,
    assignedProjectIds: ['p2', 'p4'],
    availability: 'Post-heavy week',
  },
];

export const MOCK_ADMIN_PROJECTS: AdminProject[] = [
  {
    id: 'p1',
    title: 'Blacktop: Spring Push',
    clientId: 'cl-1',
    clientName: 'Jordan Brand',
    packageLabel: 'Essentials (5h / 5 deliverables)',
    stage: 'editing',
    status: 'active',
    budget: 42000,
    dueDate: '2025-04-12',
    ownerCrewId: 'cr-1',
    ownerName: 'A. Vance',
    summary: 'Hero 60s + 9×16 suite; grade locked by Apr 1.',
    brief: 'Match energy with chain nets, hand speed, and after-dark color. No generic gym stock.',
    goals: 'Lift SNKRS + retail windows; 3s hook for social.',
    nextMilestone: 'V3 color lock for client review',
    deliverables: ['60s master', '2× 15s', '6× 9×16', 'stills set'],
    contactEmail: 'prod@jordan.nike.com',
    location: 'Chicago, IL',
  },
  {
    id: 'p2',
    title: 'We Are: Spring Anthem',
    clientId: 'cl-2',
    clientName: 'Franklin County',
    packageLabel: 'Custom doc + 30s cutdowns',
    stage: 'in_production',
    status: 'active',
    budget: 28000,
    dueDate: '2025-05-01',
    ownerCrewId: 'cr-2',
    ownerName: 'M. Reyes',
    summary: '3 min civic anthem + VO; courthouse + neighborhood blocks.',
    brief: 'Institutional but warm. Avoid partisan cues; lead with people + place.',
    goals: 'Event premiere + YouTube; ADA captions required.',
    nextMilestone: 'B-roll day 2 complete',
    deliverables: ['3 min anthem', '2× 30s', 'VO + captions', 'stills'],
    contactEmail: 'media@franklincounty.gov',
    location: 'Franklin County, OH',
  },
  {
    id: 'p3',
    title: 'Floor 2 Launch',
    clientId: 'cl-3',
    clientName: 'Sole Classics',
    packageLabel: 'Product + lookbook (custom)',
    stage: 'client_review',
    status: 'active',
    budget: 12500,
    dueDate: '2025-03-28',
    ownerCrewId: 'cr-1',
    ownerName: 'A. Vance',
    summary: '45s retail hero + lookbook; client waiting on v2 stills.',
    brief: 'Shelf-to-street; macro texture + fit.',
    goals: 'Paid social + in-store loop.',
    nextMilestone: 'Client feedback on v2',
    deliverables: ['45s master', 'still set', 'paid social cutdowns'],
    contactEmail: 'creative@soleclassics.com',
    location: 'Columbus, OH',
  },
  {
    id: 'p4',
    title: 'Podcast — Block Talk Ep. 12',
    clientId: 'cl-3',
    clientName: 'Sole Classics',
    packageLabel: 'Podcast pack (1 ep)',
    stage: 'intake',
    status: 'active',
    budget: 800,
    dueDate: '2025-04-20',
    ownerCrewId: 'cr-3',
    ownerName: 'J. Park',
    summary: '3h record block; 1h ep + promos.',
    brief: 'Tight set; 2-cam; minimal lighting footprint.',
    goals: '3 promos for IG + YT same week.',
    nextMilestone: 'Date confirmation + call sheet',
    deliverables: ['1h MP4 + MP3 + WAV', '3 promos 30–60s'],
    contactEmail: 'creative@soleclassics.com',
    location: 'Sole Classics Studio',
  },
];

export const MOCK_PLANNER: PlannerItem[] = [
  {
    id: 't1',
    projectId: 'p1',
    projectTitle: 'Blacktop: Spring Push',
    clientName: 'Jordan Brand',
    type: 'edit',
    title: 'V3 color lock + sound pass',
    column: 'client_review',
    priority: 'urgent',
    dueDate: '2025-04-01',
    assigneeCrewId: 'cr-3',
    assigneeName: 'J. Park',
    done: false,
    notes: 'Client review EOD',
  },
  {
    id: 't2',
    projectId: 'p1',
    projectTitle: 'Blacktop: Spring Push',
    clientName: 'Jordan Brand',
    type: 'review',
    title: 'Audio mix review',
    column: 'post',
    priority: 'high',
    dueDate: '2025-04-02',
    assigneeCrewId: 'cr-1',
    assigneeName: 'A. Vance',
    done: false,
  },
  {
    id: 't3',
    projectId: 'p2',
    projectTitle: 'We Are: Spring Anthem',
    clientName: 'Franklin County',
    type: 'shoot',
    title: 'B-roll: courthouse exteriors',
    column: 'active',
    priority: 'high',
    dueDate: '2025-04-10',
    assigneeCrewId: 'cr-2',
    assigneeName: 'M. Reyes',
    done: false,
  },
  {
    id: 't4',
    projectId: 'p2',
    projectTitle: 'We Are: Spring Anthem',
    clientName: 'Franklin County',
    type: 'client_followup',
    title: 'Script approval from comms',
    column: 'queue',
    priority: 'medium',
    dueDate: '2025-04-08',
    assigneeCrewId: 'cr-1',
    assigneeName: 'A. Vance',
    done: false,
  },
  {
    id: 't5',
    projectId: 'p3',
    projectTitle: 'Floor 2 Launch',
    clientName: 'Sole Classics',
    type: 'review',
    title: 'Address v2 still notes',
    column: 'client_review',
    priority: 'urgent',
    dueDate: '2025-04-20',
    assigneeCrewId: 'cr-1',
    assigneeName: 'A. Vance',
    done: false,
  },
  {
    id: 't6',
    projectId: 'p4',
    projectTitle: 'Podcast — Block Talk Ep. 12',
    clientName: 'Sole Classics',
    type: 'pre_production',
    title: 'Book record date + gear list',
    column: 'queue',
    priority: 'high',
    dueDate: '2025-04-12',
    assigneeCrewId: 'cr-1',
    assigneeName: 'A. Vance',
    done: false,
  },
  {
    id: 't7',
    projectId: 'p4',
    projectTitle: 'Podcast — Block Talk Ep. 12',
    clientName: 'Sole Classics',
    type: 'admin',
    title: 'Send COI + load-in time to landlord',
    column: 'active',
    priority: 'medium',
    dueDate: '2025-04-11',
    assigneeCrewId: 'cr-1',
    assigneeName: 'A. Vance',
    done: true,
  },
  {
    id: 't8',
    projectId: 'p3',
    projectTitle: 'Floor 2 Launch',
    clientName: 'Sole Classics',
    type: 'delivery',
    title: 'Frame.io link + delivery sheet',
    column: 'post',
    priority: 'low',
    dueDate: '2025-04-19',
    assigneeCrewId: 'cr-3',
    assigneeName: 'J. Park',
    done: false,
  },
];

export const MOCK_ASSETS: ProjectAsset[] = [
  {
    id: 'a1',
    projectId: 'p1',
    label: 'Blacktop · Director Cut V3',
    version: 'v0.3',
    type: 'video',
    status: 'client_review',
    clientVisible: true,
    updatedAt: '2025-03-28T18:00:00Z',
    commentCount: 4,
  },
  {
    id: 'a2',
    projectId: 'p3',
    label: 'Floor 2 · Stills v2',
    version: 'v0.2',
    type: 'still',
    status: 'client_review',
    clientVisible: true,
    updatedAt: '2025-03-27T14:30:00Z',
    commentCount: 6,
  },
  {
    id: 'a3',
    projectId: 'p2',
    label: 'We Are · String-out A',
    version: 'v0.1',
    type: 'video',
    status: 'internal',
    clientVisible: false,
    updatedAt: '2025-03-25T10:00:00Z',
    commentCount: 0,
  },
];

export const MOCK_INVOICES_ADMIN: AdminInvoice[] = [
  {
    id: 'INV-25-101',
    projectId: 'p1',
    clientName: 'Jordan Brand',
    amount: 18000,
    amountPaid: 12000,
    issuedDate: '2025-03-01',
    dueDate: '2025-03-15',
    status: 'partial',
  },
  {
    id: 'INV-25-088',
    projectId: 'p2',
    clientName: 'Franklin County',
    amount: 12000,
    amountPaid: 0,
    issuedDate: '2025-03-20',
    dueDate: '2025-04-05',
    status: 'sent',
  },
  {
    id: 'INV-25-076',
    projectId: 'p3',
    clientName: 'Sole Classics',
    amount: 6250,
    amountPaid: 6250,
    issuedDate: '2025-02-10',
    dueDate: '2025-02-20',
    status: 'paid',
  },
  {
    id: 'INV-24-900',
    projectId: 'p1',
    clientName: 'Jordan Brand',
    amount: 5000,
    amountPaid: 0,
    issuedDate: '2024-12-01',
    dueDate: '2024-12-20',
    status: 'overdue',
  },
];

export const MOCK_PROPOSALS: AdminProposal[] = [
  {
    id: 'pr-1',
    projectId: 'p1',
    clientName: 'Jordan Brand',
    contractStatus: 'signed',
    viewedAt: '2025-02-20T12:00:00Z',
    signedAt: '2025-02-21T09:00:00Z',
    lineItems: [
      { label: 'Essentials production package', amount: 25000 },
      { label: 'Rush post week', amount: 5000 },
      { label: 'Additional revision round', amount: 12000 },
    ],
    total: 42000,
    depositPercent: 30,
    lastEvent: 'Deposit received',
  },
  {
    id: 'pr-2',
    projectId: 'p3',
    clientName: 'Sole Classics',
    contractStatus: 'viewed',
    viewedAt: '2025-03-10T11:00:00Z',
    lineItems: [{ label: 'Retail + lookbook (custom)', amount: 12500 }],
    total: 12500,
    depositPercent: 50,
    lastEvent: 'Client opened scope link',
  },
  {
    id: 'pr-3',
    projectId: 'p4',
    clientName: 'Sole Classics',
    contractStatus: 'sent',
    lineItems: [
      { label: 'Podcast pack (1 ep, 3h record)', amount: 800 },
      { label: 'Optional: title + description', amount: 200 },
    ],
    total: 1000,
    depositPercent: 0,
  },
];

export const MOCK_SHOOTS_ADMIN: AdminShoot[] = [
  {
    id: 'S-A1',
    projectId: 'p1',
    projectTitle: 'Blacktop: Spring Push',
    title: 'Court night 1',
    date: '2025-04-20',
    callTime: '17:00',
    location: 'Exterior blacktop, Chicago',
    crew: ['M. Reyes', 'A. Vance'],
    gearSummary: 'Komodo-X + anamorphics, Teradek, 1× HMI',
  },
  {
    id: 'S-A2',
    projectId: 'p2',
    projectTitle: 'We Are: Spring Anthem',
    title: 'B-roll: neighborhoods',
    date: '2025-04-10',
    callTime: '08:00',
    location: 'Downtown + suburbs',
    crew: ['M. Reyes', 'J. Park'],
    gearSummary: '2-cam gimbal; drone (permit TBD)',
  },
];

export const MOCK_EXPENSES: ProjectExpense[] = [
  {
    id: 'e1',
    projectId: 'p1',
    label: 'Anamorphic rental 3d',
    amount: 1200,
    category: 'rental',
    date: '2025-03-15',
  },
  { id: 'e2', projectId: 'p1', label: 'Location + parking', amount: 450, category: 'location', date: '2025-03-10' },
  { id: 'e3', projectId: 'p2', label: 'County film permit', amount: 350, category: 'permit', date: '2025-04-01' },
];

export const MOCK_ACTIVITY: ActivityEntry[] = [
  {
    id: 'ac1',
    projectId: 'p1',
    projectTitle: 'Blacktop: Spring Push',
    entityType: 'asset',
    entityLabel: 'Blacktop · V3',
    actorName: 'A. Vance',
    action: 'sent to client review',
    createdAt: '2025-03-28T18:00:00Z',
  },
  {
    id: 'ac2',
    projectId: 'p3',
    projectTitle: 'Floor 2 Launch',
    entityType: 'planner',
    entityLabel: 'V2 still notes',
    actorName: 'A. Vance',
    action: 'commented — macro crop on rack shot',
    createdAt: '2025-03-27T16:00:00Z',
  },
  {
    id: 'ac3',
    projectId: 'p1',
    projectTitle: 'Blacktop: Spring Push',
    entityType: 'invoice',
    entityLabel: 'INV-25-101',
    actorName: 'System',
    action: 'milestone 2 of 3 marked paid',
    createdAt: '2025-03-24T10:00:00Z',
  },
  {
    id: 'ac4',
    projectId: 'p2',
    projectTitle: 'We Are: Spring Anthem',
    entityType: 'project',
    entityLabel: 'Stage',
    actorName: 'M. Reyes',
    action: 'moved to In production',
    createdAt: '2025-03-20T14:00:00Z',
  },
];

function sumOutstandingInvoices(): number {
  return MOCK_INVOICES_ADMIN.filter((i) => i.status !== 'paid' && i.status !== 'void').reduce(
    (s, i) => s + (i.amount - i.amountPaid),
    0
  );
}

export function getCommandStats() {
  const active = MOCK_ADMIN_PROJECTS.filter((p) => p.status === 'active');
  return {
    activeProjects: active.length,
    revenueYtd: 305000, // static hero stat (aligned with old AdminView mock)
    outstanding: sumOutstandingInvoices(),
    pendingApprovals: MOCK_ASSETS.filter((a) => a.status === 'client_review').length,
    urgentTasks: MOCK_PLANNER.filter((t) => !t.done && t.priority === 'urgent').length,
  };
}

export function getProjectById(id: string): AdminProject | undefined {
  return MOCK_ADMIN_PROJECTS.find((p) => p.id === id);
}

export function getPlannerByProject(id: string): PlannerItem[] {
  return MOCK_PLANNER.filter((t) => t.projectId === id);
}

export function getAssetsByProject(id: string): ProjectAsset[] {
  return MOCK_ASSETS.filter((a) => a.projectId === id);
}

export function getInvoicesByProject(id: string): AdminInvoice[] {
  return MOCK_INVOICES_ADMIN.filter((i) => i.projectId === id);
}

export function getProposalByProject(id: string): AdminProposal | undefined {
  return MOCK_PROPOSALS.find((p) => p.projectId === id);
}

export function getShootsByProject(id: string): AdminShoot[] {
  return MOCK_SHOOTS_ADMIN.filter((s) => s.projectId === id);
}

export function getExpensesByProject(id: string): ProjectExpense[] {
  return MOCK_EXPENSES.filter((e) => e.projectId === id);
}

export function getActivityByProject(id: string): ActivityEntry[] {
  return MOCK_ACTIVITY.filter((a) => a.projectId === id);
}

export const PLANNER_COLUMN_LABEL: Record<PlannerItem['column'], string> = {
  queue: 'Queue',
  active: 'Active',
  post: 'Post',
  client_review: 'Client',
  complete: 'Complete',
};
