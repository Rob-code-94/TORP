import React from 'react';
import { Navigate } from 'react-router-dom';
import { AuthRole, useAuth } from '../../lib/auth';

interface RequireAuthProps {
  roles: AuthRole[];
  redirectTo: string;
  children: React.ReactNode;
}

/**
 * Route guard: renders children only when the mock session matches `role`.
 * Phase 2: swap to Firebase custom claims while keeping the same API.
 */
const RequireAuth: React.FC<RequireAuthProps> = ({ roles, redirectTo, children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-500 text-sm" aria-live="polite">
        Loading…
      </div>
    );
  }

  if (!user || !roles.includes(user.role)) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
};

export default RequireAuth;
