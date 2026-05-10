import type {
  AdminProject,
  ChangeOrder,
  ProjectDeliverable,
  ProjectStage,
  RiskItem,
  BlockerItem,
  DependencyItem,
} from '../types';
import type { CrewAvailability, CrewProfile } from '../types';
import {
  createClientProfile,
  updateClientProfile,
  deleteClientProfile,
} from './hqClientCrud';
import {
  createCrewMemberProfile,
  deleteCrewMemberProfile,
  requestCrewPasswordReset,
  setCrewTemporaryPassword,
  updateCrewMemberProfile,
} from './hqCrewCrud';
import {
  archiveProject as hqArchiveProject,
  bulkArchiveProjects,
  bulkAssignCrewToProjects,
  countProjectCascade,
  deleteProjectCascade,
  transitionProjectStage as hqTransitionProjectStage,
  updateProjectNarrative as hqUpdateProjectNarrative,
} from './hqProjectOps';
import type { DeleteProjectCascadeResult, ProjectCascadeCounts } from './hqProjectOps';
import {
  getDeliverablesByProjectSync,
  getHqBlockerDirectory,
  getHqChangeOrderDirectory,
  getHqClientDirectory,
  getHqCrewDirectory,
  getHqDependencyDirectory,
  getHqProjectDirectory,
  getHqRiskDirectory,
} from './hqSyncDirectory';
import { hqUpsertProject } from './hqFirestoreService';
import { getHqTenantForWrites } from './hqWriteContext';

export type UiLoadState = 'loading' | 'empty' | 'error' | 'success';

export const UI_STATE_MATRIX = {
  projectsIndex: ['loading', 'empty', 'error', 'success'] as UiLoadState[],
  projectDetailTabs: ['loading', 'empty', 'error', 'success'] as UiLoadState[],
  createProjectWizard: ['loading', 'error', 'success'] as UiLoadState[],
};

export interface ProjectListRequest {
  q?: string;
  stage?: ProjectStage | 'all';
}

export interface ProjectListResponse {
  items: AdminProject[];
  total: number;
}

export function listProjects(request: ProjectListRequest): ProjectListResponse {
  const q = request.q?.trim().toLowerCase() ?? '';
  const stage = request.stage ?? 'all';
  const items = getHqProjectDirectory().filter(
    (item) =>
      (stage === 'all' || item.stage === stage) &&
      (!q ||
        item.title.toLowerCase().includes(q) ||
        item.clientName.toLowerCase().includes(q) ||
        item.packageLabel.toLowerCase().includes(q)),
  );
  return { items, total: items.length };
}

export interface CreateProjectRequest
  extends Pick<
    AdminProject,
    'title' | 'clientId' | 'clientName' | 'packageLabel' | 'budget' | 'dueDate' | 'ownerCrewId' | 'ownerName'
  > {
  stage: ProjectStage;
}

function requiredForStage(stage: ProjectStage): Array<keyof CreateProjectRequest> {
  switch (stage) {
    case 'inquiry':
    case 'scope':
      return ['title', 'clientId', 'clientName', 'stage'];
    case 'estimate':
    case 'pre_production':
      return ['title', 'clientId', 'clientName', 'stage', 'ownerCrewId', 'ownerName', 'dueDate'];
    case 'production':
    case 'post':
      return ['title', 'clientId', 'clientName', 'stage', 'ownerCrewId', 'ownerName', 'dueDate', 'packageLabel'];
    case 'delivered':
    case 'archived':
      return ['title', 'clientId', 'clientName', 'stage', 'ownerCrewId', 'ownerName', 'dueDate', 'packageLabel'];
    default: {
      const neverStage: never = stage;
      return neverStage;
    }
  }
}

function validateCreateProject(request: CreateProjectRequest) {
  const required = requiredForStage(request.stage);
  for (const field of required) {
    const value = request[field];
    if (typeof value === 'string' && !value.trim()) {
      throw new Error(`${field} is required for ${request.stage}.`);
    }
  }
  if (request.budget < 0) throw new Error('budget cannot be negative.');
  if (request.dueDate && Number.isNaN(Date.parse(request.dueDate))) throw new Error('dueDate must be an ISO date.');
}

