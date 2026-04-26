import React from 'react';
import { Navigate } from 'react-router-dom';
import { UserRole } from '../../types';
import { useAuth } from '../../lib/auth';

/**
 * `/hq` — send authenticated admin/staff to their dashboard, else to login.
 */
const HQIndexRedirect: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen bg-zinc-950" aria-hidden />;
  }

  if (
    !user ||
    (user.role !== UserRole.ADMIN &&
      user.role !== UserRole.PROJECT_MANAGER &&
      user.role !== UserRole.STAFF)
  ) {
    return <Navigate to="/hq/login" replace />;
  }

  if (user.role === UserRole.ADMIN || user.role === UserRole.PROJECT_MANAGER) {
    return <Navigate to="/hq/admin" replace />;
  }

  return <Navigate to="/hq/staff" replace />;
};

export default HQIndexRedirect;
