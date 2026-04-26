/**
 * Cloud Run: serve Vite `dist/`, health check, and Firebase ID token verification.
 * Uses Application Default Credentials on GCP; local dev needs GOOGLE_APPLICATION_CREDENTIALS.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import express from 'express';
import { initializeApp, getApps, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

/** @see `lib/tenant.ts` (must match custom claims) */
const TENANT_CLAIM = 'tenantId';
const ROLE_CLAIM = 'role';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, '..', 'dist');
const logPrefix = '[torp-server]';
let adminReady = false;

function initAdmin() {
  if (getApps().length) {
    adminReady = true;
    return;
  }
  try {
    initializeApp({ credential: applicationDefault() });
    adminReady = true;
  } catch (e) {
    console.warn(logPrefix, 'Firebase Admin not initialized; /api/v1/whoami will return 503.', e);
    adminReady = false;
  }
}

initAdmin();

const app = express();
const port = Number(process.env.PORT) || 8080;

app.disable('x-powered-by');

app.get('/api/health', (_req, res) => {
  res.status(200).json({ ok: true, service: 'torp' });
});

/**
 * Returns decoded token fields for wiring client + future tenant-guarded routes.
 * Requires Authorization: Bearer <ID token>
 */
app.get('/api/v1/whoami', async (req, res) => {
  if (!adminReady) {
    return res.status(503).json({ error: 'server_auth_unconfigured' });
  }
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'missing_bearer' });
  }
  const token = h.slice(7);
  try {
    const decoded = await getAuth().verifyIdToken(token, true);
    const email = typeof decoded.email === 'string' ? decoded.email : null;
    const role = Object.prototype.hasOwnProperty.call(decoded, ROLE_CLAIM) ? String(decoded[ROLE_CLAIM]) : null;
    const tenantId = Object.prototype.hasOwnProperty.call(decoded, TENANT_CLAIM) ? String(decoded[TENANT_CLAIM]) : null;
    return res.json({
      uid: decoded.uid,
      email,
      role,
      tenantId,
    });
  } catch (e) {
    console.error(logPrefix, 'verifyIdToken', e);
    return res.status(401).json({ error: 'invalid_token' });
  }
});

// Tenant-scoped example — extend with your Cloud Run business APIs the same way.
app.get('/api/v1/tenant-only/ping', async (req, res) => {
  if (!adminReady) {
    return res.status(503).json({ error: 'server_auth_unconfigured' });
  }
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'missing_bearer' });
  }
  const token = h.slice(7);
  try {
    const decoded = await getAuth().verifyIdToken(token, true);
    const tenantId = Object.prototype.hasOwnProperty.call(decoded, TENANT_CLAIM) ? String(decoded[TENANT_CLAIM]) : null;
    if (!tenantId) {
      return res.status(403).json({ error: 'missing_tenant_claim' });
    }
    return res.json({ ok: true, tenantId });
  } catch (e) {
    console.error(logPrefix, 'verifyIdToken (tenant-only)', e);
    return res.status(401).json({ error: 'invalid_token' });
  }
});

app.use(
  express.static(distDir, {
    index: false,
    maxAge: '1h',
  }),
);

app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'not_found' });
  }
  return res.sendFile(path.join(distDir, 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(logPrefix, 'listening on', port);
});
