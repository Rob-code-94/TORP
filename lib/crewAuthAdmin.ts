import { httpsCallable } from 'firebase/functions';
import { sendPasswordResetEmail } from 'firebase/auth';
import { getFirebaseAuthInstance, getFirebaseFunctionsInstance, isFirebaseConfigured } from './firebase';

type SendResetResult = { ok: true } | { ok: false; error: string };

type SetPasswordResult = { ok: true } | { ok: false; error: string };

/**
 * When Firebase is configured, validates through a callable (admin-only), then
 * sends the standard password reset email to the crew address.
 */
export async function sendCrewAuthPasswordReset(crewEmail: string): Promise<SendResetResult> {
  if (!isFirebaseConfigured()) {
    return { ok: false, error: 'Firebase is not configured.' };
  }
  try {
    const fn = httpsCallable(
      getFirebaseFunctionsInstance(),
      'adminSendCrewPasswordReset'
    ) as (data: { email: string }) => Promise<{ data: { email: string } }>;
    const { data } = await fn({ email: crewEmail.trim().toLowerCase() });
    const email = (data as { email: string }).email;
    if (!email) {
      return { ok: false, error: 'Could not resolve the crew email in Auth.' };
    }
    const auth = getFirebaseAuthInstance();
    await sendPasswordResetEmail(auth, email);
    return { ok: true };
  } catch (e: unknown) {
    const err = e as { code?: string; message?: string };
    if (err?.code === 'functions/permission-denied' || err?.code === 'permission-denied') {
      return { ok: false, error: 'You need admin access to send a reset for this person.' };
    }
    if (err?.code === 'functions/not-found' || err?.message?.includes('not-found')) {
      return { ok: false, error: 'No Firebase account exists for that email yet.' };
    }
    return { ok: false, error: 'Could not send the reset link. Check Functions deployment and the email in Auth.' };
  }
}

export async function setCrewAuthTempPassword(crewEmail: string, tempPassword: string): Promise<SetPasswordResult> {
  if (!isFirebaseConfigured()) {
    return { ok: false, error: 'Firebase is not configured.' };
  }
  try {
    const fn = httpsCallable(
      getFirebaseFunctionsInstance(),
      'adminSetCrewTempPassword'
    ) as (data: { email: string; password: string }) => Promise<{ data: { ok: boolean } }>;
    const { data } = await fn({
      email: crewEmail.trim().toLowerCase(),
      password: tempPassword,
    });
    if ((data as { ok: boolean }).ok) return { ok: true };
    return { ok: false, error: 'Password update was rejected by the server.' };
  } catch (e: unknown) {
    const err = e as { code?: string; message?: string; details?: unknown };
    if (err?.code === 'functions/permission-denied' || err?.code === 'permission-denied') {
      return { ok: false, error: 'You need admin access to set a temporary password.' };
    }
    if (err?.code === 'functions/not-found') {
      return { ok: false, error: 'No Firebase account exists for that email yet.' };
    }
    return { ok: false, error: 'Could not set the password. Check Functions deployment.' };
  }
}
