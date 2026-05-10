/**
 * Seed HQ collections in Firestore (use with emulators: FIRESTORE_EMULATOR_HOST=127.0.0.1:8080).
 *
 *   TORP_HQ_TENANT_ID=torp-default \
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 \
 *   node scripts/seedHqFirestore.mjs
 *
 * Optional demo graph (linked client + project + planner task):
 *   TORP_HQ_SEED_DEMO=1
 *
 * Production (explicit opt-in — writes real docs):
 *   TORP_ALLOW_PROD_HQ_BOOTSTRAP=true GOOGLE_APPLICATION_CREDENTIALS=...
 */
import { readFile } from 'node:fs/promises';
import { getApp, getApps, initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const TENANT_ID = process.env.TORP_HQ_TENANT_ID || 'torp-default';
const DEMO = process.env.TORP_HQ_SEED_DEMO === '1' || process.env.TORP_HQ_SEED_DEMO === 'true';

/** IDs for placeholder graph */
const ID = {
  cliPh: 'cli-bootstrap',
  projPh: 'proj-bootstrap',
  cliDemo: 'cli-seed-1',
  projDemo: 'proj-seed-1',
  taskDemo: 'task-seed-1',
};

function assertSafeTarget() {
  const emulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST?.trim());
  const allowProd = process.env.TORP_ALLOW_PROD_HQ_BOOTSTRAP === 'true';
  if (emulator || allowProd) return;
  console.error(
    '[seedHqFirestore] Refusing to write: set FIRESTORE_EMULATOR_HOST for the emulator, or TORP_ALLOW_PROD_HQ_BOOTSTRAP=true for production.',
  );
  process.exit(1);
}

async function initAdmin() {
  if (getApps().length) return;
  const p = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const gcpProject =
    process.env.GCLOUD_PROJECT?.trim() || process.env.GOOGLE_CLOUD_PROJECT?.trim() || undefined;
  if (p) {
    const sa = JSON.parse(await readFile(p, 'utf8'));
    initializeApp({ credential: cert(sa), projectId: sa.project_id });
    return;
  }
  initializeApp({
    credential: applicationDefault(),
    ...(gcpProject ? { projectId: gcpProject } : {}),
  });
}

const CREW_SEED = [
  {
    id: 'cr-4',
    displayName: 'ROB R',
    email: 'info@torp.life',
    systemRole: 'ADMIN',
    role: 'other',
  },
  {
    id: 'cr-5',
    displayName: 'William Fairbanks',
    email: 'william@torp.life',
    systemRole: 'ADMIN',
    role: 'other',
  },
  {
    id: 'cr-6',
    displayName: 'Jayden Price',
    email: 'jp@torp.life',
    systemRole: 'ADMIN',
    role: 'producer',
  },
  {
    id: 'cr-staff-1',
    displayName: 'A. Vance',
    email: 'staff@torp.life',
    systemRole: 'STAFF',
    role: 'director',
  },
];

