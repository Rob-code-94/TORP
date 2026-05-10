/**
 * HQ org data in Firestore — top-level collections with `tenantId` on each doc
 * (aligns with calendar Functions: crew, shoots, meetings, plannerItems).
 */
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
  type Firestore,
  type Unsubscribe,
} from 'firebase/firestore';
import type { Timestamp } from 'firebase/firestore';
import { getFirebaseFirestoreInstance, isFirebaseConfigured } from '../lib/firebase';
import type {
  ActivityEntry,
  AdminInvoice,
  AdminMeeting,
  AdminProject,
  AdminProposal,
  AdminShoot,
  BlockerItem,
  ChangeOrder,
  ClientProfile,
  CrewProfile,
  DependencyItem,
  PlannerItem,
  ProjectAsset,
  ProjectDeliverable,
  ProjectExpense,
  ProjectStage,
  RiskItem,
  StorageOpsEvent,
} from '../types';
import { UserRole } from '../types';
import {
  getAssetsSync,
  getHqCrewDirectory,
  getHqInvoiceDirectory,
  getPlannerItemsSync,
  getStorageOpsSync,
  setHqActivityDirectory,
  setHqAssetDirectory,
  setHqBlockerDirectory,
  setHqChangeOrderDirectory,
  setHqClientDirectory,
  setHqCrewDirectory,
  setHqDeliverableDirectory,
  setHqDependencyDirectory,
  setHqExpenseDirectory,
  setHqInvoiceDirectory,
  setHqMeetingDirectory,
  setHqPlannerDirectory,
  setHqProjectDirectory,
  setHqProposalDirectory,
  setHqRiskDirectory,
  setHqShootDirectory,
  setHqStorageOpsDirectory,
} from './hqSyncDirectory';

