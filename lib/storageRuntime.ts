import { isFirebaseConfigured } from './firebase';
import { firebaseProjectAssetStorageAdapter } from './firebaseProjectAssetStorageAdapter';
import { setProjectAssetStorageAdapter } from './projectAssetStorage';

let initialized = false;

export function initializeStorageRuntime() {
  if (initialized) return;
  if (isFirebaseConfigured()) {
    setProjectAssetStorageAdapter(firebaseProjectAssetStorageAdapter);
  }
  initialized = true;
}
