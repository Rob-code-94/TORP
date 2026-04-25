import type {
  AdminProject,
  ChangeOrder,
  ProjectDeliverable,
  ProjectStage,
  RiskItem,
  BlockerItem,
  DependencyItem,
} from '../types';
import {
  MOCK_CLIENTS,
  MOCK_CREW,
  createCrewMemberProfile,
  MOCK_ADMIN_PROJECTS,
  MOCK_BLOCKERS,
  MOCK_CHANGE_ORDERS,
  MOCK_DEPENDENCIES,
  MOCK_PROJECT_DELIVERABLES,
  MOCK_RISKS,
  createClientProfile,
  requestCrewPasswordReset,
  setCrewTemporaryPassword,
  deleteCrewMemberProfile,
  updateClientProfile,
  updateCrewMemberProfile,
  updateProjectNarrative,
  transitionProjectStage,
} from './adminMock';
import type { CrewAvailability, CrewProfile } from '../types';

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
  const items = MOCK_ADMIN_PROJECTS.filter(
    (item) =>
      (stage === 'all' || item.stage === stage) &&
      (!q ||
        item.title.toLowerCase().includes(q) ||
        item.clientName.toLowerCase().includes(q) ||
        item.packageLabel.toLowerCase().includes(q))
  );
  return { items, total: items.length };
}

export interface CreateProjectRequest extends Pick<AdminProject, 'title' | 'clientId' | 'clientName' | 'packageLabel' | 'budget' | 'dueDate' | 'ownerCrewId' | 'ownerName'> {
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

export function createProject(request: CreateProjectRequest): AdminProject {
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
  MOCK_ADMIN_PROJECTS.unshift(created);
  return created;
}

export function moveProjectStage(projectId: string, toStage: ProjectStage, actorName: string): { ok: boolean; error?: string } {
  return transitionProjectStage(projectId, toStage, actorName);
}

export interface ProjectControlsResponse {
  deliverables: ProjectDeliverable[];
  risks: RiskItem[];
  blockers: BlockerItem[];
  dependencies: DependencyItem[];
  changeOrders: ChangeOrder[];
}

export function getProjectControls(projectId: string): ProjectControlsResponse {
  return {
    deliverables: MOCK_PROJECT_DELIVERABLES.filter((item) => item.projectId === projectId),
    risks: MOCK_RISKS.filter((item) => item.projectId === projectId),
    blockers: MOCK_BLOCKERS.filter((item) => item.projectId === projectId),
    dependencies: MOCK_DEPENDENCIES.filter((item) => item.projectId === projectId),
    changeOrders: MOCK_CHANGE_ORDERS.filter((item) => item.projectId === projectId),
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
  return { items: MOCK_CLIENTS };
}

export function createClient(request: CreateClientRequest) {
  return createClientProfile(request);
}

export function updateClient(clientId: string, request: CreateClientRequest) {
  return updateClientProfile(clientId, request);
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
  return { items: MOCK_CREW };
}

export function createCrew(request: CreateCrewRequest) {
  return createCrewMemberProfile(request);
}

export function updateCrew(crewId: string, request: UpdateCrewRequest) {
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

export function saveProjectNarrative(projectId: string, request: UpdateProjectNarrativeRequest, actorName: string) {
  return updateProjectNarrative(projectId, request, actorName);
}
