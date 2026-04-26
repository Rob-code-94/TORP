export enum UserRole {
  PUBLIC = 'PUBLIC',
  ADMIN = 'ADMIN', // Owner
  PROJECT_MANAGER = 'PROJECT_MANAGER',
  STAFF = 'STAFF', // Crew
  CLIENT = 'CLIENT',
}

export type ProjectCategory =
  | 'Commercial'
  | 'Documentary'
  | 'Sports'
  | 'Fashion'
  | 'Retail'
  | 'Civic'
  | 'Spec';

export type GalleryAspect = 'video' | 'portrait' | 'square' | 'wide';

export interface VideoProjectGalleryItem {
  src: string;
  caption?: string;
  aspect: GalleryAspect;
}

export interface VideoProjectCredit {
  label: string;
  value: string;
}

export interface VideoProject {
  id: string;
  slug: string;
  title: string;
  client: string;
  year: string;
  category: ProjectCategory;
  tags: string[];
  aspectRatio: 'video' | 'portrait' | 'square';
  thumbnail: string;
  heroImage: string;
  logline: string;
  role: string;
  location?: string;
  deliverables: string[];
  gallery: VideoProjectGalleryItem[];
  credits: VideoProjectCredit[];
}

export interface Invoice {
  id: string;
  client: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
  date: string;
}

export interface Shoot {
  id: string;
  title: string;
  date: string;
  location: string;
  crew: string[];
}

// --- Admin HQ (CRM) — same shapes intended for future Crew/Client filtered views

/** High-level project pipeline (HoneyBook/ClickUp-style). */
export type ProjectStage =
  | 'inquiry'
  | 'scope'
  | 'estimate'
  | 'pre_production'
  | 'production'
  | 'post'
  | 'delivered'
  | 'archived';

export type AdminProjectStatus = 'active' | 'on_hold' | 'complete';

export interface ClientProfile {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  billingEmail: string;
  billingContactName: string;
  addressCity: string;
  addressState: string;
  addressPostal: string;
  addressCountry: string;
  preferredCommunication: 'email' | 'sms' | 'phone';
  timezone: string;
  clientStatus: 'active' | 'prospect' | 'paused';
  city?: string;
  notes: string;
  projectIds: string[];
  updatedAt?: string;
}

export interface CrewAvailabilityWindow {
  id: string;
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  startTime: string;
  endTime: string;
}

export interface CrewAvailabilityException {
  id: string;
  startDate: string;
  endDate: string;
  reason?: string;
}

export interface CrewAvailability {
  timezone: string;
  windows: CrewAvailabilityWindow[];
  exceptions: CrewAvailabilityException[];
  notes?: string;
}

/** HQ login tier on a people record; distinct from on-set craft `role`. Never CLIENT. */
export type CrewHqSystemRole = UserRole.ADMIN | UserRole.PROJECT_MANAGER | UserRole.STAFF;

export type CrewFeatureKey =
  | 'quick.addClient'
  | 'page.clients'
  | 'quick.addProject'
  | 'page.financials'
  | 'quick.addTaskShoot'
  | 'page.settings';

export type CrewFeatureAccess = Partial<Record<CrewFeatureKey, boolean>>;

export interface CrewProfile {
  id: string;
  displayName: string;
  role: 'director' | 'dp' | 'editor' | 'producer' | 'audio' | 'other';
  systemRole: CrewHqSystemRole;
  /** Optional per-user HQ feature toggles; explicit values override role defaults. */
  featureAccess?: CrewFeatureAccess;
  email: string;
  phone?: string;
  rateShootHour: number;
  rateEditHour: number;
  active: boolean;
  assignedProjectIds: string[];
  /** Legacy label used in table snapshots; keep in sync with structured availability. */
  availability: string;
  availabilityDetail: CrewAvailability;
  lastResetRequestedAt?: string;
  lastResetRequestedBy?: string;
  lastTempPasswordSetAt?: string;
  lastTempPasswordSetBy?: string;
  forcePasswordChange?: boolean;
}

export interface AdminProject {
  id: string;
  projectCode?: string;
  title: string;
  clientId: string;
  clientName: string;
  /** Package / scope label (Essentials, Podcast Pack, custom). */
  packageLabel: string;
  stage: ProjectStage;
  status: AdminProjectStatus;
  budget: number;
  startDate?: string;
  dueDate: string; // ISO date
  priority?: PlannerItemPriority;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  sourceChannel?: 'referral' | 'inbound' | 'outbound' | 'repeat';
  ownerCrewId: string;
  ownerName: string;
  assignedCrewIds?: string[];
  summary: string;
  brief: string;
  goals: string;
  nextMilestone: string;
  deliverables: string[];
  contactEmail: string;
  location?: string;
}

export type PlannerItemType =
  | 'pre_production'
  | 'shoot'
  | 'edit'
  | 'review'
  | 'delivery'
  | 'admin'
  | 'invoice'
  | 'client_followup';

export type PlannerBoardColumn = 'queue' | 'active' | 'post' | 'client_review' | 'complete';

export type PlannerItemPriority = 'low' | 'medium' | 'high' | 'urgent';
export type PlannerTaskStatus = 'todo' | 'in_progress' | 'client_review' | 'done';

export interface PlannerItem {
  id: string;
  projectId: string;
  projectTitle: string;
  clientName: string;
  type: PlannerItemType;
  title: string;
  /** Board column (Plaky-style Kanban grouping). */
  column: PlannerBoardColumn;
  priority: PlannerItemPriority;
  dueDate: string; // ISO date
  /** Multi-assignee model for project tasks. */
  assigneeCrewIds?: string[];
  assigneeNames?: string[];
  assigneeCrewId: string;
  assigneeName: string;
  done: boolean;
  status?: PlannerTaskStatus;
  notes?: string;
  description?: string;
  referenceLink?: string;
}

