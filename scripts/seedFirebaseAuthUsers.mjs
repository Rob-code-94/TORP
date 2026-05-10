/**
 * Create or update Firebase Auth users and custom claims (Admin SDK).
 * Passwords match [`lib/demoHqUsers.ts`](../lib/demoHqUsers.ts) — change in production and rotate in Firebase.
 *
 * Prereq: Email/Password enabled in Firebase console (Build → Authentication).
 *
 * Run (pick one):
 *   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json
 *   node scripts/seedFirebaseAuthUsers.mjs
 *
 * Or with Application Default Credentials:
 *   gcloud auth application-default login
 *   gcloud config set project torp-hub
 *   npm run seed:firebase-users
 *
 * Seeded users: info@, william@, jp@, staff@ (see `lib/demoHqUsers.ts`).
 * If you see `invalid_grant`, run `gcloud auth application-default login` again or use a service account key.
 */
import { readFile } from 'node:fs/promises';
import { getApps, initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const TENANT_ID = process.env.TORP_HQ_TENANT_ID || 'torp-default';

const USERS = [
  { email: 'info@torp.life', password: 'Admin1234', displayName: 'ROB R', role: 'ADMIN' },
  { email: 'william@torp.life', password: 'Admin1234', displayName: 'William Fairbanks', role: 'ADMIN' },
  { email: 'jp@torp.life', password: 'Crew1234', displayName: 'Jayden Price', role: 'ADMIN' },
  { email: 'staff@torp.life', password: 'Staff1234', displayName: 'A. Vance', role: 'STAFF', crewId: 'cr-staff-1' },
];

function resolveProjectId(serviceAccount) {
  return (
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.GCP_PROJECT ||
    process.env.FIREBASE_PROJECT_ID ||
    (serviceAccount && typeof serviceAccount.project_id === 'string' && serviceAccount.project_id) ||
    'torp-hub'
  );
}

async function initAdmin() {
  if (getApps().length) return;
  const p = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (p) {
    const sa = JSON.parse(await readFile(p, 'utf8'));
    const projectId = resolveProjectId(sa);
    initializeApp({ credential: cert(sa), projectId });
    return;
  }
  try {
    const projectId = resolveProjectId(null);
    initializeApp({ credential: applicationDefault(), projectId });
  } catch (e) {
    console.error('Set GOOGLE_APPLICATION_CREDENTIALS to a service account JSON, or run: gcloud auth application-default login');
    throw e;
  }
}

function isUserNotFound(err) {
  return typeof err === 'object' && err !== null && err.code === 'auth/user-not-found';
}

async function main() {
  await initAdmin();
  const auth = getAuth();
  for (const row of USERS) {
    const email = row.email.trim().toLowerCase();
    const claims = {
      role: row.role,
      tenantId: TENANT_ID,
      ...(row.crewId ? { crewId: row.crewId } : {}),
    };
    let uid;
    try {
      const existing = await auth.getUserByEmail(email);
      uid = existing.uid;
      await auth.updateUser(uid, {
        password: row.password,
        displayName: row.displayName,
      });
      // eslint-disable-next-line no-console
      console.log(`Updated password + profile: ${email}`);
    } catch (e) {
      if (!isUserNotFound(e)) throw e;
      const created = await auth.createUser({
        email,
        password: row.password,
        displayName: row.displayName,
        emailVerified: false,
      });
      uid = created.uid;
      // eslint-disable-next-line no-console
      console.log(`Created user: ${email}`);
    }
    await auth.setCustomUserClaims(uid, claims);
    await auth.revokeRefreshTokens(uid);
    // eslint-disable-next-line no-console
    console.log(`  claims →`, claims, `(uid: ${uid})`);
  }
  // eslint-disable-next-line no-console
  console.log('Done. Users can sign in with Email/Password (add authorized domain for your app host if not localhost).');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
