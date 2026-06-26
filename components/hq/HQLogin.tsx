import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getIdTokenResult, sendPasswordResetEmail, signInWithEmailAndPassword } from 'firebase/auth';
import { ArrowLeft, Film, Moon, Sun } from 'lucide-react';
import { UserRole } from '../../types';
import { useAuth } from '../../lib/auth';
import { getFirebaseAuthInstance, isFirebaseConfigured } from '../../lib/firebase';
import { authUserFromFirebase } from '../../lib/firebaseAuthUser';
import { messageForFirebaseSignInError, messageForPasswordResetError } from '../../lib/firebaseAuthError';
import { useAdminTheme } from '../../lib/adminTheme';
import { hqDestinationForUser } from '../../lib/authRedirect';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

/** Sign-in always uses Firebase auth. */
const HQLogin: React.FC = () => {
  const { user, logout, loading: authLoading, isFirebase } = useAuth();
  const { theme, toggleTheme } = useAdminTheme();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStatus, setForgotStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [forgotError, setForgotError] = useState<string | null>(null);

  const firebaseReady = isFirebaseConfigured() && isFirebase;

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    navigate(hqDestinationForUser(user), { replace: true });
  }, [authLoading, navigate, user]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (!firebaseReady) {
        setError('Sign-in is unavailable until Firebase Auth is configured.');
        return;
      }
      const auth = getFirebaseAuthInstance();
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      const token = await getIdTokenResult(cred.user);
      const u = authUserFromFirebase(cred.user, token);
      navigate(hqDestinationForUser(u), { replace: true });
    } catch (e) {
      setError(messageForFirebaseSignInError(e));
    } finally {
      setBusy(false);
    }
  };

  const sendForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      setForgotError('Email is required.');
      return;
    }
    if (!firebaseReady) {
      setForgotStatus('error');
      setForgotError('Password reset is unavailable until Firebase Auth is configured.');
      return;
    }
    setForgotError(null);
    setForgotStatus('sending');
    try {
      const auth = getFirebaseAuthInstance();
      await sendPasswordResetEmail(auth, forgotEmail.trim().toLowerCase());
      setForgotStatus('sent');
    } catch (err) {
      setForgotStatus('error');
      setForgotError(messageForPasswordResetError(err));
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-muted p-6 text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="fixed right-4 top-4 z-10"
        onClick={toggleTheme}
        aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
      </Button>

      <div className="flex w-full max-w-sm flex-col gap-6 min-w-0">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" /> Back to site
        </Link>

        <a href="/" className="flex items-center gap-2 self-center font-medium">
          <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Film className="size-4" />
          </div>
          TORP HQ
        </a>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Staff sign-in</CardTitle>
            <CardDescription>
              {firebaseReady
                ? 'Use your organizational email and password.'
                : 'Configure Firebase Auth to enable sign-in.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!firebaseReady && (
              <Alert variant="destructive">
                <AlertDescription>Firebase Auth is not configured for this environment.</AlertDescription>
              </Alert>
            )}

            {user &&
              (user.role === UserRole.ADMIN ||
                user.role === UserRole.PROJECT_MANAGER ||
                user.role === UserRole.STAFF) && (
                <Alert>
                  <AlertDescription>
                    Signed in as {user.displayName || user.email || user.role}.{' '}
                    <button type="button" onClick={() => logout()} className="underline font-medium">
                      Sign out
                    </button>
                  </AlertDescription>
                </Alert>
              )}

            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="hq-email">Email</Label>
                <Input
                  id="hq-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={!firebaseReady}
                  placeholder="you@torp.life"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hq-password">Password</Label>
                <Input
                  id="hq-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={!firebaseReady}
                />
              </div>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Button type="submit" className="w-full" disabled={busy || !firebaseReady}>
                {busy ? 'Signing in…' : 'Sign in'}
              </Button>
            </form>

            <div>
              <Button
                type="button"
                variant="link"
                className="h-auto p-0 text-sm"
                onClick={() => {
                  setForgotOpen((v) => !v);
                  setForgotEmail(email);
                  setForgotStatus('idle');
                  setForgotError(null);
                }}
              >
                Forgot password?
              </Button>
              {forgotOpen && (
                <form onSubmit={sendForgot} className="mt-3 space-y-3 rounded-lg border bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">
                    We&apos;ll email a link if the address is registered.
                  </p>
                  <Input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="email@org.com"
                  />
                  {forgotError && (
                    <Alert variant="destructive">
                      <AlertDescription>{forgotError}</AlertDescription>
                    </Alert>
                  )}
                  {forgotStatus === 'sent' && (
                    <Alert>
                      <AlertDescription>
                        If that address is registered, a reset link was sent. Check your inbox and spam folder.
                      </AlertDescription>
                    </Alert>
                  )}
                  <Button type="submit" variant="secondary" className="w-full" disabled={forgotStatus === 'sending'}>
                    {forgotStatus === 'sending' ? 'Sending…' : 'Send reset link'}
                  </Button>
                </form>
              )}
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          Need the client portal?{' '}
          <Link to="/portal/login" className="underline underline-offset-4 hover:text-foreground">
            Client sign-in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default HQLogin;
