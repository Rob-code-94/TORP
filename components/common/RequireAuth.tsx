import React from 'react';
import { Navigate } from 'react-router-dom';
import { AuthRole, useAuth } from '../../lib/auth';

interface RequireAuthProps {
  role: AuthRole;
  redirectTo: string;
  children: React.ReactNode;
}

/**
 * Route guard: renders children only when the mock session matches `role`.
 * Phase 2: swap to Firebase custom claims while keeping the same API.
 */
const RequireAuth: React.FC<RequireAuthProps> = ({ role, redirectTo, children }) => {
  const { user } = useAuth();

  if (!user || user.role !== role) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
};

export default RequireAuth;
