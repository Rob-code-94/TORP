import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import type { ProjectCategory, VideoProject, VideoProjectCredit, VideoProjectGalleryItem } from '../types';
import { PROJECTS as DEFAULT_PROJECTS } from '../constants';
import { getFirebaseFirestoreInstance, isFirebaseConfigured } from '../lib/firebase';

const LOCAL_KEY = 'torp.portfolioLanding.v1';
const COLLECTION = 'portfolioProjects';

const CATEGORIES: ReadonlySet<string> = new Set([
  'Commercial',
  'Documentary',
  'Sports',
  'Fashion',
  'Retail',
  'Civic',
  'Spec',
]);

const ASPECTS: ReadonlySet<string> = new Set(['video', 'portrait', 'square', 'wide']);

export type PortfolioLandingFirestoreDoc = {
  tenantId: string;
  sortOrder: number;
  slug: string;
  title: string;
  client: string;
  year: string;
  category: ProjectCategory;
  tags: string[];
  aspectRatio: 'video' | 'portrait' | 'square';
  thumbnail: string;
  heroImage: string;
  logline: string;
  role: string;
  location?: string;
  deliverables: string[];
  gallery: VideoProjectGalleryItem[];
  credits: VideoProjectCredit[];
};

type LocalRow = PortfolioLandingFirestoreDoc & { id: string };

function readLocal(): LocalRow[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as LocalRow[];
  } catch {
    return [];
  }
}

function writeLocal(rows: LocalRow[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(rows));
  } catch {
    // ignore quota errors
  }
}

function toIso(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value && 'toDate' in value && typeof value.toDate === 'function') {
    return (value.toDate() as Date).toISOString();
  }
  return undefined;
}

function normalizeCategory(value: unknown): ProjectCategory {
  if (typeof value === 'string' && CATEGORIES.has(value)) return value as ProjectCategory;
  return 'Spec';
}

function normalizeAspectRatio(value: unknown): 'video' | 'portrait' | 'square' {
  if (value === 'portrait' || value === 'square' || value === 'video') return value;
  return 'video';
}

function normalizeGallery(value: unknown): VideoProjectGalleryItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((row) => {
      if (!row || typeof row !== 'object') return null;
      const r = row as Record<string, unknown>;
      const src = typeof r.src === 'string' ? r.src : '';
      if (!src) return null;
      const aspect = typeof r.aspect === 'string' && ASPECTS.has(r.aspect) ? r.aspect : 'video';
      const caption = typeof r.caption === 'string' ? r.caption : undefined;
      return { src, aspect: aspect as VideoProjectGalleryItem['aspect'], ...(caption ? { caption } : {}) };
    })
    .filter((x): x is VideoProjectGalleryItem => x != null);
}

function normalizeCredits(value: unknown): VideoProjectCredit[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((row) => {
      if (!row || typeof row !== 'object') return null;
      const r = row as Record<string, unknown>;
      const label = typeof r.label === 'string' ? r.label : '';
      const v = typeof r.value === 'string' ? r.value : '';
      if (!label || !v) return null;
      return { label, value: v };
    })
    .filter((x): x is VideoProjectCredit => x != null);
}

function normalizeTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((t): t is string => typeof t === 'string' && t.length > 0);
}

function normalizeDeliverables(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((t): t is string => typeof t === 'string' && t.length > 0);
}

export function firestoreDataToVideoProject(docId: string, data: Record<string, unknown>): VideoProject | null {
  const slug = typeof data.slug === 'string' ? data.slug.trim() : '';
  const title = typeof data.title === 'string' ? data.title.trim() : '';
  if (!slug || !title) return null;
  return {
    id: docId,
    slug,
    title,
    client: typeof data.client === 'string' ? data.client : '',
    year: typeof data.year === 'string' ? data.year : '',
    category: normalizeCategory(data.category),
    tags: normalizeTags(data.tags),
    aspectRatio: normalizeAspectRatio(data.aspectRatio),
    thumbnail: typeof data.thumbnail === 'string' ? data.thumbnail : '',
    heroImage: typeof data.heroImage === 'string' ? data.heroImage : '',
    logline: typeof data.logline === 'string' ? data.logline : '',
    role: typeof data.role === 'string' ? data.role : '',
    ...(typeof data.location === 'string' && data.location.trim() ? { location: data.location.trim() } : {}),
    deliverables: normalizeDeliverables(data.deliverables),
    gallery: normalizeGallery(data.gallery),
    credits: normalizeCredits(data.credits),
  };
}

