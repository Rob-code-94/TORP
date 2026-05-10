/**
 * One-off: set custom claims { role, crewId? } for Firebase users by email.
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json \
 *   node scripts/seedAuthClaims.mjs
 *
 * Edit `SEED` below to match your Auth users, then re-run when hiring.
 */
import { readFile } from 'node:fs/promises';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!serviceAccountPath) {
  console.error('Set GOOGLE_APPLICATION_CREDENTIALS to a service account JSON path.');
  process.exit(1);
}

if (!getApps().length) {
  const json = await readFile(serviceAccountPath, 'utf8');
  const sa = JSON.parse(json);
  initializeApp({ credential: cert(sa) });
}

const TENANT_ID = process.env.TORP_HQ_TENANT_ID || 'torp-default';

const SEED = [
  { email: 'info@torp.life', role: 'ADMIN' },
  { email: 'william@torp.life', role: 'ADMIN' },
  { email: 'jp@torp.life', role: 'ADMIN' },
  { email: 'staff@torp.life', role: 'STAFF', crewId: 'cr-staff-1' },
];

const auth = getAuth();

for (const row of SEED) {
  const email = row.email.trim().toLowerCase();
  const claims = {
    role: row.role,
    tenantId: TENANT_ID,
    ...(row.crewId ? { crewId: row.crewId } : {}),
  };
  try {
    const u = await auth.getUserByEmail(email);
    await auth.setCustomUserClaims(u.uid, claims);
    await auth.revokeRefreshTokens(u.uid);
    // eslint-disable-next-line no-console
    console.log(`OK ${email} →`, claims);
  } catch (e) {
    console.error(`Skip ${email}:`, e);
  }
}
