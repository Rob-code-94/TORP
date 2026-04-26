import { describe, expect, it } from 'vitest';
import { messageForFirebaseSignInError, messageForPasswordResetError } from './firebaseAuthError';

const err = (code: string) => ({ code } as { code: string });

describe('messageForFirebaseSignInError', () => {
  it('maps operation-not-allowed and network', () => {
    expect(messageForFirebaseSignInError(err('auth/operation-not-allowed'))).toMatch(/Email\/password/);
    expect(messageForFirebaseSignInError(err('auth/network-request-failed'))).toMatch(/Network/);
  });

  it('maps unauthorized domain and invalid api key', () => {
    expect(messageForFirebaseSignInError(err('auth/unauthorized-domain'))).toMatch(/Authorized domains/);
    expect(messageForFirebaseSignInError(err('auth/invalid-api-key'))).toMatch(/VITE_FIREBASE/);
  });

  it('keeps known credential messages', () => {
    expect(messageForFirebaseSignInError(err('auth/invalid-credential'))).toBe('Invalid email or password.');
  });

  it('returns generic for unknown', () => {
    expect(messageForFirebaseSignInError(err('auth/unknown-code'))).toBe('Sign-in could not be completed. Try again.');
  });
});

describe('messageForPasswordResetError', () => {
  it('keeps known cases', () => {
    expect(messageForPasswordResetError(err('auth/invalid-email'))).toMatch(/valid email/);
  });
});