export type ProjectAssetType = 'video' | 'still' | 'doc' | 'audio';

export type ProjectAssetStatus = 'internal' | 'client_review' | 'approved' | 'delivered';
export type ProjectAssetSourceType = 'upload' | 'external_link';

export interface ProjectAssetStorageMetadata {
  path?: string;
  url?: string;
  mimeType?: string;
  sizeBytes?: number;
  filename?: string;
}

export interface ProjectAsset {
  id: string;
  projectId: string;
  label: string;
  version: string;
  type: ProjectAssetType;
  sourceType?: ProjectAssetSourceType;
  sourceUrl?: string;
  storage?: ProjectAssetStorageMetadata;
  notes?: string;
  status: ProjectAssetStatus;
  clientVisible: boolean;
  /** ISO datetime */
  updatedAt: string;
  commentCount: number;
}

export type AdminInvoiceStatus = 'draft' | 'sent' | 'partial' | 'paid' | 'overdue' | 'void';

export interface AdminInvoice {
  id: string;
  projectId: string;
  clientName: string;
  amount: number;
  amountPaid: number;
  /** ISO date */
  issuedDate: string;
  /** ISO date */
  dueDate: string;
  status: AdminInvoiceStatus;
}

export type ProposalContractStatus = 'draft' | 'sent' | 'viewed' | 'signed' | 'declined';

export interface AdminProposal {
  id: string;
  projectId: string;
  clientName: string;
  contractStatus: ProposalContractStatus;
  viewedAt?: string;
  signedAt?: string;
  lineItems: { label: string; amount: number }[];
  total: number;
  depositPercent: number;
  /** For mock “viewed / signed / paid” tracking. */
  lastEvent?: string;
}

export interface ActivityEntry {
  id: string;
  projectId: string;
  projectTitle: string;
  entityType: 'project' | 'planner' | 'invoice' | 'asset' | 'proposal' | 'shoot' | 'meeting';
  entityLabel: string;
  actorName: string;
  action: string;
  createdAt: string; // ISO datetime
}

/** Shoot day for admin project profile + calendar. */
export interface AdminShoot extends Shoot {
  projectId: string;
  callTime: string;
  projectTitle: string;
  gearSummary: string;
  /** Optional per-shoot gear checklist (mock; future: Firestore). */
  gearItems?: string[];
  description?: string;
  crewIds?: string[];
}

export interface AdminMeeting {
  id: string;
  projectId: string;
  projectTitle: string;
  title: string;
  date: string;
  startTime: string;
  location: string;
  participants: string[];
  participantCrewIds?: string[];
  description?: string;
}

export type ExpenseCategory = 'rental' | 'talent' | 'permit' | 'travel' | 'location' | 'other';

export interface ProjectExpense {
  id: string;
  projectId: string;
  label: string;
  amount: number;
  category: ExpenseCategory;
  date: string;
}

export interface ProjectStageTransition {
  id: string;
  projectId: string;
  fromStage: ProjectStage;
  toStage: ProjectStage;
  changedBy: string;
  changedAt: string;
}

export type DeliverableStatus =
  | 'not_started'
  | 'in_progress'
  | 'ready_for_approval'
  | 'approved'
  | 'delivered';
export type DeliverableStep = 'pre_production' | 'production' | 'post_production' | 'delivery';

export interface ProjectDeliverable {
  id: string;
  projectId: string;
  label: string;
  ownerCrewId: string;
  ownerName: string;
  dueDate: string;
  required: boolean;
  step?: DeliverableStep;
  status: DeliverableStatus;
  linkedAssetIds: string[];
  /** Optional review, Frame.io, or delivery link. */
  referenceLink?: string;
  acceptanceCriteria?: string;
  notes?: string;
}

export interface RiskItem {
  id: string;
  projectId: string;
  label: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'monitoring' | 'resolved';
  ownerName: string;
  dueDate?: string;
}

export interface BlockerItem {
  id: string;
  projectId: string;
  label: string;
  status: 'open' | 'resolved';
  ownerName: string;
  dueDate?: string;
}

export interface DependencyItem {
  id: string;
  projectId: string;
  label: string;
  dependsOnProjectId?: string;
  status: 'waiting' | 'active' | 'cleared';
}

export interface ChangeOrder {
  id: string;
  projectId: string;
  title: string;
  amount: number;
  status: 'requested' | 'approved' | 'rejected';
  requestedBy: string;
  requestedAt: string;
}

export type ProjectCapability =
  | 'project.create'
  | 'project.edit'
  | 'project.archive'
  | 'project.bulk.archive'
  | 'project.bulk.assign'
  | 'project.stage.move'
  | 'project.financial.approve'
  | 'project.changeOrder.request'
  | 'project.changeOrder.approve';

/** Input for Google Calendar (TEMPLATE) links and .ics export (client-only; no server IDs). */
export interface CalendarEventPayload {
  title: string;
  /** When `allDay` is true, time-of-day on `start` is ignored. */
  start: Date;
  /** If omitted, defaults to +1h (timed) or end of all-day block (date-only). */
  end?: Date;
  allDay?: boolean;
  location?: string;
  description?: string;
  /** Maps to GCal `add` query param; comma-separated in URL. */
  attendeeEmails?: string[];
}
