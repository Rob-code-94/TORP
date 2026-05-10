import type {
  ActivityEntry,
  AdminMeeting,
  AdminProject,
  AdminShoot,
  ChangeOrder,
  ClientProfile,
  CrewProfile,
  DependencyItem,
  BlockerItem,
  PlannerItem,
  ProjectAsset,
  ProjectDeliverable,
  ProjectExpense,
  RiskItem,
  StorageOpsEvent,
  AdminInvoice,
  AdminProposal,
} from '../types';

/** In-memory mirrors of Firestore HQ docs — updated by `HqFirestoreProvider`, read by `hqAccess` and legacy sync helpers. */
let crewList: CrewProfile[] = [];
let clientList: ClientProfile[] = [];
let projectList: AdminProject[] = [];
let plannerList: PlannerItem[] = [];
let shootList: AdminShoot[] = [];
let meetingList: AdminMeeting[] = [];
let activityList: ActivityEntry[] = [];
let assetList: ProjectAsset[] = [];
let invoiceList: AdminInvoice[] = [];
let proposalList: AdminProposal[] = [];
let expenseList: ProjectExpense[] = [];
let deliverableList: ProjectDeliverable[] = [];
let riskList: RiskItem[] = [];
let blockerList: BlockerItem[] = [];
let dependencyList: DependencyItem[] = [];
let changeOrderList: ChangeOrder[] = [];
let storageOpsList: StorageOpsEvent[] = [];

export function resetHqSyncDirectoryForTests() {
  crewList = [];
  clientList = [];
  projectList = [];
  plannerList = [];
  shootList = [];
  meetingList = [];
  activityList = [];
  assetList = [];
  invoiceList = [];
  proposalList = [];
  expenseList = [];
  deliverableList = [];
  riskList = [];
  blockerList = [];
  dependencyList = [];
  changeOrderList = [];
  storageOpsList = [];
}

export function setHqCrewDirectory(next: CrewProfile[]) {
  crewList = next;
}

export function setHqClientDirectory(next: ClientProfile[]) {
  clientList = next;
}

export function setHqProjectDirectory(next: AdminProject[]) {
  projectList = next;
}

export function setHqPlannerDirectory(next: PlannerItem[]) {
  plannerList = next;
}

export function setHqShootDirectory(next: AdminShoot[]) {
  shootList = next;
}

export function setHqMeetingDirectory(next: AdminMeeting[]) {
  meetingList = next;
}

export function setHqActivityDirectory(next: ActivityEntry[]) {
  activityList = next;
}

export function setHqAssetDirectory(next: ProjectAsset[]) {
  assetList = next;
}

export function setHqInvoiceDirectory(next: AdminInvoice[]) {
  invoiceList = next;
}

export function setHqProposalDirectory(next: AdminProposal[]) {
  proposalList = next;
}

export function setHqExpenseDirectory(next: ProjectExpense[]) {
  expenseList = next;
}

export function setHqDeliverableDirectory(next: ProjectDeliverable[]) {
  deliverableList = next;
}

export function setHqRiskDirectory(next: RiskItem[]) {
  riskList = next;
}

export function setHqBlockerDirectory(next: BlockerItem[]) {
  blockerList = next;
}

export function setHqDependencyDirectory(next: DependencyItem[]) {
  dependencyList = next;
}

export function setHqChangeOrderDirectory(next: ChangeOrder[]) {
  changeOrderList = next;
}

export function setHqStorageOpsDirectory(next: StorageOpsEvent[]) {
  storageOpsList = next;
}

export function getHqCrewDirectory(): CrewProfile[] {
  return crewList;
}

export function getHqClientDirectory(): ClientProfile[] {
  return clientList;
}

export function getHqProjectDirectory(): AdminProject[] {
  return projectList;
}

/** Clear all HQ mirrors (e.g. sign-out or when Firebase is not active). */
export function clearHqSyncDirectory() {
  resetHqSyncDirectoryForTests();
}

export function getProjectByIdSync(id: string): AdminProject | undefined {
  return projectList.find((p) => p.id === id);
}

export function getHqDeliverableDirectory(): ProjectDeliverable[] {
  return deliverableList;
}

export function getDeliverablesByProjectSync(projectId: string): ProjectDeliverable[] {
  return deliverableList.filter((d) => d.projectId === projectId);
}

export function getRisksByProjectSync(projectId: string): RiskItem[] {
  return riskList.filter((r) => r.projectId === projectId);
}

export function getBlockersByProjectSync(projectId: string): BlockerItem[] {
  return blockerList.filter((b) => b.projectId === projectId);
}

export function getDependenciesByProjectSync(projectId: string): DependencyItem[] {
  return dependencyList.filter((d) => d.projectId === projectId);
}

export function getChangeOrdersByProjectSync(projectId: string): ChangeOrder[] {
  return changeOrderList.filter((c) => c.projectId === projectId);
}

export function getAssetsByProjectSync(projectId: string): ProjectAsset[] {
  return assetList.filter((a) => a.projectId === projectId);
}

export function getInvoicesByProjectSync(projectId: string): AdminInvoice[] {
  return invoiceList.filter((i) => i.projectId === projectId);
}

export function getProposalByProjectSync(projectId: string): AdminProposal | undefined {
  return proposalList.find((p) => p.projectId === projectId);
}

export function getShootsByProjectSync(projectId: string): AdminShoot[] {
  return shootList.filter((s) => s.projectId === projectId);
}

export function getAdminShootByIdSync(id: string): AdminShoot | undefined {
  return shootList.find((s) => s.id === id);
}

export function getMeetingsByProjectSync(projectId: string): AdminMeeting[] {
  return meetingList.filter((m) => m.projectId === projectId);
}

export function getExpensesByProjectSync(projectId: string): ProjectExpense[] {
  return expenseList.filter((e) => e.projectId === projectId);
}

export function getActivityByProjectSync(projectId: string): ActivityEntry[] {
  return activityList.filter((a) => a.projectId === projectId);
}

export function getPlannerItemsSync(): PlannerItem[] {
  return plannerList;
}

export function getActivitySync(): ActivityEntry[] {
  return activityList;
}

export function getHqInvoiceDirectory(): AdminInvoice[] {
  return invoiceList;
}

export function getHqProposalDirectory(): AdminProposal[] {
  return proposalList;
}

export function getHqExpenseDirectory(): ProjectExpense[] {
  return expenseList;
}

export function getHqRiskDirectory(): RiskItem[] {
  return riskList;
}

export function getHqBlockerDirectory(): BlockerItem[] {
  return blockerList;
}

export function getHqDependencyDirectory(): DependencyItem[] {
  return dependencyList;
}

export function getHqChangeOrderDirectory(): ChangeOrder[] {
  return changeOrderList;
}

export function getAssetsSync(): ProjectAsset[] {
  return assetList;
}

export function getStorageOpsSync(): StorageOpsEvent[] {
  return storageOpsList;
}

export function getShootsSync(): AdminShoot[] {
  return shootList;
}

export function getMeetingsSync(): AdminMeeting[] {
  return meetingList;
}
