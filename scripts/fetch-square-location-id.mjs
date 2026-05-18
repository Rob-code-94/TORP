/**
 * Print Square location IDs for the access token in .env.square.local (or env).
 * Usage: node scripts/fetch-square-location-id.mjs
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SquareClient, SquareEnvironment } from 'square';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function loadEnvFile(filePath) {
  try {
    const raw = readFileSync(filePath, 'utf8');
    for (const line of raw.split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const eq = t.indexOf('=');
      if (eq === -1) continue;
      const key = t.slice(0, eq).trim();
      let val = t.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    /* optional file */
  }
}

loadEnvFile(path.join(root, '.env.square.local'));

const token = process.env.SQUARE_ACCESS_TOKEN?.trim();
if (!token) {
  console.error('Set SQUARE_ACCESS_TOKEN in .env.square.local or the environment.');
  process.exit(1);
}

const envRaw = process.env.SQUARE_ENVIRONMENT?.trim().toLowerCase();
const environment =
  envRaw === 'sandbox' ? SquareEnvironment.Sandbox : SquareEnvironment.Production;

const client = new SquareClient({ token, environment });

const res = await client.locations.list();
const locs = res.locations ?? [];
if (!locs.length) {
  console.error('No locations returned for this token.');
  process.exit(1);
}

console.log('Square locations (use id as SQUARE_LOCATION_ID):\n');
for (const loc of locs) {
  const addr = loc.address;
  const line = [addr?.addressLine1, addr?.locality, addr?.administrativeDistrictLevel1]
    .filter(Boolean)
    .join(', ');
  console.log(`  id: ${loc.id}`);
  console.log(`  name: ${loc.name ?? '—'}`);
  if (line) console.log(`  address: ${line}`);
  console.log('');
}
