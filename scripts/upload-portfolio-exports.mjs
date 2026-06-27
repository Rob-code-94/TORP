/**
 * Upload torp-web-exports to Firebase Storage and patch marketing portfolio Firestore docs.
 *
 *   TORP_ALLOW_PORTFOLIO_UPLOAD=true \
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json \
 *   node scripts/upload-portfolio-exports.mjs
 *
 * Optional:
 *   EXPORTS_DIR="/Volumes/ArmorATD/T.O.R.P/Media Assets Original/torp-web-exports"
 *   TORP_MARKETING_TENANT_ID=torp-default
 */
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { getApps, initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

const TENANT_ID = process.env.TORP_MARKETING_TENANT_ID || 'torp-default';
const EXPORTS_DIR =
  process.env.EXPORTS_DIR ||
  '/Volumes/ArmorATD/T.O.R.P/Media Assets Original/torp-web-exports';
const DEFAULT_PROJECT = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || 'torp-hub';

function storageBucketForProject(projectId) {
  return process.env.FIREBASE_STORAGE_BUCKET || `${projectId}.firebasestorage.app`;
}

const PORTFOLIO_ROWS = [
  { id: 'portfolio-crew-after-dark', slug: 'crew-after-dark', title: 'Crew After Dark' },
  { id: 'portfolio-sole-classics-he-got-game', slug: 'sole-classics-he-got-game', title: 'He Got Game' },
  { id: 'portfolio-torp-collection', slug: 'torp-collection', title: 'TORP Collection' },
  { id: 'portfolio-fihp-co-jp', slug: 'fihp-co-jp', title: 'FIHP Co — JP' },
  { id: 'portfolio-fihp-co-run-kollin', slug: 'fihp-co-run-kollin', title: 'FIHP Co — Run' },
  { id: 'portfolio-fihp-morning-vert', slug: 'fihp-morning-vert', title: 'FIHP Morning' },
  { id: 'portfolio-a-night-with-our-buds', slug: 'a-night-with-our-buds', title: 'A Night With Our Buds' },
  { id: 'portfolio-destany-gymshark', slug: 'destany-gymshark', title: 'Gym Shark Draft' },
  { id: 'portfolio-don-life-car', slug: 'don-life-car', title: 'Don Life — Car' },
  { id: 'portfolio-gracelynn', slug: 'gracelynn', title: 'Gracelynn' },
  { id: 'portfolio-ul-sky-limit-john', slug: 'ul-sky-limit-john', title: 'Sky Limit — John' },
  { id: 'portfolio-ultd-debo', slug: 'ultd-debo', title: 'ULTD — Debo' },
];

function assertAllowed() {
  if (process.env.TORP_ALLOW_PORTFOLIO_UPLOAD === 'true') return;
  console.error(
    '[upload-portfolio-exports] Refusing to write: set TORP_ALLOW_PORTFOLIO_UPLOAD=true',
  );
  process.exit(1);
}

async function initAdmin() {
  if (getApps().length) return;
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (credPath) {
    const sa = JSON.parse(await readFile(credPath, 'utf8'));
    const projectId = sa.project_id || DEFAULT_PROJECT;
    initializeApp({
      credential: cert(sa),
      projectId,
      storageBucket: storageBucketForProject(projectId),
    });
    return;
  }
  initializeApp({
    credential: applicationDefault(),
    projectId: DEFAULT_PROJECT,
    storageBucket: storageBucketForProject(DEFAULT_PROJECT),
  });
}

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function resolveExportFile(slug, suffix) {
  const primary = path.join(EXPORTS_DIR, `${slug}-${suffix}`);
  if (await fileExists(primary)) return primary;
  if (suffix === 'thumb.jpg') {
    const poster = path.join(EXPORTS_DIR, `${slug}-poster.jpg`);
    if (await fileExists(poster)) return poster;
  }
  return null;
}

function contentTypeFor(filePath) {
  if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) return 'image/jpeg';
  if (filePath.endsWith('.mp4')) return 'video/mp4';
  return 'application/octet-stream';
}

async function uploadFile(bucket, localPath, storagePath) {
  const token = randomUUID();
  await bucket.upload(localPath, {
    destination: storagePath,
    metadata: {
      contentType: contentTypeFor(localPath),
      metadata: { firebaseStorageDownloadTokens: token },
    },
  });
  const encoded = encodeURIComponent(storagePath);
  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encoded}?alt=media&token=${token}`;
}

async function main() {
  assertAllowed();
  await initAdmin();

  const db = getFirestore();
  const bucket = getStorage().bucket();
  const results = [];

  for (const row of PORTFOLIO_ROWS) {
    const { id, slug, title } = row;
    const thumbPath = await resolveExportFile(slug, 'thumb.jpg');
    const posterPath = await resolveExportFile(slug, 'poster.jpg');
    const heroPath = await resolveExportFile(slug, 'hero.mp4');
    const filmPath = await resolveExportFile(slug, 'film.mp4');

    if (!thumbPath || !posterPath || !heroPath) {
      results.push({ title, slug, status: 'SKIP', reason: 'missing export files' });
      console.warn(`SKIP ${slug}: missing thumb/poster/hero in ${EXPORTS_DIR}`);
      continue;
    }

    const thumbUrl = await uploadFile(bucket, thumbPath, `public/portfolio/${id}/thumb.jpg`);
    const posterUrl = await uploadFile(bucket, posterPath, `public/portfolio/${id}/hero-poster.jpg`);
    const heroUrl = await uploadFile(bucket, heroPath, `public/portfolio/${id}/featured-hero.mp4`);

    const docRef = db.collection('tenants').doc(TENANT_ID).collection('portfolioProjects').doc(id);
    const snap = await docRef.get();
    const existing = snap.exists ? snap.data() : {};
    const gallery = Array.isArray(existing.gallery) ? [...existing.gallery] : [];

    let filmUrl;
    if (filmPath) {
      filmUrl = await uploadFile(bucket, filmPath, `public/portfolio/${id}/film.mp4`);
      if (gallery.length === 0) {
        gallery.push({
          src: filmUrl,
          aspect: 'video',
          mediaType: 'video',
          caption: 'Featured film',
        });
      } else if (!gallery[0]?.src) {
        gallery[0] = { ...gallery[0], src: filmUrl, mediaType: 'video' };
      }
    }

    await docRef.set(
      {
        thumbnail: thumbUrl,
        heroImage: posterUrl,
        featuredVideoUrl: heroUrl,
        gallery,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    results.push({
      title,
      slug,
      status: 'OK',
      poster: Boolean(thumbUrl),
      video: Boolean(heroUrl),
      film: Boolean(filmUrl),
    });
    console.log(`OK ${slug}`);
  }

  console.log('\nSummary:');
  console.table(results);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
