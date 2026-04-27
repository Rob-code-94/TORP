import type {
  ActivityEntry,
  AdminMeeting,
  AdminInvoice,
  AdminProject,
  AdminProposal,
  AdminShoot,
  BlockerItem,
  ChangeOrder,
  ClientProfile,
  CrewProfile,
  DependencyItem,
  PlannerItem,
  PlannerTaskStatus,
  ProjectAssetSourceType,
  ProjectCapability,
  ProjectDeliverable,
  ProjectAsset,
  ProjectExpense,
  ProjectStage,
  ProjectStageTransition,
  RiskItem,
  StorageOpsEvent,
} from '../types';
import { UserRole } from '../types';
import { getProjectAssetStorageAdapter } from '../lib/projectAssetStorage';

export const MOCK_CLIENTS: ClientProfile[] = [
  {
    id: 'cl-1',
    name: 'Jordan Team',
    company: 'Jordan Brand',
    email: 'prod@jordan.nike.com',
    phone: '(312) 555-0140',
    billingEmail: 'billing@jordan.nike.com',
    billingContactName: 'Jordan AP',
    addressCity: 'Chicago',
    addressState: 'IL',
    addressPostal: '60607',
    addressCountry: 'US',
    preferredCommunication: 'email',
    timezone: 'America/Chicago',
    clientStatus: 'active',
    city: 'Chicago, IL',
    notes: 'High-touch brand; prefers overnight review windows.',
    projectIds: ['p1'],
    updatedAt: '2025-03-01T08:00:00Z',
  },
  {
    id: 'cl-2',
    name: 'Community Lead',
    company: 'Franklin County',
    email: 'media@franklincounty.gov',
    phone: '(614) 555-0199',
    billingEmail: 'ap@franklincounty.gov',
    billingContactName: 'County AP',
    addressCity: 'Columbus',
    addressState: 'OH',
    addressPostal: '43215',
    addressCountry: 'US',
    preferredCommunication: 'email',
    timezone: 'America/New_York',
    clientStatus: 'active',
    city: 'Columbus, OH',
    notes: 'Civic approvals; add VO + captions deliverable every time.',
    projectIds: ['p2'],
    updatedAt: '2025-03-03T09:00:00Z',
  },
  {
    id: 'cl-3',
    name: 'Retail Director',
    company: 'Sole Classics',
    email: 'creative@soleclassics.com',
    phone: '(614) 555-0101',
    billingEmail: 'billing@soleclassics.com',
    billingContactName: 'Retail AP',
    addressCity: 'Columbus',
    addressState: 'OH',
    addressPostal: '43201',
    addressCountry: 'US',
    preferredCommunication: 'phone',
    timezone: 'America/New_York',
    clientStatus: 'active',
    city: 'Columbus, OH',
    notes: 'Retail + social; fast turnaround on verticals.',
    projectIds: ['p3', 'p4'],
    updatedAt: '2025-03-06T11:00:00Z',
  },
];

function nextCrewId(): string {
  const nums = MOCK_CREW.map((c) => Number.parseInt(String(c.id).replace(/^cr-/, ''), 10)).filter((n) => Number.isFinite(n));
  const max = nums.length ? Math.max(...nums) : 0;
  return `cr-${max + 1}`;
}

export const MOCK_CREW: CrewProfile[] = [
  {
    id: 'cr-1',
    displayName: 'A. Vance',
    role: 'director',
    systemRole: UserRole.STAFF,
    email: 'a@torp.life',
    phone: '(312) 555-0100',
    rateShootHour: 175,
    rateEditHour: 75,
    active: true,
    assignedProjectIds: ['p1', 'p3'],
    availability: 'W14–W16 · mostly clear',
    availabilityDetail: {
      timezone: 'America/Chicago',
      windows: [
        { id: 'av-1', dayOfWeek: 1, startTime: '08:00', endTime: '18:00' },
        { id: 'av-2', dayOfWeek: 2, startTime: '08:00', endTime: '18:00' },
        { id: 'av-3', dayOfWeek: 3, startTime: '08:00', endTime: '18:00' },
        { id: 'av-4', dayOfWeek: 4, startTime: '08:00', endTime: '18:00' },
        { id: 'av-5', dayOfWeek: 5, startTime: '09:00', endTime: '15:00' },
      ],
      exceptions: [],
      notes: 'Generally open weekdays.',
    },
  },
  {
    id: 'cr-2',
    displayName: 'M. Reyes',
    role: 'dp',
    systemRole: UserRole.STAFF,
    email: 'm@torp.life',
    phone: '(312) 555-0102',
    rateShootHour: 100,
    rateEditHour: 75,
    active: true,
    assignedProjectIds: ['p1', 'p2'],
    availability: 'On location Mar 20–22',
    availabilityDetail: {
      timezone: 'America/Chicago',
      windows: [
        { id: 'av-6', dayOfWeek: 1, startTime: '07:00', endTime: '16:00' },
        { id: 'av-7', dayOfWeek: 2, startTime: '07:00', endTime: '16:00' },
        { id: 'av-8', dayOfWeek: 3, startTime: '07:00', endTime: '16:00' },
        { id: 'av-9', dayOfWeek: 4, startTime: '07:00', endTime: '16:00' },
      ],
      exceptions: [{ id: 'ex-1', startDate: '2025-03-20', endDate: '2025-03-22', reason: 'On location' }],
      notes: 'Prefers early calls.',
    },
  },
  {
    id: 'cr-3',
    displayName: 'J. Park',
    role: 'editor',
    systemRole: UserRole.STAFF,
    email: 'j@torp.life',
    phone: '(312) 555-0103',
    rateShootHour: 100,
    rateEditHour: 75,
    active: true,
    assignedProjectIds: ['p2', 'p4'],
    availability: 'Post-heavy week',
    availabilityDetail: {
      timezone: 'America/Chicago',
      windows: [
        { id: 'av-10', dayOfWeek: 1, startTime: '10:00', endTime: '20:00' },
        { id: 'av-11', dayOfWeek: 2, startTime: '10:00', endTime: '20:00' },
        { id: 'av-12', dayOfWeek: 3, startTime: '10:00', endTime: '20:00' },
        { id: 'av-13', dayOfWeek: 4, startTime: '10:00', endTime: '20:00' },
        { id: 'av-14', dayOfWeek: 5, startTime: '10:00', endTime: '18:00' },
      ],
      exceptions: [],
      notes: 'Primary post workflow window.',
    },
  },
  {
    id: 'cr-4',
    displayName: 'ROB R',
    role: 'other',
    systemRole: UserRole.ADMIN,
    email: 'info@torp.life',
    phone: '',
    rateShootHour: 0,
    rateEditHour: 0,
    active: true,
    assignedProjectIds: [],
    availability: 'Org admin',
    availabilityDetail: {
      timezone: 'America/Chicago',
      windows: [{ id: 'av-r1', dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }],
      exceptions: [],
      notes: 'HQ admin',
    },
  },
  {
    id: 'cr-5',
    displayName: 'William Fairbanks',
    role: 'other',
    systemRole: UserRole.ADMIN,
    email: 'william@torp.life',
    phone: '',
    rateShootHour: 0,
    rateEditHour: 0,
    active: true,
    assignedProjectIds: [],
    availability: 'Org admin',
    availabilityDetail: {
      timezone: 'America/New_York',
      windows: [{ id: 'av-w1', dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }],
      exceptions: [],
      notes: 'HQ admin',
    },
  },
  {
    id: 'cr-6',
    displayName: 'Jayden Price',
    role: 'producer',
    systemRole: UserRole.PROJECT_MANAGER,
    email: 'jp@torp.life',
    phone: '',
    rateShootHour: 0,
    rateEditHour: 0,
    active: true,
    assignedProjectIds: ['p1', 'p2'],
    availability: 'PM coverage',
    availabilityDetail: {
      timezone: 'America/Chicago',
      windows: [
        { id: 'av-j1', dayOfWeek: 1, startTime: '08:00', endTime: '18:00' },
        { id: 'av-j2', dayOfWeek: 2, startTime: '08:00', endTime: '18:00' },
        { id: 'av-j3', dayOfWeek: 3, startTime: '08:00', endTime: '18:00' },
        { id: 'av-j4', dayOfWeek: 4, startTime: '08:00', endTime: '18:00' },
        { id: 'av-j5', dayOfWeek: 5, startTime: '09:00', endTime: '15:00' },
      ],
      exceptions: [],
      notes: 'Project coordination',
    },
  },
];

