const GENERIC = 'Sign-in could not be completed. Try again.';

function isFirebaseError(e: unknown): e is { code: string } {
  return typeof e === 'object' && e !== null && 'code' in e && typeof (e as { code: unknown }).code === 'string';
}

/** Maps common Firebase `signIn` / email errors to user-safe copy. */
export function messageForFirebaseSignInError(error: unknown): string {
  if (!isFirebaseError(error)) return GENERIC;
  switch (error.code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Invalid email or password.';
    case 'auth/invalid-email':
      return 'That email does not look valid.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Wait a few minutes, then try again.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Contact an admin.';
    default:
      return GENERIC;
  }
}

export function messageForPasswordResetError(error: unknown): string {
  if (!isFirebaseError(error)) return 'Could not send the reset link. Try again later.';
  if (error.code === 'auth/invalid-email') return 'Enter a valid email address.';
  if (error.code === 'auth/too-many-requests') return 'Too many requests. Try again in a few minutes.';
  return 'Could not send the reset link. Try again later.';
}
