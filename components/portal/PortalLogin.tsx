import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getIdTokenResult, signInWithEmailAndPassword } from 'firebase/auth';
import { ArrowLeft, Film, Moon, Sun } from 'lucide-react';
import { UserRole } from '../../types';
import { useAuth } from '../../lib/auth';
import { useAdminTheme } from '../../lib/adminTheme';
import { authUserFromFirebase } from '../../lib/firebaseAuthUser';
import { messageForFirebaseSignInError } from '../../lib/firebaseAuthError';
import { getFirebaseAuthInstance, isFirebaseConfigured } from '../../lib/firebase';
import { portalDestinationForUser } from '../../lib/authRedirect';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

/** Portal sign-in always uses Firebase Auth. */
const PortalLogin: React.FC = () => {
  const { user, logout, isFirebase, loading } = useAuth();
  const { theme, toggleTheme } = useAdminTheme();
  const navigate = useNavigate();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const firebaseReady = isFirebaseConfigured() && isFirebase;

  React.useEffect(() => {
    if (loading) return;
    if (!user) return;
    navigate(portalDestinationForUser(user), { replace: true });
  }, [loading, navigate, user]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (!firebaseReady) {
        setError('Client sign-in is unavailable until Firebase Auth is configured.');
        return;
      }
      const auth = getFirebaseAuthInstance();
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      const token = await getIdTokenResult(cred.user);
      const authUser = authUserFromFirebase(cred.user, token);
      if (authUser.role !== UserRole.CLIENT) {
        setError('This account is not authorized for the client portal.');
        return;
      }
      navigate('/portal', { replace: true });
    } catch (err) {
      setError(messageForFirebaseSignInError(err));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
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
          TORP Client
        </a>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Client portal</CardTitle>
            <CardDescription>
              Use your client email and password to review approvals, invoices, and contracts.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!firebaseReady && (
              <Alert variant="destructive">
                <AlertDescription>Firebase Auth is not configured for this environment.</AlertDescription>
              </Alert>
            )}

            {user?.role === UserRole.CLIENT && (
              <Alert>
                <AlertDescription>
                  Signed in as client.{' '}
                  <button type="button" onClick={() => logout()} className="underline font-medium">
                    Sign out
                  </button>
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="portal-email">Email</Label>
                <Input
                  id="portal-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={!firebaseReady}
                  placeholder="you@client.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="portal-password">Password</Label>
                <Input
                  id="portal-password"
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
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          TORP crew?{' '}
          <Link to="/hq/login" className="underline underline-offset-4 hover:text-foreground">
            HQ sign-in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default PortalLogin;
