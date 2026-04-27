import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// Required for the deployed bundle to reach Firebase Auth/Functions. Mirrors the
// fields read in lib/firebase.ts (isFirebaseConfigured). Missing values caused
// the silent "Coming Soon" regression on the Cloud Run frontend; failing the
// production build prevents that silent breakage from ever shipping again.
const REQUIRED_FIREBASE_ENV = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_APP_ID',
] as const;

function requireFirebaseEnvOnBuild(mode: string): Plugin {
  return {
    name: 'torp-require-firebase-env-on-build',
    apply: 'build',
    config() {
      const env = { ...process.env, ...loadEnv(mode, process.cwd(), 'VITE_') };
      const missing = REQUIRED_FIREBASE_ENV.filter((k) => !env[k] || String(env[k]).trim() === '');
      if (missing.length > 0) {
        throw new Error(
          `[torp build] Refusing to build without Firebase web config.\n` +
            `Missing or empty: ${missing.join(', ')}.\n` +
            `Set them in .env.local for local builds, or pass via --build-arg from Secret Manager in Cloud Build (see docs/build-secrets.md).`,
        );
      }
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), requireFirebaseEnvOnBuild(mode)],
  server: {
    host: '0.0.0.0',
    port: 8080,
  },
  preview: {
    host: '0.0.0.0',
    port: 8080,
  },
}));