function projectToFirestorePayload(
  tenantId: string,
  sortOrder: number,
  project: VideoProject,
): PortfolioLandingFirestoreDoc {
  return {
    tenantId,
    sortOrder,
    slug: project.slug.trim(),
    title: project.title.trim(),
    client: project.client.trim(),
    year: project.year.trim(),
    category: project.category,
    tags: project.tags,
    aspectRatio: project.aspectRatio,
    thumbnail: project.thumbnail.trim(),
    heroImage: project.heroImage.trim(),
    logline: project.logline.trim(),
    role: project.role.trim(),
    ...(project.location?.trim() ? { location: project.location.trim() } : {}),
    deliverables: project.deliverables.map((d) => d.trim()).filter(Boolean),
    gallery: project.gallery.map((g) => ({
      src: g.src.trim(),
      aspect: g.aspect,
      ...(g.caption?.trim() ? { caption: g.caption.trim() } : {}),
    })),
    credits: project.credits
      .map((c) => ({ label: c.label.trim(), value: c.value.trim() }))
      .filter((c) => c.label && c.value),
  };
}

function sortRows<T extends { sortOrder: number; slug: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.slug.localeCompare(b.slug);
  });
}

/** Public read (guests); tenant-scoped writes via signed-in tenant claim. */
export async function listPortfolioLandingProjects(tenantId: string): Promise<VideoProject[]> {
  if (!isFirebaseConfigured()) {
    const local = readLocal();
    return sortRows(local).map((row) => {
      const { id, ...rest } = row;
      return firestoreDataToVideoProject(id, rest as unknown as Record<string, unknown>)!;
    });
  }
  const db = getFirebaseFirestoreInstance();
  const ref = collection(db, 'tenants', tenantId, COLLECTION);
  const snap = await getDocs(query(ref, orderBy('sortOrder', 'asc')));
  const rows: VideoProject[] = [];
  snap.docs.forEach((d) => {
    const data = d.data() as Record<string, unknown>;
    const vp = firestoreDataToVideoProject(d.id, data);
    if (vp) rows.push(vp);
  });
  return rows;
}

export async function savePortfolioLandingProject(
  tenantId: string,
  project: VideoProject,
  sortOrder: number,
): Promise<VideoProject> {
  const payload = projectToFirestorePayload(tenantId, sortOrder, project);
  if (!isFirebaseConfigured()) {
    const local = readLocal();
    const effectiveId =
      project.id && project.id.length > 0 && !project.id.startsWith('draft-')
        ? project.id
        : `local-${Date.now()}`;
    const row: LocalRow = { ...payload, id: effectiveId };
    const idx = local.findIndex((x) => x.id === effectiveId);
    if (idx >= 0) local[idx] = row;
    else local.push(row);
    writeLocal(sortRows(local));
    return firestoreDataToVideoProject(effectiveId, { ...payload })!;
  }

  const db = getFirebaseFirestoreInstance();
  const col = collection(db, 'tenants', tenantId, COLLECTION);

  if (!project.id || project.id.startsWith('draft-')) {
    const created = await addDoc(col, {
      ...payload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return firestoreDataToVideoProject(created.id, payload as unknown as Record<string, unknown>)!;
  }

  await setDoc(doc(db, 'tenants', tenantId, COLLECTION, project.id), {
    ...payload,
    updatedAt: serverTimestamp(),
  }, { merge: true });
  return firestoreDataToVideoProject(project.id, payload as unknown as Record<string, unknown>)!;
}

export async function deletePortfolioLandingProject(tenantId: string, projectId: string): Promise<void> {
  if (!isFirebaseConfigured()) {
    writeLocal(readLocal().filter((x) => x.id !== projectId));
    return;
  }
  const db = getFirebaseFirestoreInstance();
  await deleteDoc(doc(db, 'tenants', tenantId, COLLECTION, projectId));
}

export async function replacePortfolioLandingOrder(
  tenantId: string,
  orderedProjects: VideoProject[],
): Promise<void> {
  for (let i = 0; i < orderedProjects.length; i += 1) {
    await savePortfolioLandingProject(tenantId, orderedProjects[i]!, i + 1);
  }
}

/** Writes bundled [`PROJECTS`](constants.ts) into Firestore/local (overwrites matching doc ids). */
export async function seedPortfolioLandingFromConstants(tenantId: string): Promise<void> {
  for (let i = 0; i < DEFAULT_PROJECTS.length; i += 1) {
    const p = DEFAULT_PROJECTS[i]!;
    await savePortfolioLandingProject(tenantId, p, i + 1);
  }
}
