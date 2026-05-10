import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';
import { connectFunctionsEmulator, getFunctions, type Functions } from 'firebase/functions';
import { connectStorageEmulator, getStorage, type FirebaseStorage } from 'firebase/storage';
import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore';

/** GCP/Firebase project ID for production TORP (HQ seeds, docs, Cloud Run). Not secret. */
export const CANONICAL_FIREBASE_PROJECT_ID = 'torp-hub';

const apiKey = import.meta.env.VITE_FIREBASE_API_KEY as string | undefined;
const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined;
const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined;
const appId = import.meta.env.VITE_FIREBASE_APP_ID as string | undefined;
const useEmulator = import.meta.env.VITE_FIREBASE_USE_EMULATOR === 'true';

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let functions: Functions | null = null;
let storage: FirebaseStorage | null = null;
let firestore: Firestore | null = null;
let authEmulatorConnected = false;
let functionsEmulatorConnected = false;
let storageEmulatorConnected = false;
let firestoreEmulatorConnected = false;

let warnedNonCanonicalFirebaseProject = false;

function warnDevNonCanonicalFirebaseProject(): void {
  if (!import.meta.env.DEV || warnedNonCanonicalFirebaseProject) return;
  if (!isFirebaseConfigured()) return;
  const id = projectId?.trim();
  if (!id || id === CANONICAL_FIREBASE_PROJECT_ID) return;
  warnedNonCanonicalFirebaseProject = true;
  console.warn(
    `[torp.firebase] VITE_FIREBASE_PROJECT_ID is "${id}"; HQ seeds and docs assume "${CANONICAL_FIREBASE_PROJECT_ID}". ` +
      `Use the same project as Firestore data or override intentionally. See docs/crew-directory-troubleshooting.md.`,
  );
}

export function isFirebaseConfigured(): boolean {
  return Boolean(apiKey && authDomain && projectId);
}

/** Project ID your web client uses — must match Firebase console → Project settings → Project ID. */
export function getConfiguredFirebaseProjectId(): string | undefined {
  return projectId;
}

export function getFirebaseApp(): FirebaseApp {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured. Set VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, and VITE_FIREBASE_PROJECT_ID.');
  }
  warnDevNonCanonicalFirebaseProject();
  if (!app) {
    app = getApps().length
      ? getApps()[0]!
      : initializeApp({
          apiKey,
          authDomain,
          projectId,
          appId: appId || undefined,
          messagingSenderId: (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string) || undefined,
          storageBucket: (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string) || undefined,
        });
  }
  return app;
}

export function getFirebaseAuthInstance(): Auth {
  if (auth) return auth;
  const a = getAuth(getFirebaseApp());
  if (useEmulator && typeof window !== 'undefined' && !authEmulatorConnected) {
    try {
      connectAuthEmulator(a, 'http://127.0.0.1:9099', { disableWarnings: true });
    } catch {
      // Re-entry / HMR: emulator already attached
    }
    authEmulatorConnected = true;
  }
  auth = a;
  return a;
}

export function getFirebaseFunctionsInstance(): Functions {
  if (functions) return functions;
  const region = (import.meta.env.VITE_FIREBASE_FUNCTIONS_REGION as string) || 'us-central1';
  const f = getFunctions(getFirebaseApp(), region);
  if (useEmulator && typeof window !== 'undefined' && !functionsEmulatorConnected) {
    try {
      connectFunctionsEmulator(f, '127.0.0.1', 5001);
    } catch {
      // Re-entry
    }
    functionsEmulatorConnected = true;
  }
  functions = f;
  return f;
}

export function getFirebaseStorageInstance(): FirebaseStorage {
  if (storage) return storage;
  const s = getStorage(getFirebaseApp());
  if (useEmulator && typeof window !== 'undefined' && !storageEmulatorConnected) {
    try {
      connectStorageEmulator(s, '127.0.0.1', 9199);
    } catch {
      // Re-entry
    }
    storageEmulatorConnected = true;
  }
  storage = s;
  return s;
}

export function getFirebaseFirestoreInstance(): Firestore {
  if (firestore) return firestore;
  const f = getFirestore(getFirebaseApp());
  if (useEmulator && typeof window !== 'undefined' && !firestoreEmulatorConnected) {
    try {
      connectFirestoreEmulator(f, '127.0.0.1', 8080);
    } catch {
      // Re-entry
    }
    firestoreEmulatorConnected = true;
  }
  firestore = f;
  return f;
}