function omitUndefinedRecord(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

export const HQ_COLLECTION = {
  crew: 'crew',
  clients: 'clients',
  hqProjects: 'hqProjects',
  plannerItems: 'plannerItems',
  shoots: 'shoots',
  meetings: 'meetings',
  hqActivity: 'hqActivity',
  hqProjectAssets: 'hqProjectAssets',
  hqInvoices: 'hqInvoices',
  hqProposals: 'hqProposals',
  hqExpenses: 'hqExpenses',
  hqDeliverables: 'hqDeliverables',
  hqRisks: 'hqRisks',
  hqBlockers: 'hqBlockers',
  hqDependencies: 'hqDependencies',
  hqChangeOrders: 'hqChangeOrders',
  hqStorageOpsEvents: 'hqStorageOpsEvents',
} as const;

function tsIso(v: unknown): string | undefined {
  if (v == null) return undefined;
  if (typeof v === 'string') return v;
  const t = v as Timestamp;
  if (typeof t?.toDate === 'function') return t.toDate().toISOString();
  return undefined;
}

function parseCrew(id: string, data: Record<string, unknown>): CrewProfile {
  const systemRole = data.systemRole as CrewProfile['systemRole'];
  return {
    id,
    displayName: String(data.displayName ?? ''),
    role: (data.role as CrewProfile['role']) ?? 'other',
    systemRole: systemRole ?? UserRole.STAFF,
    featureAccess: (data.featureAccess as CrewProfile['featureAccess']) ?? undefined,
    email: String(data.email ?? ''),
    phone: String(data.phone ?? ''),
    rateShootHour: Number(data.rateShootHour ?? 0),
    rateEditHour: Number(data.rateEditHour ?? 0),
    active: Boolean(data.active ?? true),
    assignedProjectIds: (data.assignedProjectIds as string[]) ?? [],
    availability: String(data.availability ?? ''),
    availabilityDetail: (data.availabilityDetail as CrewProfile['availabilityDetail']) ?? {
      timezone: 'America/Chicago',
      windows: [],
      exceptions: [],
      notes: '',
    },
    lastResetRequestedAt: tsIso(data.lastResetRequestedAt),
    lastResetRequestedBy: data.lastResetRequestedBy as string | undefined,
    lastTempPasswordSetAt: tsIso(data.lastTempPasswordSetAt),
    lastTempPasswordSetBy: data.lastTempPasswordSetBy as string | undefined,
    forcePasswordChange: data.forcePasswordChange as boolean | undefined,
    mediaAssetIds: data.mediaAssetIds as string[] | undefined,
    mediaPolicies: data.mediaPolicies as CrewProfile['mediaPolicies'],
  };
}

function parseClient(id: string, data: Record<string, unknown>): ClientProfile {
  return {
    id,
    name: String(data.name ?? ''),
    company: String(data.company ?? ''),
    email: String(data.email ?? ''),
    phone: String(data.phone ?? ''),
    billingEmail: String(data.billingEmail ?? ''),
    billingContactName: String(data.billingContactName ?? ''),
    addressCity: String(data.addressCity ?? ''),
    addressState: String(data.addressState ?? ''),
    addressPostal: String(data.addressPostal ?? ''),
    addressCountry: String(data.addressCountry ?? ''),
    preferredCommunication: (data.preferredCommunication as ClientProfile['preferredCommunication']) ?? 'email',
    timezone: String(data.timezone ?? 'America/Chicago'),
    clientStatus: (data.clientStatus as ClientProfile['clientStatus']) ?? 'active',
    city: data.city as string | undefined,
    notes: String(data.notes ?? ''),
    projectIds: (data.projectIds as string[]) ?? [],
    updatedAt: tsIso(data.updatedAt) ?? undefined,
  };
}

function parseAdminProject(id: string, data: Record<string, unknown>): AdminProject {
  return {
    id,
    projectCode: data.projectCode as string | undefined,
    title: String(data.title ?? ''),
    clientId: String(data.clientId ?? ''),
    clientName: String(data.clientName ?? ''),
    packageLabel: String(data.packageLabel ?? ''),
    stage: (data.stage as AdminProject['stage']) ?? 'inquiry',
    status: (data.status as AdminProject['status']) ?? 'active',
    budget: Number(data.budget ?? 0),
    startDate: data.startDate as string | undefined,
    dueDate: String(data.dueDate ?? ''),
    priority: data.priority as AdminProject['priority'],
    riskLevel: data.riskLevel as AdminProject['riskLevel'],
    sourceChannel: data.sourceChannel as AdminProject['sourceChannel'],
    ownerCrewId: String(data.ownerCrewId ?? ''),
    ownerName: String(data.ownerName ?? ''),
    assignedCrewIds: (data.assignedCrewIds as string[]) ?? [],
    summary: String(data.summary ?? ''),
    brief: String(data.brief ?? ''),
    goals: String(data.goals ?? ''),
    nextMilestone: String(data.nextMilestone ?? ''),
    deliverables: (data.deliverables as string[]) ?? [],
    contactEmail: String(data.contactEmail ?? ''),
    location: data.location as string | undefined,
  };
}

function parsePlannerItem(id: string, data: Record<string, unknown>): PlannerItem {
  const assigneeCrewId = String(data.assigneeCrewId ?? '');
  const assigneeCrewIds = (data.assigneeCrewIds as string[] | undefined) ?? [assigneeCrewId].filter(Boolean);
  return {
    id,
    projectId: String(data.projectId ?? ''),
    projectTitle: String(data.projectTitle ?? ''),
    clientName: String(data.clientName ?? ''),
    type: data.type as PlannerItem['type'],
    title: String(data.title ?? ''),
    column: data.column as PlannerItem['column'],
    priority: data.priority as PlannerItem['priority'],
    dueDate: String(data.dueDate ?? ''),
    assigneeCrewIds,
    assigneeNames: (data.assigneeNames as string[]) ?? [],
    assigneeCrewId,
    assigneeName: String(data.assigneeName ?? ''),
    done: Boolean(data.done),
    status: data.status as PlannerItem['status'],
    notes: data.notes as string | undefined,
    description: data.description as string | undefined,
    attachmentAssetIds: data.attachmentAssetIds as string[] | undefined,
  };
}

function parseShoot(id: string, data: Record<string, unknown>): AdminShoot {
  return {
    id,
    projectId: String(data.projectId ?? ''),
    projectTitle: String(data.projectTitle ?? ''),
    title: String(data.title ?? ''),
    date: String(data.date ?? ''),
    callTime: String(data.callTime ?? ''),
    endTime: data.endTime as string | undefined,
    location: String(data.location ?? ''),
    gearSummary: String(data.gearSummary ?? ''),
    gearItems: data.gearItems as string[] | undefined,
    description: data.description as string | undefined,
    crewIds: (data.crewIds as string[]) ?? [],
  };
}

function parseMeeting(id: string, data: Record<string, unknown>): AdminMeeting {
  return {
    id,
    projectId: String(data.projectId ?? ''),
    projectTitle: String(data.projectTitle ?? ''),
    title: String(data.title ?? ''),
    date: String(data.date ?? ''),
    startTime: String(data.startTime ?? ''),
    endTime: data.endTime as string | undefined,
    location: String(data.location ?? ''),
    participants: (data.participants as string[]) ?? [],
    participantCrewIds: (data.participantCrewIds as string[]) ?? [],
    description: data.description as string | undefined,
  };
}

function parseActivity(id: string, data: Record<string, unknown>): ActivityEntry {
  return {
    id,
    projectId: String(data.projectId ?? ''),
    projectTitle: String(data.projectTitle ?? ''),
    entityType: data.entityType as ActivityEntry['entityType'],
    entityLabel: String(data.entityLabel ?? ''),
    actorName: String(data.actorName ?? ''),
    action: String(data.action ?? ''),
    createdAt: tsIso(data.createdAt) ?? new Date().toISOString(),
  };
}

function parseAsset(id: string, data: Record<string, unknown>): ProjectAsset {
  return {
    id,
    projectId: String(data.projectId ?? ''),
    projectTitle: String(data.projectTitle ?? ''),
    label: String(data.label ?? ''),
    type: data.type as ProjectAsset['type'],
    sourceType: data.sourceType as ProjectAsset['sourceType'],
    sourceRef: String(data.sourceRef ?? ''),
    version: Number(data.version ?? 1),
    status: data.status as ProjectAsset['status'],
    signedUrl: data.signedUrl as string | null,
    signedUrlExpiresAt: data.signedUrlExpiresAt as string | null,
    uploadedBy: String(data.uploadedBy ?? ''),
    uploadedAt: String(data.uploadedAt ?? ''),
    updatedAt: String(data.updatedAt ?? ''),
    usageRights: data.usageRights as ProjectAsset['usageRights'],
    storagePath: data.storagePath as string | null,
    storageBucket: data.storageBucket as string | null,
    storageDownloadUrl: data.storageDownloadUrl as string | null,
    metadata: (data.metadata as Record<string, unknown>) ?? {},
    notes: data.notes as string | undefined,
  };
}

function parseInvoice(id: string, data: Record<string, unknown>): AdminInvoice {
  return {
    id,
    projectId: String(data.projectId ?? ''),
    clientName: String(data.clientName ?? ''),
    amount: Number(data.amount ?? 0),
    amountPaid: Number(data.amountPaid ?? 0),
    status: data.status as AdminInvoice['status'],
    issuedDate: String(data.issuedDate ?? ''),
    dueDate: String(data.dueDate ?? ''),
    lockStatus: data.lockStatus as AdminInvoice['lockStatus'],
    lockedAt: data.lockedAt as string | undefined,
    lockedBy: data.lockedBy as string | undefined,
    attachmentAssetIds: data.attachmentAssetIds as string[] | undefined,
  };
}

function parseProposal(id: string, data: Record<string, unknown>): AdminProposal {
  return {
    id,
    projectId: String(data.projectId ?? ''),
    clientName: String(data.clientName ?? ''),
    contractStatus: (data.contractStatus as AdminProposal['contractStatus']) ?? 'draft',
    viewedAt: data.viewedAt as string | undefined,
    signedAt: data.signedAt as string | undefined,
    lineItems: (data.lineItems as AdminProposal['lineItems']) ?? [],
    total: Number(data.total ?? 0),
    depositPercent: Number(data.depositPercent ?? 0),
    lastEvent: data.lastEvent as string | undefined,
    attachmentAssetIds: data.attachmentAssetIds as string[] | undefined,
  };
}

function parseExpense(id: string, data: Record<string, unknown>): ProjectExpense {
  return {
    id,
    projectId: String(data.projectId ?? ''),
    label: String(data.label ?? ''),
    amount: Number(data.amount ?? 0),
    category: data.category as ProjectExpense['category'],
    date: String(data.date ?? ''),
  };
}

function parseDeliverable(id: string, data: Record<string, unknown>): ProjectDeliverable {
  return {
    id,
    projectId: String(data.projectId ?? ''),
    label: String(data.label ?? ''),
    ownerCrewId: String(data.ownerCrewId ?? ''),
    ownerName: String(data.ownerName ?? ''),
    dueDate: String(data.dueDate ?? ''),
    required: Boolean(data.required),
    status: data.status as ProjectDeliverable['status'],
    linkedAssetIds: (data.linkedAssetIds as string[]) ?? [],
    step: data.step as ProjectDeliverable['step'],
    acceptanceCriteria: String(data.acceptanceCriteria ?? ''),
    notes: data.notes as string | undefined,
  };
}

function parseRisk(id: string, data: Record<string, unknown>): RiskItem {
  return {
    id,
    projectId: String(data.projectId ?? ''),
    label: String(data.label ?? ''),
    severity: data.severity as RiskItem['severity'],
    status: data.status as RiskItem['status'],
    ownerName: String(data.ownerName ?? ''),
    dueDate: data.dueDate as string | undefined,
  };
}

function parseBlocker(id: string, data: Record<string, unknown>): BlockerItem {
  return {
    id,
    projectId: String(data.projectId ?? ''),
    label: String(data.label ?? ''),
    status: data.status as BlockerItem['status'],
    ownerName: String(data.ownerName ?? ''),
    dueDate: data.dueDate as string | undefined,
  };
}

function parseDependency(id: string, data: Record<string, unknown>): DependencyItem {
  return {
    id,
    projectId: String(data.projectId ?? ''),
    label: String(data.label ?? ''),
    status: data.status as DependencyItem['status'],
  };
}

function parseChangeOrder(id: string, data: Record<string, unknown>): ChangeOrder {
  return {
    id,
    projectId: String(data.projectId ?? ''),
    title: String(data.title ?? ''),
    amount: Number(data.amount ?? 0),
    status: data.status as ChangeOrder['status'],
    requestedBy: String(data.requestedBy ?? ''),
    requestedAt: String(data.requestedAt ?? ''),
  };
}

function parseStorageOps(id: string, data: Record<string, unknown>): StorageOpsEvent {
  return {
    id,
    eventType: data.eventType as StorageOpsEvent['eventType'],
    assetId: data.assetId as string | undefined,
    actorName: String(data.actorName ?? ''),
    tenantId: String(data.tenantId ?? ''),
    timestamp: String(data.timestamp ?? ''),
    errorCode: data.errorCode as string | undefined,
    details: data.details as string | undefined,
  };
}

/** Subscribe all HQ lists and push into `hqSyncDirectory` so `hqAccess` + screens stay consistent. */
export function subscribeHqOrgData(
  db: Firestore,
  tenantId: string,
  onUpdate?: () => void,
): () => void {
  const q = (name: string) => query(collection(db, name), where('tenantId', '==', tenantId));

  let coalescePending = false;
  const bump = () => {
    if (!onUpdate) return;
    if (coalescePending) return;
    coalescePending = true;
    queueMicrotask(() => {
      coalescePending = false;
      onUpdate();
    });
  };

  const apply = {
    crew: (rows: CrewProfile[]) => {
      setHqCrewDirectory(rows);
    },
    clients: (rows: ClientProfile[]) => setHqClientDirectory(rows),
    projects: (rows: AdminProject[]) => setHqProjectDirectory(rows),
    planner: (rows: PlannerItem[]) => setHqPlannerDirectory(rows),
    shoots: (rows: AdminShoot[]) => setHqShootDirectory(rows),
    meetings: (rows: AdminMeeting[]) => setHqMeetingDirectory(rows),
    activity: (rows: ActivityEntry[]) => setHqActivityDirectory(rows),
    assets: (rows: ProjectAsset[]) => setHqAssetDirectory(rows),
    invoices: (rows: AdminInvoice[]) => setHqInvoiceDirectory(rows),
    proposals: (rows: AdminProposal[]) => setHqProposalDirectory(rows),
    expenses: (rows: ProjectExpense[]) => setHqExpenseDirectory(rows),
    deliverables: (rows: ProjectDeliverable[]) => setHqDeliverableDirectory(rows),
    risks: (rows: RiskItem[]) => setHqRiskDirectory(rows),
    blockers: (rows: BlockerItem[]) => setHqBlockerDirectory(rows),
    dependencies: (rows: DependencyItem[]) => setHqDependencyDirectory(rows),
    changeOrders: (rows: ChangeOrder[]) => setHqChangeOrderDirectory(rows),
    storageOps: (rows: StorageOpsEvent[]) => setHqStorageOpsDirectory(rows),
  };

  const subs: Unsubscribe[] = [];
  subs.push(
    onSnapshot(q(HQ_COLLECTION.crew), (snap) => {
      apply.crew(snap.docs.map((d) => parseCrew(d.id, d.data() as Record<string, unknown>)));
      bump();
    }),
  );
  subs.push(
    onSnapshot(q(HQ_COLLECTION.clients), (snap) => {
      apply.clients(snap.docs.map((d) => parseClient(d.id, d.data() as Record<string, unknown>)));
      bump();
    }),
  );
  subs.push(
    onSnapshot(q(HQ_COLLECTION.hqProjects), (snap) => {
      apply.projects(snap.docs.map((d) => parseAdminProject(d.id, d.data() as Record<string, unknown>)));
      bump();
    }),
  );
  subs.push(
    onSnapshot(q(HQ_COLLECTION.plannerItems), (snap) => {
      apply.planner(snap.docs.map((d) => parsePlannerItem(d.id, d.data() as Record<string, unknown>)));
      bump();
    }),
  );
  subs.push(
    onSnapshot(q(HQ_COLLECTION.shoots), (snap) => {
      apply.shoots(snap.docs.map((d) => parseShoot(d.id, d.data() as Record<string, unknown>)));
      bump();
    }),
  );
  subs.push(
    onSnapshot(q(HQ_COLLECTION.meetings), (snap) => {
      apply.meetings(snap.docs.map((d) => parseMeeting(d.id, d.data() as Record<string, unknown>)));
      bump();
    }),
  );
  subs.push(
    onSnapshot(q(HQ_COLLECTION.hqActivity), (snap) => {
      apply.activity(snap.docs.map((d) => parseActivity(d.id, d.data() as Record<string, unknown>)));
      bump();
    }),
  );
  subs.push(
    onSnapshot(q(HQ_COLLECTION.hqProjectAssets), (snap) => {
      apply.assets(snap.docs.map((d) => parseAsset(d.id, d.data() as Record<string, unknown>)));
      bump();
    }),
  );
  subs.push(
    onSnapshot(q(HQ_COLLECTION.hqInvoices), (snap) => {
      apply.invoices(snap.docs.map((d) => parseInvoice(d.id, d.data() as Record<string, unknown>)));
      bump();
    }),
  );
  subs.push(
    onSnapshot(q(HQ_COLLECTION.hqProposals), (snap) => {
      apply.proposals(snap.docs.map((d) => parseProposal(d.id, d.data() as Record<string, unknown>)));
      bump();
    }),
  );
  subs.push(
    onSnapshot(q(HQ_COLLECTION.hqExpenses), (snap) => {
      apply.expenses(snap.docs.map((d) => parseExpense(d.id, d.data() as Record<string, unknown>)));
      bump();
    }),
  );
  subs.push(
    onSnapshot(q(HQ_COLLECTION.hqDeliverables), (snap) => {
      apply.deliverables(snap.docs.map((d) => parseDeliverable(d.id, d.data() as Record<string, unknown>)));
      bump();
    }),
  );
  subs.push(
    onSnapshot(q(HQ_COLLECTION.hqRisks), (snap) => {
      apply.risks(snap.docs.map((d) => parseRisk(d.id, d.data() as Record<string, unknown>)));
      bump();
    }),
  );
  subs.push(
    onSnapshot(q(HQ_COLLECTION.hqBlockers), (snap) => {
      apply.blockers(snap.docs.map((d) => parseBlocker(d.id, d.data() as Record<string, unknown>)));
      bump();
    }),
  );
  subs.push(
    onSnapshot(q(HQ_COLLECTION.hqDependencies), (snap) => {
      apply.dependencies(snap.docs.map((d) => parseDependency(d.id, d.data() as Record<string, unknown>)));
      bump();
    }),
  );
  subs.push(
    onSnapshot(q(HQ_COLLECTION.hqChangeOrders), (snap) => {
      apply.changeOrders(snap.docs.map((d) => parseChangeOrder(d.id, d.data() as Record<string, unknown>)));
      bump();
    }),
  );
  subs.push(
    onSnapshot(q(HQ_COLLECTION.hqStorageOpsEvents), (snap) => {
      apply.storageOps(snap.docs.map((d) => parseStorageOps(d.id, d.data() as Record<string, unknown>)));
      bump();
    }),
  );

  return () => subs.forEach((u) => u());
}

export function getHqDb(): Firestore | null {
  if (!isFirebaseConfigured()) return null;
  return getFirebaseFirestoreInstance();
}

function crewToFirestorePayload(c: CrewProfile, tenantId: string): Record<string, unknown> {
  return {
    tenantId,
    displayName: c.displayName,
    role: c.role,
    systemRole: c.systemRole,
    featureAccess: c.featureAccess ?? null,
    email: c.email,
    phone: c.phone,
    rateShootHour: c.rateShootHour,
    rateEditHour: c.rateEditHour,
    active: c.active,
    assignedProjectIds: c.assignedProjectIds,
    availability: c.availability,
    availabilityDetail: c.availabilityDetail,
    lastResetRequestedAt: c.lastResetRequestedAt ?? null,
    lastResetRequestedBy: c.lastResetRequestedBy ?? null,
    lastTempPasswordSetAt: c.lastTempPasswordSetAt ?? null,
    lastTempPasswordSetBy: c.lastTempPasswordSetBy ?? null,
    forcePasswordChange: c.forcePasswordChange ?? false,
    mediaAssetIds: c.mediaAssetIds ?? [],
    mediaPolicies: c.mediaPolicies ?? [],
    updatedAt: serverTimestamp(),
  };
}

export async function hqUpsertCrew(tenantId: string, crew: CrewProfile, uid?: string | null): Promise<void> {
  const prev = getHqCrewDirectory();
  const idx = prev.findIndex((c) => c.id === crew.id);
  const next = idx >= 0 ? prev.map((c) => (c.id === crew.id ? crew : c)) : [...prev, crew];
  setHqCrewDirectory(next);

  if (!isFirebaseConfigured()) return;

  const db = getFirebaseFirestoreInstance();
  const payload = crewToFirestorePayload(crew, tenantId);
  if (uid) payload.uid = uid;
  await setDoc(doc(db, HQ_COLLECTION.crew, crew.id), payload, { merge: true });
}

export async function hqDeleteCrew(tenantId: string, crewId: string): Promise<void> {
  const db = getFirebaseFirestoreInstance();
  const ref = doc(db, HQ_COLLECTION.crew, crewId);
  const snap = await import('firebase/firestore').then(({ getDoc }) => getDoc(ref));
  const data = snap.data();
  if (data?.tenantId !== tenantId) throw new Error('Crew not in tenant.');
  await deleteDoc(ref);
}

export async function hqUpsertClient(tenantId: string, client: ClientProfile): Promise<void> {
  const db = getFirebaseFirestoreInstance();
  await setDoc(
    doc(db, HQ_COLLECTION.clients, client.id),
    {
      tenantId,
      name: client.name,
      company: client.company,
      email: client.email,
      phone: client.phone,
      billingEmail: client.billingEmail,
      billingContactName: client.billingContactName,
      addressCity: client.addressCity,
      addressState: client.addressState,
      addressPostal: client.addressPostal,
      addressCountry: client.addressCountry,
      preferredCommunication: client.preferredCommunication,
      timezone: client.timezone,
      clientStatus: client.clientStatus,
      city: client.city ?? null,
      notes: client.notes,
      projectIds: client.projectIds,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function hqDeleteClient(tenantId: string, clientId: string): Promise<void> {
  const db = getFirebaseFirestoreInstance();
  const ref = doc(db, HQ_COLLECTION.clients, clientId);
  const { getDoc } = await import('firebase/firestore');
  const snap = await getDoc(ref);
  if (!snap.exists() || (snap.data() as { tenantId?: string }).tenantId !== tenantId) {
    throw new Error('Client not found.');
  }
  await deleteDoc(ref);
}

export async function hqUpsertProject(tenantId: string, project: AdminProject): Promise<void> {
  const db = getFirebaseFirestoreInstance();
  await setDoc(doc(db, HQ_COLLECTION.hqProjects, project.id), { tenantId, ...stripIds(project) }, { merge: true });
}

function stripIds(p: AdminProject): Record<string, unknown> {
  const { id: _id, ...rest } = p;
  return rest as Record<string, unknown>;
}

export async function hqUpsertPlannerItem(tenantId: string, item: PlannerItem): Promise<void> {
  const assigneeCrewIds =
    item.assigneeCrewIds?.length ? item.assigneeCrewIds : item.assigneeCrewId ? [item.assigneeCrewId] : [];
  const prev = getPlannerItemsSync();
  const idx = prev.findIndex((p) => p.id === item.id);
  const mergedList = idx >= 0 ? prev.map((p) => (p.id === item.id ? item : p)) : [item, ...prev];
  setHqPlannerDirectory(mergedList);

  if (!isFirebaseConfigured()) return;

  const db = getFirebaseFirestoreInstance();
  await setDoc(doc(db, HQ_COLLECTION.plannerItems, item.id), {
    tenantId,
    ...stripPlannerIds(item),
    assigneeCrewIds,
  }, { merge: true });
}

function stripPlannerIds(item: PlannerItem): Record<string, unknown> {
  const { id: _id, ...rest } = item;
  return rest as Record<string, unknown>;
}

export async function hqDeletePlannerItem(tenantId: string, itemId: string): Promise<void> {
  setHqPlannerDirectory(getPlannerItemsSync().filter((p) => p.id !== itemId));

  if (!isFirebaseConfigured()) return;

  const db = getFirebaseFirestoreInstance();
  const ref = doc(db, HQ_COLLECTION.plannerItems, itemId);
  const snap = await getDoc(ref);
  if (!snap.exists() || (snap.data() as { tenantId?: string }).tenantId !== tenantId) {
    throw new Error('Planner item not found.');
  }
  await deleteDoc(ref);
}

async function hqDeleteWhereProject(
  db: Firestore,
  collectionId: string,
  tenantId: string,
  projectId: string,
): Promise<number> {
  const qy = query(
    collection(db, collectionId),
    where('tenantId', '==', tenantId),
    where('projectId', '==', projectId),
  );
  const snap = await getDocs(qy);
  let batch = writeBatch(db);
  let ops = 0;
  let total = 0;
  for (const d of snap.docs) {
    batch.delete(d.ref);
    ops += 1;
    total += 1;
    if (ops >= 450) {
      await batch.commit();
      batch = writeBatch(db);
      ops = 0;
    }
  }
  if (ops) await batch.commit();
  return total;
}

export async function hqUpsertActivity(tenantId: string, entry: ActivityEntry): Promise<void> {
  const db = getFirebaseFirestoreInstance();
  await setDoc(
    doc(db, HQ_COLLECTION.hqActivity, entry.id),
    {
      tenantId,
      projectId: entry.projectId,
      projectTitle: entry.projectTitle,
      entityType: entry.entityType,
      entityLabel: entry.entityLabel,
      actorName: entry.actorName,
      action: entry.action,
      createdAt: entry.createdAt,
    },
    { merge: true },
  );
}

export async function hqUpsertShoot(tenantId: string, shoot: AdminShoot): Promise<void> {
  const db = getFirebaseFirestoreInstance();
  const { id, ...rest } = shoot;
  await setDoc(doc(db, HQ_COLLECTION.shoots, id), { tenantId, ...rest }, { merge: true });
}

export async function hqUpsertMeeting(tenantId: string, meeting: AdminMeeting): Promise<void> {
  const db = getFirebaseFirestoreInstance();
  const { id, ...rest } = meeting;
  await setDoc(doc(db, HQ_COLLECTION.meetings, id), { tenantId, ...rest }, { merge: true });
}

export async function hqDeleteShoot(tenantId: string, shootId: string): Promise<void> {
  const db = getFirebaseFirestoreInstance();
  const ref = doc(db, HQ_COLLECTION.shoots, shootId);
  const snap = await getDoc(ref);
  if (!snap.exists() || (snap.data() as { tenantId?: string }).tenantId !== tenantId) {
    throw new Error('Shoot not found.');
  }
  await deleteDoc(ref);
}

export async function hqDeleteMeeting(tenantId: string, meetingId: string): Promise<void> {
  const db = getFirebaseFirestoreInstance();
  const ref = doc(db, HQ_COLLECTION.meetings, meetingId);
  const snap = await getDoc(ref);
  if (!snap.exists() || (snap.data() as { tenantId?: string }).tenantId !== tenantId) {
    throw new Error('Meeting not found.');
  }
  await deleteDoc(ref);
}

export async function hqUpsertProjectAsset(tenantId: string, asset: ProjectAsset): Promise<void> {
  const db = getFirebaseFirestoreInstance();
  const { id, ...rest } = asset;
  await setDoc(doc(db, HQ_COLLECTION.hqProjectAssets, id), { tenantId, ...rest }, { merge: true });
}

export async function hqDeleteProjectAsset(tenantId: string, assetId: string): Promise<void> {
  const db = getFirebaseFirestoreInstance();
  const ref = doc(db, HQ_COLLECTION.hqProjectAssets, assetId);
  const snap = await getDoc(ref);
  if (!snap.exists() || (snap.data() as { tenantId?: string }).tenantId !== tenantId) {
    throw new Error('Asset not found.');
  }
  await deleteDoc(ref);
}

export async function hqUpsertDeliverable(tenantId: string, row: ProjectDeliverable): Promise<void> {
  const db = getFirebaseFirestoreInstance();
  const { id, ...rest } = row;
  await setDoc(doc(db, HQ_COLLECTION.hqDeliverables, id), { tenantId, ...rest }, { merge: true });
}

export async function hqUpsertRisk(tenantId: string, row: RiskItem): Promise<void> {
  const db = getFirebaseFirestoreInstance();
  const { id, ...rest } = row;
  await setDoc(doc(db, HQ_COLLECTION.hqRisks, id), { tenantId, ...rest }, { merge: true });
}

export async function hqUpsertBlocker(tenantId: string, row: BlockerItem): Promise<void> {
  const db = getFirebaseFirestoreInstance();
  const { id, ...rest } = row;
  await setDoc(doc(db, HQ_COLLECTION.hqBlockers, id), { tenantId, ...rest }, { merge: true });
}

export async function hqUpsertDependency(tenantId: string, row: DependencyItem): Promise<void> {
  const db = getFirebaseFirestoreInstance();
  const { id, ...rest } = row;
  await setDoc(doc(db, HQ_COLLECTION.hqDependencies, id), { tenantId, ...rest }, { merge: true });
}

export async function hqUpsertChangeOrder(tenantId: string, row: ChangeOrder): Promise<void> {
  const db = getFirebaseFirestoreInstance();
  const { id, ...rest } = row;
  await setDoc(doc(db, HQ_COLLECTION.hqChangeOrders, id), { tenantId, ...rest }, { merge: true });
}

export async function hqUpsertInvoice(tenantId: string, row: AdminInvoice): Promise<void> {
  const prev = getHqInvoiceDirectory();
  const idx = prev.findIndex((i) => i.id === row.id);
  const next = idx >= 0 ? prev.map((i) => (i.id === row.id ? row : i)) : [row, ...prev];
  setHqInvoiceDirectory(next);

  if (!isFirebaseConfigured()) return;

  const db = getFirebaseFirestoreInstance();
  const { id, ...rest } = row;
  await setDoc(
    doc(db, HQ_COLLECTION.hqInvoices, id),
    omitUndefinedRecord({ tenantId, ...(rest as Record<string, unknown>) }),
    { merge: true },
  );
}

export async function hqUpsertProposal(tenantId: string, row: AdminProposal): Promise<void> {
  const db = getFirebaseFirestoreInstance();
  const { id, ...rest } = row;
  await setDoc(doc(db, HQ_COLLECTION.hqProposals, id), { tenantId, ...rest }, { merge: true });
}

export async function hqUpsertExpense(tenantId: string, row: ProjectExpense): Promise<void> {
  const db = getFirebaseFirestoreInstance();
  const { id, ...rest } = row;
  await setDoc(doc(db, HQ_COLLECTION.hqExpenses, id), { tenantId, ...rest }, { merge: true });
}

export async function hqUpsertStorageOpsEvent(tenantId: string, row: StorageOpsEvent): Promise<void> {
  const prev = getStorageOpsSync();
  const without = prev.filter((e) => e.id !== row.id);
  setHqStorageOpsDirectory([row, ...without]);

  if (!isFirebaseConfigured()) return;

  const db = getFirebaseFirestoreInstance();
  const { id, ...rest } = row;
  await setDoc(doc(db, HQ_COLLECTION.hqStorageOpsEvents, id), { tenantId, ...rest }, { merge: true });
}

export async function hqDeleteDeliverable(tenantId: string, id: string): Promise<void> {
  const db = getFirebaseFirestoreInstance();
  const ref = doc(db, HQ_COLLECTION.hqDeliverables, id);
  const snap = await getDoc(ref);
  if (!snap.exists() || (snap.data() as { tenantId?: string }).tenantId !== tenantId) {
    throw new Error('Deliverable not found.');
  }
  await deleteDoc(ref);
}

/** Hard-delete a project and all HQ rows that reference it (same collections as legacy mock cascade). */
export async function hqDeleteProjectCascade(
  tenantId: string,
  projectId: string,
  _actorName: string,
): Promise<{
  counts: Record<string, number>;
}> {
  const db = getFirebaseFirestoreInstance();

  const counts: Record<string, number> = {};
  counts.planner = await hqDeleteWhereProject(db, HQ_COLLECTION.plannerItems, tenantId, projectId);
  counts.shoots = await hqDeleteWhereProject(db, HQ_COLLECTION.shoots, tenantId, projectId);
  counts.meetings = await hqDeleteWhereProject(db, HQ_COLLECTION.meetings, tenantId, projectId);
  counts.assets = await hqDeleteWhereProject(db, HQ_COLLECTION.hqProjectAssets, tenantId, projectId);
  counts.invoices = await hqDeleteWhereProject(db, HQ_COLLECTION.hqInvoices, tenantId, projectId);
  counts.proposals = await hqDeleteWhereProject(db, HQ_COLLECTION.hqProposals, tenantId, projectId);
  counts.expenses = await hqDeleteWhereProject(db, HQ_COLLECTION.hqExpenses, tenantId, projectId);
  counts.deliverables = await hqDeleteWhereProject(db, HQ_COLLECTION.hqDeliverables, tenantId, projectId);
  counts.risks = await hqDeleteWhereProject(db, HQ_COLLECTION.hqRisks, tenantId, projectId);
  counts.blockers = await hqDeleteWhereProject(db, HQ_COLLECTION.hqBlockers, tenantId, projectId);
  counts.dependencies = await hqDeleteWhereProject(db, HQ_COLLECTION.hqDependencies, tenantId, projectId);
  counts.changeOrders = await hqDeleteWhereProject(db, HQ_COLLECTION.hqChangeOrders, tenantId, projectId);
  counts.activity = await hqDeleteWhereProject(db, HQ_COLLECTION.hqActivity, tenantId, projectId);

  await deleteDoc(doc(db, HQ_COLLECTION.hqProjects, projectId));
  return { counts };
}

export function commandStatsFromCaches(params: {
  projects: AdminProject[];
  invoices: AdminInvoice[];
  assets: ProjectAsset[];
  planner: PlannerItem[];
}): {
  activeProjects: number;
  revenueYtd: number;
  outstanding: number;
  pendingApprovals: number;
  urgentTasks: number;
} {
  const active = params.projects.filter((p) => p.status === 'active').length;
  const paidRevenue = params.invoices
    .filter((i) => i.status === 'paid')
    .reduce((s, i) => s + i.amountPaid, 0);
  const outstanding = params.invoices
    .filter((i) => i.status !== 'paid' && i.status !== 'void')
    .reduce((s, i) => s + (i.amount - i.amountPaid), 0);
  const pendingApprovals = params.assets.filter((a) => a.status === 'client_review').length;
  const urgentTasks = params.planner.filter((t) => !t.done && t.priority === 'urgent').length;
  return {
    activeProjects: active,
    revenueYtd: paidRevenue,
    outstanding,
    pendingApprovals,
    urgentTasks,
  };
}
