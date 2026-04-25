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
  city?: string;
  notes: string;
  projectIds: string[];
}

export interface CrewProfile {
  id: string;
  displayName: string;
  role: 'director' | 'dp' | 'editor' | 'producer' | 'audio' | 'other';
  email: string;
  rateShootHour: number;
  rateEditHour: number;
  active: boolean;
  assignedProjectIds: string[];
  /** ISO week availability label for mock UI */
  availability: string;
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

export interface ProjectAsset {
  id: string;
  projectId: string;
  label: string;
  version: string;
  type: ProjectAssetType;
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
  description?: string;
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

export interface ProjectDeliverable {
  id: string;
  projectId: string;
  label: string;
  ownerCrewId: string;
  ownerName: string;
  dueDate: string;
  required: boolean;
  status: DeliverableStatus;
  linkedAssetIds: string[];
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