export const MOCK_ADMIN_PROJECTS: AdminProject[] = [
  {
    id: 'p1',
    title: 'Blacktop: Spring Push',
    clientId: 'cl-1',
    clientName: 'Jordan Brand',
    packageLabel: 'Essentials (5h / 5 deliverables)',
    stage: 'post',
    status: 'active',
    budget: 42000,
    dueDate: '2025-04-12',
    ownerCrewId: 'cr-1',
    ownerName: 'A. Vance',
    assignedCrewIds: ['cr-1', 'cr-3'],
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
    stage: 'production',
    status: 'active',
    budget: 28000,
    dueDate: '2025-05-01',
    ownerCrewId: 'cr-2',
    ownerName: 'M. Reyes',
    assignedCrewIds: ['cr-2'],
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
    stage: 'post',
    status: 'active',
    budget: 12500,
    dueDate: '2025-03-28',
    ownerCrewId: 'cr-1',
    ownerName: 'A. Vance',
    assignedCrewIds: ['cr-1'],
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
    stage: 'inquiry',
    status: 'active',
    budget: 800,
    dueDate: '2025-04-20',
    ownerCrewId: 'cr-3',
    ownerName: 'J. Park',
    assignedCrewIds: ['cr-3'],
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
    crewIds: ['cr-2', 'cr-1'],
    gearSummary: 'Komodo-X + anamorphics, Teradek, 1× HMI',
    gearItems: ['RED Komodo-X (Pkg A)', 'Atlas Orion Anamorphic', 'Teradek Bolt 6', 'Aputure 600d x2'],
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
    crewIds: ['cr-2', 'cr-3'],
    gearSummary: '2-cam gimbal; drone (permit TBD)',
    gearItems: ['Sony FX6 + 24-70', 'DJI RS3 Pro', 'ND set', 'Walkies x4'],
  },
];