export async function createProject(request: CreateProjectRequest): Promise<AdminProject> {
  validateCreateProject(request);
  const created: AdminProject = {
    id: `p${Date.now()}`,
    title: request.title,
    clientId: request.clientId,
    clientName: request.clientName,
    packageLabel: request.packageLabel,
    stage: request.stage,
    status: 'active',
    budget: request.budget,
    dueDate: request.dueDate,
    ownerCrewId: request.ownerCrewId,
    ownerName: request.ownerName,
    summary: '',
    brief: '',
    goals: '',
    nextMilestone: '',
    deliverables: [],
    contactEmail: '',
  };
  try {
    await hqUpsertProject(getHqTenantForWrites(), created);
  } catch (err) {
    console.error('[hq] createProject', err);
    throw err instanceof Error ? err : new Error('Could not create project.');
  }
  return created;
}

export async function moveProjectStage(
  projectId: string,
  toStage: ProjectStage,
  actorName: string,
): Promise<{ ok: boolean; error?: string }> {
  return hqTransitionProjectStage(projectId, toStage, actorName);
}

export async function bulkAssignCrew(projectIds: string[], crewIds: string[], actorName: string) {
  return bulkAssignCrewToProjects(projectIds, crewIds, actorName);
}

export async function archiveProjects(projectIds: string[], actorName: string) {
  return bulkArchiveProjects(projectIds, actorName);
}

export async function archiveProject(projectId: string, actorName: string): Promise<{ ok: boolean; error?: string }> {
  return hqArchiveProject(projectId, actorName);
}

export function deleteProject(projectId: string, actorName: string): DeleteProjectCascadeResult {
  return deleteProjectCascade(projectId, actorName);
}

export function getProjectCascadeCounts(projectId: string): ProjectCascadeCounts {
  return countProjectCascade(projectId);
}

export type { DeleteProjectCascadeResult, ProjectCascadeCounts };

export interface ProjectControlsResponse {
  deliverables: ProjectDeliverable[];
  risks: RiskItem[];
  blockers: BlockerItem[];
  dependencies: DependencyItem[];
  changeOrders: ChangeOrder[];
}

export function getProjectControls(projectId: string): ProjectControlsResponse {
  return {
    deliverables: getDeliverablesByProjectSync(projectId),
    risks: getHqRiskDirectory().filter((r) => r.projectId === projectId),
    blockers: getHqBlockerDirectory().filter((b) => b.projectId === projectId),
    dependencies: getHqDependencyDirectory().filter((d) => d.projectId === projectId),
    changeOrders: getHqChangeOrderDirectory().filter((c) => c.projectId === projectId),
  };
}

export interface CreateClientRequest {
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

export function listClients() {
  return { items: getHqClientDirectory() };
}

export function createClient(request: CreateClientRequest, options?: { quick?: boolean }) {
  return createClientProfile(request, options);
}

export function updateClient(clientId: string, request: CreateClientRequest) {
  return updateClientProfile(clientId, request);
}

export async function deleteClient(clientId: string) {
  return deleteClientProfile(clientId);
}

export interface CreateCrewRequest {
  displayName: string;
  role: CrewProfile['role'];
  email: string;
  phone?: string;
  rateShootHour: number;
  rateEditHour: number;
  active?: boolean;
  systemRole?: CrewProfile['systemRole'];
  featureAccess?: CrewProfile['featureAccess'];
}

export interface UpdateCrewRequest extends Partial<CreateCrewRequest> {
  availabilityDetail?: CrewAvailability;
}

export function listCrew() {
  return { items: getHqCrewDirectory() };
}

export async function createCrew(request: CreateCrewRequest) {
  return createCrewMemberProfile(request);
}

export async function updateCrew(crewId: string, request: UpdateCrewRequest) {
  return updateCrewMemberProfile(crewId, request);
}

export function sendCrewResetLink(crewId: string, actorName: string) {
  return requestCrewPasswordReset(crewId, actorName);
}

export function setCrewPassword(crewId: string, actorName: string, temporaryPassword: string) {
  return setCrewTemporaryPassword(crewId, actorName, temporaryPassword);
}

export function deleteCrew(crewId: string) {
  return deleteCrewMemberProfile(crewId);
}

export interface UpdateProjectNarrativeRequest {
  summary: string;
  brief: string;
  goals: string;
  nextMilestone: string;
}

export async function saveProjectNarrative(
  projectId: string,
  request: UpdateProjectNarrativeRequest,
  actorName: string,
): Promise<{ ok: boolean; error?: string }> {
  return hqUpdateProjectNarrative(projectId, request, actorName);
}
