/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET?: string;
  readonly VITE_FIREBASE_FUNCTIONS_REGION?: string;
  readonly VITE_FIREBASE_USE_EMULATOR?: string;
  /** Firestore tenant id for public marketing data (showcase + landing portfolio). Defaults to torp-default. */
  readonly VITE_MARKETING_TENANT_ID?: string;
  /** When `"true"`, show the demo-data notice until dismissed for the session. */
  readonly VITE_DEMO_BANNER?: string;
  /** Google Maps JavaScript API key (Places) for HQ schedule location autocomplete. */
  readonly VITE_GOOGLE_MAPS_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