export const MOCK_MEETINGS_ADMIN: AdminMeeting[] = [
  {
    id: 'M-101',
    projectId: 'p1',
    projectTitle: 'Blacktop: Spring Push',
    title: 'Client post review',
    date: '2025-04-05',
    startTime: '14:00',
    location: 'Zoom',
    participants: ['A. Vance', 'J. Park'],
    participantCrewIds: ['cr-1', 'cr-3'],
    description: 'Review latest cut and confirm final notes.',
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

export const MOCK_STORAGE_OPS_EVENTS: StorageOpsEvent[] = [
  {
    id: 'ops-1',
    eventType: 'link_issued',
    assetId: 'a1',
    actorName: 'A. Vance',
    tenantId: 'torp-default',
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    details: 'Issued deliverable link for Blacktop master.',
  },
  {
    id: 'ops-2',
    eventType: 'upload_failed',
    assetId: 'a3',
    actorName: 'System',
    tenantId: 'torp-default',
    timestamp: new Date(Date.now() - 1000 * 60 * 80).toISOString(),
    errorCode: 'network-timeout',
    details: 'Upload stalled during processing.',
  },
];

function pushActivity(entry: Omit<ActivityEntry, 'id' | 'createdAt' | 'projectTitle'> & { projectTitle?: string }) {
  const project = getProjectById(entry.projectId);
  MOCK_ACTIVITY.unshift({
    id: `ac${MOCK_ACTIVITY.length + 1}`,
    projectId: entry.projectId,
    projectTitle: entry.projectTitle || project?.title || 'Unknown project',
    entityType: entry.entityType,
    entityLabel: entry.entityLabel,
    actorName: entry.actorName,
    action: entry.action,
    createdAt: new Date().toISOString(),
  });
}

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

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizeClientInput(input: {
  company: string;
  name: string;
  email: string;
  phone?: string;
  billingEmail: string;
  billingContactName: string;
  addressCity: string;
  addressState: string;
  addressPostal: string;
  addressCountry: string;
  preferredCommunication: 'email' | 'sms' | 'phone';
  timezone: string;
  clientStatus: 'active' | 'prospect' | 'paused';
  notes?: string;
}) {
  return {
    company: input.company.trim(),
    name: input.name.trim(),
    email: normalizeEmail(input.email),
    phone: input.phone?.trim() || '(000) 000-0000',
    billingEmail: normalizeEmail(input.billingEmail),
    billingContactName: input.billingContactName.trim(),
    addressCity: input.addressCity.trim(),
    addressState: input.addressState.trim(),
    addressPostal: input.addressPostal.trim(),
    addressCountry: input.addressCountry.trim() || 'US',
    preferredCommunication: input.preferredCommunication,
    timezone: input.timezone.trim() || 'America/New_York',
    clientStatus: input.clientStatus,
    notes: input.notes?.trim() || '',
  };
}

function validateClientInput(input: ReturnType<typeof normalizeClientInput>): string | null {
  if (!input.company) return 'Company is required.';
  if (!input.name) return 'Primary contact is required.';
  if (!isValidEmail(input.email)) return 'Valid email is required.';
  if (!isValidEmail(input.billingEmail)) return 'Valid billing email is required.';
  if (!input.billingContactName) return 'Billing contact is required.';
  if (!input.addressCity || !input.addressState || !input.addressPostal || !input.addressCountry) {
    return 'Full billing location is required.';
  }
  if (!input.timezone) return 'Timezone is required.';
  return null;
}

export function createClientProfile(input: {
  company: string;
  name: string;
  email: string;
  phone?: string;
  billingEmail: string;
  billingContactName: string;
  addressCity: string;
  addressState: string;
  addressPostal: string;
  addressCountry: string;
  preferredCommunication: 'email' | 'sms' | 'phone';
  timezone: string;
  clientStatus: 'active' | 'prospect' | 'paused';
  notes?: string;
}): { ok: true; client: ClientProfile } | { ok: false; error: string } {
  const normalized = normalizeClientInput(input);
  const error = validateClientInput(normalized);
  if (error) return { ok: false, error };

  const duplicate = MOCK_CLIENTS.find(
    (item) =>
      item.company.toLowerCase() === normalized.company.toLowerCase() ||
      item.email.toLowerCase() === normalized.email ||
      item.billingEmail.toLowerCase() === normalized.billingEmail
  );
  if (duplicate) {
    return { ok: false, error: 'A client with matching company or email already exists.' };
  }

  const client: ClientProfile = {
    id: `cl-${MOCK_CLIENTS.length + 1}`,
    company: normalized.company,
    name: normalized.name,
    email: normalized.email,
    phone: normalized.phone,
    billingEmail: normalized.billingEmail,
    billingContactName: normalized.billingContactName,
    addressCity: normalized.addressCity,
    addressState: normalized.addressState,
    addressPostal: normalized.addressPostal,
    addressCountry: normalized.addressCountry,
    preferredCommunication: normalized.preferredCommunication,
    timezone: normalized.timezone,
    clientStatus: normalized.clientStatus,
    city: `${normalized.addressCity}, ${normalized.addressState}`,
    notes: normalized.notes,
    projectIds: [],
    updatedAt: new Date().toISOString(),
  };
  MOCK_CLIENTS.push(client);
  return { ok: true, client };
}

export function updateClientProfile(
  clientId: string,
  input: {
    company: string;
    name: string;
    email: string;
    phone?: string;
    billingEmail: string;
    billingContactName: string;
    addressCity: string;
    addressState: string;
    addressPostal: string;
    addressCountry: string;
    preferredCommunication: 'email' | 'sms' | 'phone';
    timezone: string;
    clientStatus: 'active' | 'prospect' | 'paused';
    notes?: string;
  }
): { ok: true; client: ClientProfile } | { ok: false; error: string } {
  const client = MOCK_CLIENTS.find((item) => item.id === clientId);
  if (!client) return { ok: false, error: 'Client not found.' };
  const normalized = normalizeClientInput(input);
  const validationError = validateClientInput(normalized);
  if (validationError) return { ok: false, error: validationError };

  const duplicate = MOCK_CLIENTS.find(
    (item) =>
      item.id !== clientId &&
      (item.company.toLowerCase() === normalized.company.toLowerCase() ||
        item.email.toLowerCase() === normalized.email ||
        item.billingEmail.toLowerCase() === normalized.billingEmail)
  );
  if (duplicate) return { ok: false, error: 'A client with matching company or email already exists.' };

  Object.assign(client, {
    company: normalized.company,
    name: normalized.name,
    email: normalized.email,
    phone: normalized.phone,
    billingEmail: normalized.billingEmail,
    billingContactName: normalized.billingContactName,
    addressCity: normalized.addressCity,
    addressState: normalized.addressState,
    addressPostal: normalized.addressPostal,
    addressCountry: normalized.addressCountry,
    preferredCommunication: normalized.preferredCommunication,
    timezone: normalized.timezone,
    clientStatus: normalized.clientStatus,
    city: `${normalized.addressCity}, ${normalized.addressState}`,
    notes: normalized.notes,
    updatedAt: new Date().toISOString(),
  });

  return { ok: true, client };
}

export function deleteClientProfile(
  clientId: string
): { ok: true } | { ok: false; error: string } {
  const client = MOCK_CLIENTS.find((item) => item.id === clientId);
  if (!client) return { ok: false, error: 'Client not found.' };
  if (client.projectIds.length > 0) {
    return {
      ok: false,
      error: 'This client is linked to projects. Reassign or archive those projects before deleting the profile.',
    };
  }
  const idx = MOCK_CLIENTS.findIndex((item) => item.id === clientId);
  if (idx < 0) return { ok: false, error: 'Client not found.' };
  MOCK_CLIENTS.splice(idx, 1);
  return { ok: true };
}

export function getPlannerByProject(id: string): PlannerItem[] {
  return MOCK_PLANNER.filter((t) => t.projectId === id).map((item) => {
    const assigneeCrewIds = item.assigneeCrewIds?.length ? item.assigneeCrewIds : [item.assigneeCrewId];
    const assigneeNames = item.assigneeNames?.length ? item.assigneeNames : [item.assigneeName];
    return { ...item, assigneeCrewIds, assigneeNames };
  });
}

export function getAssetsByProject(id: string): ProjectAsset[] {
  return MOCK_ASSETS
    .filter((a) => a.projectId === id)
    .map((item) => ({
      ...item,
      sourceType: item.sourceType ?? 'upload',
      notes: item.notes ?? '',
    }));
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

export function getAdminShootById(id: string): AdminShoot | undefined {
  return MOCK_SHOOTS_ADMIN.find((s) => s.id === id);
}

export function getMeetingsByProject(id: string): AdminMeeting[] {
  return MOCK_MEETINGS_ADMIN.filter((m) => m.projectId === id);
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

export const PROJECT_STAGE_ORDER: ProjectStage[] = [
  'inquiry',
  'scope',
  'estimate',
  'pre_production',
  'production',
  'post',
  'delivered',
  'archived',
];

export const MOCK_PROJECT_DELIVERABLES: ProjectDeliverable[] = [
  {
    id: 'd1',
    projectId: 'p1',
    label: '60s master',
    ownerCrewId: 'cr-3',
    ownerName: 'J. Park',
    dueDate: '2025-04-10',
    required: true,
    status: 'in_progress',
    linkedAssetIds: ['a1'],
  },
  {
    id: 'd2',
    projectId: 'p2',
    label: '3 min anthem',
    ownerCrewId: 'cr-2',
    ownerName: 'M. Reyes',
    dueDate: '2025-04-28',
    required: true,
    status: 'ready_for_approval',
    linkedAssetIds: ['a3'],
  },
];

export const MOCK_RISKS: RiskItem[] = [
  { id: 'r1', projectId: 'p1', label: 'Weather volatility for exterior shoots', severity: 'high', status: 'monitoring', ownerName: 'A. Vance', dueDate: '2025-04-18' },
  { id: 'r2', projectId: 'p3', label: 'Client review turnaround risk', severity: 'medium', status: 'open', ownerName: 'A. Vance' },
];

export const MOCK_BLOCKERS: BlockerItem[] = [
  { id: 'b1', projectId: 'p2', label: 'Drone permit pending', status: 'open', ownerName: 'M. Reyes', dueDate: '2025-04-09' },
];

export const MOCK_DEPENDENCIES: DependencyItem[] = [
  { id: 'dep1', projectId: 'p1', label: 'Final logo pack from client', status: 'waiting' },
  { id: 'dep2', projectId: 'p4', label: 'Studio date confirmation', status: 'active' },
];

export const MOCK_CHANGE_ORDERS: ChangeOrder[] = [
  {
    id: 'co1',
    projectId: 'p1',
    title: 'Add extended social cutdown set',
    amount: 2400,
    status: 'requested',
    requestedBy: 'A. Vance',
    requestedAt: '2025-03-29T13:00:00Z',
  },
];

export const MOCK_STAGE_TRANSITIONS: ProjectStageTransition[] = [];

const CAPABILITY_BY_ROLE: Record<'ADMIN' | 'PROJECT_MANAGER', ProjectCapability[]> = {
  ADMIN: [
    'project.create',
    'project.edit',
    'project.archive',
    'project.bulk.archive',
    'project.bulk.assign',
    'project.stage.move',
    'project.financial.approve',
    'project.changeOrder.request',
    'project.changeOrder.approve',
  ],
  PROJECT_MANAGER: [
    'project.create',
    'project.edit',
    'project.bulk.assign',
    'project.stage.move',
    'project.changeOrder.request',
  ],
};

export function capabilitiesForRole(role: 'ADMIN' | 'PROJECT_MANAGER'): ProjectCapability[] {
  return CAPABILITY_BY_ROLE[role];
}

export function canTransitionStage(fromStage: ProjectStage, toStage: ProjectStage): boolean {
  const fromIdx = PROJECT_STAGE_ORDER.indexOf(fromStage);
  const toIdx = PROJECT_STAGE_ORDER.indexOf(toStage);
  if (fromIdx < 0 || toIdx < 0) return false;
  if (fromStage === toStage) return true;
  if (fromStage === 'archived' && toStage !== 'archived') return false;
  if (toStage === 'archived') return fromStage === 'delivered';
  return toIdx >= 0 && toIdx <= PROJECT_STAGE_ORDER.length - 2;
}

export function transitionProjectStage(projectId: string, toStage: ProjectStage, actorName: string): { ok: boolean; error?: string } {
  const project = MOCK_ADMIN_PROJECTS.find((item) => item.id === projectId);
  if (!project) return { ok: false, error: 'Project not found.' };

  if (toStage === 'delivered') {
    const pendingRequired = MOCK_PROJECT_DELIVERABLES.some(
      (item) => item.projectId === projectId && item.required && item.status !== 'delivered' && item.status !== 'approved'
    );
    if (pendingRequired) return { ok: false, error: 'Required deliverables must be approved before delivery.' };
  }

  if (!canTransitionStage(project.stage, toStage)) {
    return { ok: false, error: `Invalid stage transition from ${project.stage} to ${toStage}.` };
  }

  MOCK_STAGE_TRANSITIONS.push({
    id: `st-${MOCK_STAGE_TRANSITIONS.length + 1}`,
    projectId,
    fromStage: project.stage,
    toStage,
    changedBy: actorName,
    changedAt: new Date().toISOString(),
  });
  project.stage = toStage;
  pushActivity({
    projectId,
    entityType: 'project',
    entityLabel: 'Stage',
    actorName,
    action: `moved to ${formatStageLabel(toStage)}`,
    projectTitle: project.title,
  });
  return { ok: true };
}

export function getDeliverablesByProject(id: string): ProjectDeliverable[] {
  return MOCK_PROJECT_DELIVERABLES
    .filter((item) => item.projectId === id)
    .map((deliverable) => ({
      ...deliverable,
      step: deliverable.step ?? 'post_production',
      acceptanceCriteria: deliverable.acceptanceCriteria ?? '',
      notes: deliverable.notes ?? '',
    }));
}

export function getRisksByProject(id: string): RiskItem[] {
  return MOCK_RISKS.filter((item) => item.projectId === id);
}

export function getBlockersByProject(id: string): BlockerItem[] {
  return MOCK_BLOCKERS.filter((item) => item.projectId === id);
}

export function getDependenciesByProject(id: string): DependencyItem[] {
  return MOCK_DEPENDENCIES.filter((item) => item.projectId === id);
}

export function getChangeOrdersByProject(id: string): ChangeOrder[] {
  return MOCK_CHANGE_ORDERS.filter((item) => item.projectId === id);
}

export function requestChangeOrder(projectId: string, title: string, amount: number, actorName: string): ChangeOrder {
  if (!title.trim()) {
    throw new Error('Change order title is required.');
  }
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error('Change order amount must be a valid non-negative number.');
  }
  const item: ChangeOrder = {
    id: `co${MOCK_CHANGE_ORDERS.length + 1}`,
    projectId,
    title,
    amount,
    status: 'requested',
    requestedBy: actorName,
    requestedAt: new Date().toISOString(),
  };
  MOCK_CHANGE_ORDERS.unshift(item);
  pushActivity({
    projectId,
    entityType: 'proposal',
    entityLabel: item.id,
    actorName,
    action: `requested change order: ${title}`,
  });
  return item;
}

export function updateProjectNarrative(
  projectId: string,
  patch: Pick<AdminProject, 'summary' | 'brief' | 'goals' | 'nextMilestone'>,
  actorName: string
): { ok: boolean; error?: string } {
  const project = getProjectById(projectId);
  if (!project) return { ok: false, error: 'Project not found.' };
  project.summary = patch.summary.trim();
  project.brief = patch.brief.trim();
  project.goals = patch.goals.trim();
  project.nextMilestone = patch.nextMilestone.trim();
  pushActivity({
    projectId,
    entityType: 'project',
    entityLabel: 'Narrative',
    actorName,
    action: 'updated summary and brief details',
    projectTitle: project.title,
  });
  return { ok: true };
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
  if (MOCK_CREW.some((item) => item.email.toLowerCase() === email)) {
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
  MOCK_CREW.push(crew);
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
  }>
): { ok: true; crew: CrewProfile } | { ok: false; error: string } {
  const crew = MOCK_CREW.find((item) => item.id === crewId);
  if (!crew) return { ok: false, error: 'Crew member not found.' };

  if (patch.email) {
    const email = normalizeEmail(patch.email);
    if (!isValidEmail(email)) return { ok: false, error: 'Valid crew email is required.' };
    const duplicate = MOCK_CREW.find((item) => item.id !== crewId && item.email.toLowerCase() === email);
    if (duplicate) return { ok: false, error: 'A crew member with this email already exists.' };
    crew.email = email;
  }
  if (patch.displayName !== undefined) {
    const next = patch.displayName.trim();
    if (!next) return { ok: false, error: 'Crew member name is required.' };
    crew.displayName = next;
  }
  if (patch.role) crew.role = patch.role;
  if (patch.systemRole !== undefined) crew.systemRole = patch.systemRole;
  if (patch.featureAccess !== undefined) crew.featureAccess = patch.featureAccess;
  if (patch.phone !== undefined) crew.phone = patch.phone.trim();
  if (patch.rateShootHour !== undefined) {
    if (patch.rateShootHour < 0) return { ok: false, error: 'Shoot rate must be non-negative.' };
    crew.rateShootHour = patch.rateShootHour;
  }
  if (patch.rateEditHour !== undefined) {
    if (patch.rateEditHour < 0) return { ok: false, error: 'Edit rate must be non-negative.' };
    crew.rateEditHour = patch.rateEditHour;
  }
  if (patch.active !== undefined) crew.active = patch.active;
  if (patch.availabilityDetail) {
    const availabilityError = validateAvailability(patch.availabilityDetail);
    if (availabilityError) return { ok: false, error: availabilityError };
    crew.availabilityDetail = patch.availabilityDetail;
    crew.availability = summarizeAvailability(patch.availabilityDetail);
  }
  return { ok: true, crew };
}

export function deleteCrewMemberProfile(
  crewId: string
): { ok: true } | { ok: false; error: string } {
  const crew = MOCK_CREW.find((item) => item.id === crewId);
  if (!crew) return { ok: false, error: 'Crew member not found.' };
  if (crew.assignedProjectIds.length > 0) {
    return { ok: false, error: 'Cannot delete a crew member assigned to projects. Unassign first.' };
  }
  const assignedInProjects = MOCK_ADMIN_PROJECTS.some(
    (project) => project.ownerCrewId === crewId || (project.assignedCrewIds || []).includes(crewId)
  );
  if (assignedInProjects) {
    return { ok: false, error: 'Cannot delete a crew member assigned to projects. Unassign first.' };
  }
  const idx = MOCK_CREW.findIndex((item) => item.id === crewId);
  if (idx < 0) return { ok: false, error: 'Crew member not found.' };
  MOCK_CREW.splice(idx, 1);
  return { ok: true };
}

export function requestCrewPasswordReset(
  crewId: string,
  actorName: string
): { ok: true; crew: CrewProfile } | { ok: false; error: string } {
  const crew = MOCK_CREW.find((item) => item.id === crewId);
  if (!crew) return { ok: false, error: 'Crew member not found.' };
  if (!isValidEmail(crew.email)) return { ok: false, error: 'Crew member email is invalid for reset.' };
  crew.lastResetRequestedAt = new Date().toISOString();
  crew.lastResetRequestedBy = actorName;
  return { ok: true, crew };
}

export function setCrewTemporaryPassword(
  crewId: string,
  actorName: string,
  temporaryPassword: string
): { ok: true; crew: CrewProfile } | { ok: false; error: string } {
  const crew = MOCK_CREW.find((item) => item.id === crewId);
  if (!crew) return { ok: false, error: 'Crew member not found.' };
  if (temporaryPassword.trim().length < 8) {
    return { ok: false, error: 'Temporary password must be at least 8 characters.' };
  }
  crew.lastTempPasswordSetAt = new Date().toISOString();
  crew.lastTempPasswordSetBy = actorName;
  crew.forcePasswordChange = true;
  return { ok: true, crew };
}

export function assignCrewToProject(projectId: string, crewId: string, actorName: string): { ok: boolean; error?: string } {
  const project = getProjectById(projectId);
  if (!project) return { ok: false, error: 'Project not found.' };
  project.assignedCrewIds = project.assignedCrewIds || [];
  if (!project.assignedCrewIds.includes(crewId)) {
    project.assignedCrewIds.push(crewId);
    const crew = MOCK_CREW.find((c) => c.id === crewId);
    pushActivity({
      projectId,
      entityType: 'project',
      entityLabel: 'Team',
      actorName,
      action: `added ${crew?.displayName || crewId} to project team`,
      projectTitle: project.title,
    });
  }
  return { ok: true };
}

export function removeCrewFromProject(projectId: string, crewId: string, actorName: string): { ok: boolean; error?: string } {
  const project = getProjectById(projectId);
  if (!project) return { ok: false, error: 'Project not found.' };
  project.assignedCrewIds = (project.assignedCrewIds || []).filter((id) => id !== crewId);
  const crew = MOCK_CREW.find((c) => c.id === crewId);
  pushActivity({
    projectId,
    entityType: 'project',
    entityLabel: 'Team',
    actorName,
    action: `removed ${crew?.displayName || crewId} from project team`,
    projectTitle: project.title,
  });
  return { ok: true };
}

export interface BulkProjectResult {
  ok: boolean;
  affected: string[];
  failed: Array<{ projectId: string; error: string }>;
}

export function bulkAssignCrewToProjects(
  projectIds: string[],
  crewIds: string[],
  actorName: string
): BulkProjectResult {
  const affected: string[] = [];
  const failed: Array<{ projectId: string; error: string }> = [];
  for (const projectId of projectIds) {
    const project = getProjectById(projectId);
    if (!project) {
      failed.push({ projectId, error: 'Project not found.' });
      continue;
    }
    let mutated = false;
    for (const crewId of crewIds) {
      const result = assignCrewToProject(projectId, crewId, actorName);
      if (result.ok) mutated = true;
    }
    if (mutated) affected.push(projectId);
  }
  return { ok: failed.length === 0, affected, failed };
}

// Admin override that flips stage to 'archived' regardless of current stage.
// Differs from transitionProjectStage which only allows 'delivered' → 'archived'.
export function bulkArchiveProjects(projectIds: string[], actorName: string): BulkProjectResult {
  const affected: string[] = [];
  const failed: Array<{ projectId: string; error: string }> = [];
  for (const projectId of projectIds) {
    const project = MOCK_ADMIN_PROJECTS.find((item) => item.id === projectId);
    if (!project) {
      failed.push({ projectId, error: 'Project not found.' });
      continue;
    }
    if (project.stage === 'archived') {
      affected.push(projectId);
      continue;
    }
    const fromStage = project.stage;
    MOCK_STAGE_TRANSITIONS.push({
      id: `st-${MOCK_STAGE_TRANSITIONS.length + 1}`,
      projectId,
      fromStage,
      toStage: 'archived',
      changedBy: actorName,
      changedAt: new Date().toISOString(),
    });
    project.stage = 'archived';
    project.status = 'complete';
    pushActivity({
      projectId,
      entityType: 'project',
      entityLabel: 'Stage',
      actorName,
      action: `archived (was ${formatStageLabel(fromStage)})`,
      projectTitle: project.title,
    });
    affected.push(projectId);
  }
  return { ok: failed.length === 0, affected, failed };
}

export function createPlannerTask(input: Omit<PlannerItem, 'id'>, actorName: string): PlannerItem {
  if (!input.title.trim()) throw new Error('Task title is required.');
  const assigneeIds = input.assigneeCrewIds?.length ? input.assigneeCrewIds : [input.assigneeCrewId];
  const assignees = validateProjectAssignees(input.projectId, assigneeIds);
  if (assignees.ok === false) throw new Error(assignees.error);
  const dueDate = input.dueDate || new Date().toISOString().slice(0, 10);
  const availability = validateCrewAvailabilityForDate(input.projectId, assigneeIds, dueDate);
  if (availability.ok === false) throw new Error(availability.error);
  const normalizedNames = assigneeIds
    .map((crewId) => MOCK_CREW.find((crew) => crew.id === crewId)?.displayName)
    .filter((name): name is string => Boolean(name));
  const item: PlannerItem = { ...input, id: `t${Date.now()}` };
  item.assigneeCrewIds = assigneeIds;
  item.assigneeNames = normalizedNames;
  item.assigneeCrewId = assigneeIds[0] || input.assigneeCrewId;
  item.assigneeName = normalizedNames[0] || input.assigneeName;
  item.dueDate = dueDate;
  MOCK_PLANNER.unshift(item);
  pushActivity({
    projectId: item.projectId,
    entityType: 'planner',
    entityLabel: item.title,
    actorName,
    action: 'created task',
  });
  return item;
}

export function updatePlannerTask(taskId: string, patch: Partial<PlannerItem>, actorName: string): { ok: boolean } {
  const item = MOCK_PLANNER.find((t) => t.id === taskId);
  if (!item) return { ok: false };
  const requestedAssignees = patch.assigneeCrewIds?.length ? patch.assigneeCrewIds : patch.assigneeCrewId ? [patch.assigneeCrewId] : undefined;
  if (requestedAssignees) {
    const assignee = validateProjectAssignees(item.projectId, requestedAssignees);
    if (assignee.ok === false) throw new Error(assignee.error);
    const dueDate = patch.dueDate || item.dueDate;
    const availability = validateCrewAvailabilityForDate(item.projectId, requestedAssignees, dueDate);
    if (availability.ok === false) throw new Error(availability.error);
  }
  const nextPatch = { ...patch };
  if (requestedAssignees) {
    const names = requestedAssignees
      .map((crewId) => MOCK_CREW.find((crew) => crew.id === crewId)?.displayName)
      .filter((name): name is string => Boolean(name));
    nextPatch.assigneeCrewIds = requestedAssignees;
    nextPatch.assigneeNames = names;
    nextPatch.assigneeCrewId = requestedAssignees[0] || item.assigneeCrewId;
    nextPatch.assigneeName = names[0] || item.assigneeName;
  }
  if (nextPatch.status) {
    const mapped = plannerStatusToLegacy(nextPatch.status);
    nextPatch.column = mapped.column;
    nextPatch.done = mapped.done;
  }
  Object.assign(item, nextPatch);
  pushActivity({
    projectId: item.projectId,
    entityType: 'planner',
    entityLabel: item.title,
    actorName,
    action: 'updated task',
  });
  return { ok: true };
}

export function attachAssetToPlannerItem(taskId: string, assetId: string, actorName: string): { ok: boolean; error?: string } {
  const item = MOCK_PLANNER.find((t) => t.id === taskId);
  if (!item) return { ok: false, error: 'Planner item not found.' };
  const asset = MOCK_ASSETS.find((a) => a.id === assetId);
  if (!asset || asset.projectId !== item.projectId) {
    return { ok: false, error: 'Asset must exist on the same project.' };
  }
  const existing = new Set(item.attachmentAssetIds || []);
  existing.add(assetId);
  item.attachmentAssetIds = [...existing];
  pushActivity({
    projectId: item.projectId,
    entityType: 'planner',
    entityLabel: item.title,
    actorName,
    action: `attached asset ${asset.label}`,
  });
  return { ok: true };
}

export function removeAssetFromPlannerItem(taskId: string, assetId: string, actorName: string): { ok: boolean; error?: string } {
  const item = MOCK_PLANNER.find((t) => t.id === taskId);
  if (!item) return { ok: false, error: 'Planner item not found.' };
  item.attachmentAssetIds = (item.attachmentAssetIds || []).filter((id) => id !== assetId);
  pushActivity({
    projectId: item.projectId,
    entityType: 'planner',
    entityLabel: item.title,
    actorName,
    action: `detached asset ${assetId}`,
  });
  return { ok: true };
}

export function deletePlannerTask(taskId: string, actorName: string): { ok: boolean } {
  const idx = MOCK_PLANNER.findIndex((t) => t.id === taskId);
  if (idx < 0) return { ok: false };
  const [item] = MOCK_PLANNER.splice(idx, 1);
  pushActivity({
    projectId: item.projectId,
    entityType: 'planner',
    entityLabel: item.title,
    actorName,
    action: 'deleted task',
  });
  return { ok: true };
}

export function createShoot(input: Omit<AdminShoot, 'id'>, actorName: string): AdminShoot {
  if (!input.title.trim()) throw new Error('Shoot title is required.');
  if (!input.date) throw new Error('Shoot date is required.');
  const participants = validateProjectParticipants(input.projectId, input.crew);
  if (participants.ok === false) throw new Error(participants.error);
  const availability = validateCrewAvailabilityForDate(input.projectId, participants.crewIds || [], input.date);
  if (availability.ok === false) throw new Error(availability.error);
  const item: AdminShoot = { ...input, id: `S-${Date.now()}`, crew: participants.names || input.crew, crewIds: participants.crewIds };
  MOCK_SHOOTS_ADMIN.unshift(item);
  pushActivity({
    projectId: item.projectId,
    entityType: 'shoot',
    entityLabel: item.title,
    actorName,
    action: 'created shoot day',
  });
  return item;
}

export function createMeeting(input: Omit<AdminMeeting, 'id'>, actorName: string): AdminMeeting {
  if (!input.title.trim()) throw new Error('Meeting title is required.');
  if (!input.date) throw new Error('Meeting date is required.');
  const participants = validateProjectParticipants(input.projectId, input.participants);
  if (participants.ok === false) throw new Error(participants.error);
  const availability = validateCrewAvailabilityForDate(input.projectId, participants.crewIds || [], input.date);
  if (availability.ok === false) throw new Error(availability.error);
  const item: AdminMeeting = {
    ...input,
    id: `M-${Date.now()}`,
    participants: participants.names || input.participants,
    participantCrewIds: participants.crewIds,
  };
  MOCK_MEETINGS_ADMIN.unshift(item);
  pushActivity({
    projectId: item.projectId,
    entityType: 'meeting',
    entityLabel: item.title,
    actorName,
    action: 'created meeting',
  });
  return item;
}

export function updateShoot(shootId: string, patch: Partial<AdminShoot>, actorName: string): { ok: boolean } {
  const item = MOCK_SHOOTS_ADMIN.find((s) => s.id === shootId);
  if (!item) return { ok: false };
  if (patch.crew) {
    const participants = validateProjectParticipants(item.projectId, patch.crew);
    if (participants.ok === false) throw new Error(participants.error);
    const availability = validateCrewAvailabilityForDate(item.projectId, participants.crewIds || [], patch.date || item.date);
    if (availability.ok === false) throw new Error(availability.error);
    patch.crew = participants.names;
    patch.crewIds = participants.crewIds;
  }
  Object.assign(item, patch);
  pushActivity({
    projectId: item.projectId,
    entityType: 'shoot',
    entityLabel: item.title,
    actorName,
    action: 'updated shoot day',
  });
  return { ok: true };
}

export function deleteShoot(shootId: string, actorName: string): { ok: boolean } {
  const idx = MOCK_SHOOTS_ADMIN.findIndex((s) => s.id === shootId);
  if (idx < 0) return { ok: false };
  const [item] = MOCK_SHOOTS_ADMIN.splice(idx, 1);
  pushActivity({
    projectId: item.projectId,
    entityType: 'shoot',
    entityLabel: item.title,
    actorName,
    action: 'deleted shoot day',
  });
  return { ok: true };
}

export function updateMeeting(meetingId: string, patch: Partial<AdminMeeting>, actorName: string): { ok: boolean } {
  const item = MOCK_MEETINGS_ADMIN.find((m) => m.id === meetingId);
  if (!item) return { ok: false };
  if (patch.participants) {
    const participants = validateProjectParticipants(item.projectId, patch.participants);
    if (participants.ok === false) throw new Error(participants.error);
    const availability = validateCrewAvailabilityForDate(item.projectId, participants.crewIds || [], patch.date || item.date);
    if (availability.ok === false) throw new Error(availability.error);
    patch.participants = participants.names;
    patch.participantCrewIds = participants.crewIds;
  }
  Object.assign(item, patch);
  pushActivity({
    projectId: item.projectId,
    entityType: 'meeting',
    entityLabel: item.title,
    actorName,
    action: 'updated meeting',
  });
  return { ok: true };
}

export function deleteMeeting(meetingId: string, actorName: string): { ok: boolean } {
  const idx = MOCK_MEETINGS_ADMIN.findIndex((m) => m.id === meetingId);
  if (idx < 0) return { ok: false };
  const [item] = MOCK_MEETINGS_ADMIN.splice(idx, 1);
  pushActivity({
    projectId: item.projectId,
    entityType: 'meeting',
    entityLabel: item.title,
    actorName,
    action: 'deleted meeting',
  });
  return { ok: true };
}

export function plannerStatusFromItem(item: PlannerItem): PlannerTaskStatus {
  if (item.status) return item.status;
  if (item.done || item.column === 'complete') return 'done';
  if (item.column === 'client_review') return 'client_review';
  if (item.column === 'active' || item.column === 'post') return 'in_progress';
  return 'todo';
}

export function plannerStatusToLegacy(status: PlannerTaskStatus): { column: PlannerItem['column']; done: boolean } {
  switch (status) {
    case 'done':
      return { column: 'complete', done: true };
    case 'client_review':
      return { column: 'client_review', done: false };
    case 'in_progress':
      return { column: 'active', done: false };
    case 'todo':
    default:
      return { column: 'queue', done: false };
  }
}

export function projectAssignableCrew(projectId: string) {
  const project = getProjectById(projectId);
  if (!project) return [];
  const allowed = new Set<string>([project.ownerCrewId, ...(project.assignedCrewIds || [])]);
  return MOCK_CREW.filter((crew) => allowed.has(crew.id));
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
  participants: string[]
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
  date: string
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
      (exception) => date >= exception.startDate && date <= exception.endDate
    );
    if (inException) return { ok: false, error: `${crew.displayName} is unavailable on ${date}.` };
    const hasWindow = crew.availabilityDetail.windows.some((window) => window.dayOfWeek === day);
    if (!hasWindow) return { ok: false, error: `${crew.displayName} has no availability window on ${date}.` };
  }
  return { ok: true };
}

export function createProjectAsset(input: Omit<ProjectAsset, 'id' | 'updatedAt' | 'commentCount'>, actorName: string): ProjectAsset {
  if (!input.label.trim()) throw new Error('Asset label is required.');
  const id = `a-${Date.now()}`;
  const sourceType: ProjectAssetSourceType = input.sourceType ?? 'upload';
  const normalizedFile = input.storage?.filename?.trim() || input.label.trim().replace(/\s+/g, '-').toLowerCase();
  const storage = sourceType === 'upload'
    ? {
      ...getProjectAssetStorageAdapter().resolveStorage({
        projectId: input.projectId,
        assetId: id,
        filename: normalizedFile,
        sourceType,
      }),
      // Preserve any caller-provided values (path/url/mime/size/filename)
      // so real Firebase uploads keep the actual storage object reference
      // they wrote to instead of getting a synthetic adapter path back.
      ...(input.storage?.path ? { path: input.storage.path } : {}),
      ...(input.storage?.url ? { url: input.storage.url } : {}),
      mimeType: input.storage?.mimeType,
      sizeBytes: input.storage?.sizeBytes,
      filename: input.storage?.filename || normalizedFile,
    }
    : undefined;
  const trimmedRef = input.sourceUrl?.trim();
  const item: ProjectAsset = {
    ...input,
    id,
    sourceType,
    sourceUrl: sourceType === 'external_link' ? trimmedRef || '' : (trimmedRef || undefined),
    storage,
    notes: input.notes ?? '',
    updatedAt: new Date().toISOString(),
    commentCount: 0,
  };
  MOCK_ASSETS.unshift(item);
  pushActivity({
    projectId: item.projectId,
    entityType: 'asset',
    entityLabel: item.label,
    actorName,
    action: 'created asset',
  });
  return item;
}

export function updateProjectAsset(assetId: string, patch: Partial<ProjectAsset>, actorName: string): { ok: boolean } {
  const item = MOCK_ASSETS.find((a) => a.id === assetId);
  if (!item) return { ok: false };
  const nextSourceType = patch.sourceType ?? item.sourceType ?? 'upload';
  const nextStorageFilename = patch.storage?.filename || item.storage?.filename || item.label.replace(/\s+/g, '-').toLowerCase();
  const nextStorage = nextSourceType === 'upload'
    ? {
      ...getProjectAssetStorageAdapter().resolveStorage({
        projectId: item.projectId,
        assetId: item.id,
        filename: nextStorageFilename,
        sourceType: nextSourceType,
      }),
      ...(item.storage || {}),
      ...(patch.storage || {}),
      filename: nextStorageFilename,
    }
    : undefined;
  const nextSourceUrl =
    nextSourceType === 'external_link'
      ? (patch.sourceUrl !== undefined ? patch.sourceUrl : item.sourceUrl) ?? ''
      : (patch.sourceUrl !== undefined ? (patch.sourceUrl || undefined) : (item.sourceUrl || undefined));
  Object.assign(item, patch, {
    sourceType: nextSourceType,
    sourceUrl: nextSourceUrl,
    storage: nextStorage,
    notes: patch.notes ?? item.notes ?? '',
    updatedAt: new Date().toISOString(),
  });
  pushActivity({
    projectId: item.projectId,
    entityType: 'asset',
    entityLabel: item.label,
    actorName,
    action: 'updated asset',
  });
  return { ok: true };
}

export function deleteProjectAsset(assetId: string, actorName: string): { ok: boolean } {
  const idx = MOCK_ASSETS.findIndex((a) => a.id === assetId);
  if (idx < 0) return { ok: false };
  const [item] = MOCK_ASSETS.splice(idx, 1);
  pushActivity({
    projectId: item.projectId,
    entityType: 'asset',
    entityLabel: item.label,
    actorName,
    action: 'deleted asset',
  });
  return { ok: true };
}

export function createDeliverable(input: Omit<ProjectDeliverable, 'id'>, actorName: string): ProjectDeliverable {
  if (!input.label.trim()) throw new Error('Deliverable label is required.');
  const item: ProjectDeliverable = {
    ...input,
    id: `d-${Date.now()}`,
    step: input.step ?? 'post_production',
    acceptanceCriteria: input.acceptanceCriteria ?? '',
    notes: input.notes ?? '',
    referenceLink: input.referenceLink?.trim() || undefined,
  };
  MOCK_PROJECT_DELIVERABLES.unshift(item);
  pushActivity({
    projectId: item.projectId,
    entityType: 'project',
    entityLabel: item.label,
    actorName,
    action: 'created deliverable',
  });
  return item;
}

export function updateDeliverable(id: string, patch: Partial<ProjectDeliverable>, actorName: string): { ok: boolean } {
  const item = MOCK_PROJECT_DELIVERABLES.find((d) => d.id === id);
  if (!item) return { ok: false };
  Object.assign(item, patch, {
    step: patch.step ?? item.step ?? 'post_production',
    acceptanceCriteria: patch.acceptanceCriteria ?? item.acceptanceCriteria ?? '',
    notes: patch.notes ?? item.notes ?? '',
    referenceLink:
      patch.referenceLink !== undefined ? (patch.referenceLink.trim() || undefined) : item.referenceLink,
  });
  pushActivity({
    projectId: item.projectId,
    entityType: 'project',
    entityLabel: item.label,
    actorName,
    action: 'updated deliverable',
  });
  return { ok: true };
}

export function deleteDeliverable(id: string, actorName: string): { ok: boolean } {
  const idx = MOCK_PROJECT_DELIVERABLES.findIndex((d) => d.id === id);
  if (idx < 0) return { ok: false };
  const [item] = MOCK_PROJECT_DELIVERABLES.splice(idx, 1);
  pushActivity({
    projectId: item.projectId,
    entityType: 'project',
    entityLabel: item.label,
    actorName,
    action: 'deleted deliverable',
  });
  return { ok: true };
}

function createControlEntity<T extends RiskItem | BlockerItem | DependencyItem>(
  list: T[],
  item: T,
  entityLabel: string,
  projectId: string,
  actorName: string
) {
  list.unshift(item);
  pushActivity({
    projectId,
    entityType: 'project',
    entityLabel,
    actorName,
    action: 'added control item',
  });
}

export function createRisk(item: Omit<RiskItem, 'id'>, actorName: string) {
  createControlEntity(MOCK_RISKS, { ...item, id: `r-${Date.now()}` }, item.label, item.projectId, actorName);
}
export function createBlocker(item: Omit<BlockerItem, 'id'>, actorName: string) {
  createControlEntity(MOCK_BLOCKERS, { ...item, id: `b-${Date.now()}` }, item.label, item.projectId, actorName);
}
export function createDependency(item: Omit<DependencyItem, 'id'>, actorName: string) {
  createControlEntity(MOCK_DEPENDENCIES, { ...item, id: `dep-${Date.now()}` }, item.label, item.projectId, actorName);
}

export function updateRisk(id: string, patch: Partial<RiskItem>, actorName: string): { ok: boolean } {
  const item = MOCK_RISKS.find((r) => r.id === id);
  if (!item) return { ok: false };
  Object.assign(item, patch);
  pushActivity({ projectId: item.projectId, entityType: 'project', entityLabel: item.label, actorName, action: 'updated risk' });
  return { ok: true };
}
export function updateBlocker(id: string, patch: Partial<BlockerItem>, actorName: string): { ok: boolean } {
  const item = MOCK_BLOCKERS.find((r) => r.id === id);
  if (!item) return { ok: false };
  Object.assign(item, patch);
  pushActivity({ projectId: item.projectId, entityType: 'project', entityLabel: item.label, actorName, action: 'updated blocker' });
  return { ok: true };
}
export function updateDependency(id: string, patch: Partial<DependencyItem>, actorName: string): { ok: boolean } {
  const item = MOCK_DEPENDENCIES.find((r) => r.id === id);
  if (!item) return { ok: false };
  Object.assign(item, patch);
  pushActivity({ projectId: item.projectId, entityType: 'project', entityLabel: item.label, actorName, action: 'updated dependency' });
  return { ok: true };
}

export function createExpense(item: Omit<ProjectExpense, 'id'>, actorName: string): ProjectExpense {
  const exp: ProjectExpense = { ...item, id: `e-${Date.now()}` };
  MOCK_EXPENSES.unshift(exp);
  pushActivity({ projectId: exp.projectId, entityType: 'invoice', entityLabel: exp.label, actorName, action: 'logged expense' });
  return exp;
}

export function createInvoice(item: Omit<AdminInvoice, 'id'>, actorName: string): AdminInvoice {
  if (!item.clientName.trim()) throw new Error('Client name is required.');
  if (!item.issuedDate || !item.dueDate) throw new Error('Issued date and due date are required.');
  const invoice: AdminInvoice = { ...item, id: `INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 900 + 100)}` };
  MOCK_INVOICES_ADMIN.unshift(invoice);
  pushActivity({ projectId: invoice.projectId, entityType: 'invoice', entityLabel: invoice.id, actorName, action: 'created invoice' });
  return invoice;
}

export function updateInvoice(id: string, patch: Partial<AdminInvoice>, actorName: string): { ok: boolean } {
  const item = MOCK_INVOICES_ADMIN.find((i) => i.id === id);
  if (!item) return { ok: false };
  Object.assign(item, patch);
  pushActivity({ projectId: item.projectId, entityType: 'invoice', entityLabel: item.id, actorName, action: 'updated invoice' });
  return { ok: true };
}

export function attachAssetToInvoice(invoiceId: string, assetId: string, actorName: string): { ok: boolean; error?: string } {
  const invoice = MOCK_INVOICES_ADMIN.find((i) => i.id === invoiceId);
  if (!invoice) return { ok: false, error: 'Invoice not found.' };
  const project = getProjectById(invoice.projectId);
  if (!project) return { ok: false, error: 'Project not found.' };
  const asset = MOCK_ASSETS.find((a) => a.id === assetId);
  if (!asset || asset.projectId !== invoice.projectId) {
    return { ok: false, error: 'Asset must exist on the invoice project.' };
  }
  const existing = new Set(invoice.attachmentAssetIds || []);
  existing.add(assetId);
  invoice.attachmentAssetIds = [...existing];
  pushActivity({
    projectId: invoice.projectId,
    entityType: 'invoice',
    entityLabel: invoice.id,
    actorName,
    action: `attached ${asset.label}`,
  });
  return { ok: true };
}

export function attachMediaToCrewProfile(crewId: string, assetId: string): { ok: boolean; error?: string } {
  const crew = MOCK_CREW.find((item) => item.id === crewId);
  if (!crew) return { ok: false, error: 'Crew member not found.' };
  const existing = new Set(crew.mediaAssetIds || []);
  existing.add(assetId);
  crew.mediaAssetIds = [...existing];
  return { ok: true };
}

export function upsertCrewMediaPolicy(
  crewId: string,
  policy: {
    assetId: string;
    visibility: 'internal' | 'client' | 'hidden';
    usageRights: 'licensed' | 'owned' | 'restricted';
    expiresAt?: string;
  }
): { ok: boolean; error?: string } {
  const crew = MOCK_CREW.find((item) => item.id === crewId);
  if (!crew) return { ok: false, error: 'Crew member not found.' };
  const next = [...(crew.mediaPolicies || [])];
  const idx = next.findIndex((item) => item.assetId === policy.assetId);
  if (idx >= 0) {
    next[idx] = policy;
  } else {
    next.push(policy);
  }
  crew.mediaPolicies = next;
  return { ok: true };
}

export function recordStorageOpsEvent(
  event: Omit<StorageOpsEvent, 'id' | 'timestamp'>
): StorageOpsEvent {
  const created: StorageOpsEvent = {
    id: `ops-${Date.now()}`,
    timestamp: new Date().toISOString(),
    ...event,
  };
  MOCK_STORAGE_OPS_EVENTS.unshift(created);
  return created;
}

export function retryStorageOperation(eventId: string, actorName: string): { ok: boolean; error?: string } {
  const source = MOCK_STORAGE_OPS_EVENTS.find((event) => event.id === eventId);
  if (!source) return { ok: false, error: 'Storage event not found.' };
  recordStorageOpsEvent({
    eventType: 'retry',
    assetId: source.assetId,
    actorName,
    tenantId: source.tenantId,
    details: `Retry triggered for ${source.eventType}`,
  });
  return { ok: true };
}

export function revokeStorageOpsLink(eventId: string, actorName: string): { ok: boolean; error?: string } {
  const source = MOCK_STORAGE_OPS_EVENTS.find((event) => event.id === eventId);
  if (!source) return { ok: false, error: 'Storage event not found.' };
  recordStorageOpsEvent({
    eventType: 'link_revoked',
    assetId: source.assetId,
    actorName,
    tenantId: source.tenantId,
    details: `Revoked from ops console for source ${eventId}`,
  });
  return { ok: true };
}

function formatStageLabel(stage: ProjectStage): string {
  return stage
    .split('_')
    .map((item) => item.charAt(0).toUpperCase() + item.slice(1))
    .join(' ');
}