function isoDate(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function nowIso() {
  return new Date().toISOString();
}

function seedCrewBatch(db) {
  const batch = db.batch();
  for (const row of CREW_SEED) {
    const ref = db.collection('crew').doc(row.id);
    batch.set(
      ref,
      {
        tenantId: TENANT_ID,
        displayName: row.displayName,
        email: row.email,
        role: row.role,
        systemRole: row.systemRole,
        phone: '',
        rateShootHour: 0,
        rateEditHour: 0,
        active: true,
        assignedProjectIds: [],
        availability: '',
        availabilityDetail: {
          timezone: 'America/Chicago',
          windows: [],
          exceptions: [],
          notes: '',
        },
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }
  return batch;
}

/**
 * @param {import('firebase-admin/firestore').Firestore} db
 * @param {import('firebase-admin/firestore').WriteBatch} batch
 */
function addBootstrapDocs(db, batch) {
  const clientId = DEMO ? ID.cliDemo : ID.cliPh;
  const projectId = DEMO ? ID.projDemo : ID.projPh;
  const plannerId = DEMO ? ID.taskDemo : 'bootstrap-planner';

  if (DEMO) {
    batch.set(
      db.collection('clients').doc(ID.cliDemo),
      {
        tenantId: TENANT_ID,
        hqBootstrapPlaceholder: true,
        name: 'Seed Client Co.',
        company: 'Seed Client Co.',
        email: 'billing@seed-client.example',
        phone: '',
        billingEmail: '',
        billingContactName: '',
        addressCity: '',
        addressState: '',
        addressPostal: '',
        addressCountry: '',
        preferredCommunication: 'email',
        timezone: 'America/Chicago',
        clientStatus: 'active',
        notes: 'TORP HQ demo seed — safe to delete.',
        projectIds: [ID.projDemo],
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    batch.set(
      db.collection('hqProjects').doc(ID.projDemo),
      {
        tenantId: TENANT_ID,
        hqBootstrapPlaceholder: true,
        title: 'Seed Project',
        clientId: ID.cliDemo,
        clientName: 'Seed Client Co.',
        packageLabel: 'Essentials',
        stage: 'inquiry',
        status: 'active',
        budget: 0,
        dueDate: isoDate(),
        ownerCrewId: 'cr-4',
        ownerName: 'ROB R',
        assignedCrewIds: [],
        summary: 'Demo row linking cli-seed-1 — safe to delete.',
        brief: '',
        goals: '',
        nextMilestone: '',
        deliverables: [],
        contactEmail: 'billing@seed-client.example',
      },
      { merge: true },
    );
    batch.set(
      db.collection('plannerItems').doc(ID.taskDemo),
      {
        tenantId: TENANT_ID,
        hqBootstrapPlaceholder: true,
        projectId: ID.projDemo,
        projectTitle: 'Seed Project',
        clientName: 'Seed Client Co.',
        type: 'edit',
        title: 'Seed planner task',
        column: 'queue',
        priority: 'normal',
        dueDate: isoDate(),
        assigneeCrewId: 'cr-4',
        assigneeName: 'ROB R',
        assigneeCrewIds: ['cr-4'],
        assigneeNames: ['ROB R'],
        done: false,
        status: 'todo',
      },
      { merge: true },
    );
  } else {
    batch.set(
      db.collection('clients').doc(ID.cliPh),
      {
        tenantId: TENANT_ID,
        hqBootstrapPlaceholder: true,
        name: 'Bootstrap Client',
        company: 'Bootstrap Client',
        email: 'bootstrap@placeholder.local',
        phone: '',
        billingEmail: '',
        billingContactName: '',
        addressCity: '',
        addressState: '',
        addressPostal: '',
        addressCountry: '',
        preferredCommunication: 'email',
        timezone: 'America/Chicago',
        clientStatus: 'active',
        notes: 'Placeholder — delete when real clients exist.',
        projectIds: [ID.projPh],
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    batch.set(
      db.collection('hqProjects').doc(ID.projPh),
      {
        tenantId: TENANT_ID,
        hqBootstrapPlaceholder: true,
        title: 'Bootstrap Project',
        clientId: ID.cliPh,
        clientName: 'Bootstrap Client',
        packageLabel: 'Essentials',
        stage: 'inquiry',
        status: 'active',
        budget: 0,
        dueDate: isoDate(),
        ownerCrewId: 'cr-4',
        ownerName: 'ROB R',
        assignedCrewIds: [],
        summary: 'Placeholder — delete when real projects exist.',
        brief: '',
        goals: '',
        nextMilestone: '',
        deliverables: [],
        contactEmail: 'bootstrap@placeholder.local',
      },
      { merge: true },
    );
    batch.set(
      db.collection('plannerItems').doc(plannerId),
      {
        tenantId: TENANT_ID,
        hqBootstrapPlaceholder: true,
        projectId: ID.projPh,
        projectTitle: 'Bootstrap Project',
        clientName: 'Bootstrap Client',
        type: 'edit',
        title: 'Bootstrap planner task',
        column: 'queue',
        priority: 'normal',
        dueDate: isoDate(),
        assigneeCrewId: 'cr-4',
        assigneeName: 'ROB R',
        assigneeCrewIds: ['cr-4'],
        assigneeNames: ['ROB R'],
        done: false,
        status: 'todo',
      },
      { merge: true },
    );
  }

  const pj = projectId;

  batch.set(
    db.collection('shoots').doc('bootstrap-shoot'),
    {
      tenantId: TENANT_ID,
      hqBootstrapPlaceholder: true,
      projectId: pj,
      projectTitle: DEMO ? 'Seed Project' : 'Bootstrap Project',
      title: 'Bootstrap shoot',
      date: isoDate(),
      callTime: '09:00',
      location: 'TBD',
      gearSummary: '',
      crewIds: [],
    },
    { merge: true },
  );

  batch.set(
    db.collection('meetings').doc('bootstrap-meeting'),
    {
      tenantId: TENANT_ID,
      hqBootstrapPlaceholder: true,
      projectId: pj,
      projectTitle: DEMO ? 'Seed Project' : 'Bootstrap Project',
      title: 'Bootstrap meeting',
      date: isoDate(),
      startTime: '10:00',
      endTime: '11:00',
      location: 'TBD',
      participants: [],
      participantCrewIds: [],
    },
    { merge: true },
  );

  batch.set(
    db.collection('hqActivity').doc('bootstrap-activity'),
    {
      tenantId: TENANT_ID,
      hqBootstrapPlaceholder: true,
      projectId: pj,
      projectTitle: DEMO ? 'Seed Project' : 'Bootstrap Project',
      entityType: 'project',
      entityLabel: 'bootstrap',
      actorName: 'HQ seed',
      action: 'placeholder_created',
      createdAt: nowIso(),
    },
    { merge: true },
  );

  batch.set(
    db.collection('hqProjectAssets').doc('bootstrap-asset'),
    {
      tenantId: TENANT_ID,
      hqBootstrapPlaceholder: true,
      projectId: pj,
      projectTitle: DEMO ? 'Seed Project' : 'Bootstrap Project',
      label: 'Bootstrap asset',
      type: 'video',
      sourceType: 'upload',
      sourceRef: '',
      version: 1,
      status: 'internal',
      signedUrl: null,
      signedUrlExpiresAt: null,
      uploadedBy: 'HQ seed',
      uploadedAt: nowIso(),
      updatedAt: nowIso(),
      usageRights: 'owned',
      storagePath: null,
      storageBucket: null,
      storageDownloadUrl: null,
      metadata: {},
    },
    { merge: true },
  );

  batch.set(
    db.collection('hqInvoices').doc('bootstrap-invoice'),
    {
      tenantId: TENANT_ID,
      hqBootstrapPlaceholder: true,
      projectId: pj,
      clientName: DEMO ? 'Seed Client Co.' : 'Bootstrap Client',
      amount: 0,
      amountPaid: 0,
      status: 'draft',
      issuedDate: isoDate(),
      dueDate: isoDate(),
      lockStatus: 'unlocked',
    },
    { merge: true },
  );

  batch.set(
    db.collection('hqProposals').doc('bootstrap-proposal'),
    {
      tenantId: TENANT_ID,
      hqBootstrapPlaceholder: true,
      projectId: pj,
      clientName: DEMO ? 'Seed Client Co.' : 'Bootstrap Client',
      contractStatus: 'draft',
      lineItems: [],
      total: 0,
      depositPercent: 0,
    },
    { merge: true },
  );

  batch.set(
    db.collection('hqExpenses').doc('bootstrap-expense'),
    {
      tenantId: TENANT_ID,
      hqBootstrapPlaceholder: true,
      projectId: pj,
      label: 'Bootstrap expense',
      amount: 0,
      category: 'other',
      date: isoDate(),
    },
    { merge: true },
  );

  batch.set(
    db.collection('hqDeliverables').doc('bootstrap-deliverable'),
    {
      tenantId: TENANT_ID,
      hqBootstrapPlaceholder: true,
      projectId: pj,
      label: 'Bootstrap deliverable',
      ownerCrewId: 'cr-4',
      ownerName: 'ROB R',
      dueDate: isoDate(),
      required: false,
      status: 'not_started',
      linkedAssetIds: [],
      acceptanceCriteria: '',
    },
    { merge: true },
  );

  batch.set(
    db.collection('hqRisks').doc('bootstrap-risk'),
    {
      tenantId: TENANT_ID,
      hqBootstrapPlaceholder: true,
      projectId: pj,
      label: 'Bootstrap risk',
      severity: 'low',
      status: 'open',
      ownerName: 'HQ seed',
    },
    { merge: true },
  );

  batch.set(
    db.collection('hqBlockers').doc('bootstrap-blocker'),
    {
      tenantId: TENANT_ID,
      hqBootstrapPlaceholder: true,
      projectId: pj,
      label: 'Bootstrap blocker',
      status: 'open',
      ownerName: 'HQ seed',
    },
    { merge: true },
  );

  batch.set(
    db.collection('hqDependencies').doc('bootstrap-dependency'),
    {
      tenantId: TENANT_ID,
      hqBootstrapPlaceholder: true,
      projectId: pj,
      label: 'Bootstrap dependency',
      status: 'waiting',
    },
    { merge: true },
  );

  batch.set(
    db.collection('hqChangeOrders').doc('bootstrap-change-order'),
    {
      tenantId: TENANT_ID,
      hqBootstrapPlaceholder: true,
      projectId: pj,
      title: 'Bootstrap change order',
      amount: 0,
      status: 'requested',
      requestedBy: 'HQ seed',
      requestedAt: nowIso(),
    },
    { merge: true },
  );

  batch.set(
    db.collection('hqStorageOpsEvents').doc('bootstrap-storage-ops'),
    {
      tenantId: TENANT_ID,
      hqBootstrapPlaceholder: true,
      eventType: 'link_issued',
      actorName: 'HQ seed',
      timestamp: nowIso(),
      details: 'Placeholder storage-ops row — safe to delete.',
    },
    { merge: true },
  );
}

async function main() {
  assertSafeTarget();
  await initAdmin();
  const projectId = getApp().options.projectId;
  console.log(`[seedHqFirestore] Firebase Admin projectId: ${projectId ?? '(unknown)'}`);
  if (
    process.env.TORP_ALLOW_PROD_HQ_BOOTSTRAP === 'true' &&
    projectId &&
    projectId !== 'torp-hub'
  ) {
    console.warn(
      `[seedHqFirestore] Warning: production bootstrap enabled but projectId is "${projectId}", expected torp-hub for TORP production.`,
    );
  }
  const db = getFirestore();

  await seedCrewBatch(db).commit();
  console.log(`Seeded ${CREW_SEED.length} crew docs for tenant ${TENANT_ID}.`);

  const batch = db.batch();
  addBootstrapDocs(db, batch);
  await batch.commit();

  console.log(
    `Seeded HQ bootstrap placeholders${DEMO ? ' (demo client/project/planner)' : ''} for tenant ${TENANT_ID}.`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
