import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { hqDestinationForUser } from '../../lib/authRedirect';

/**
 * `/hq` — send authenticated admin/staff to their dashboard, else to login.
 */
const HQIndexRedirect: React.FC = () => {
  const { user, loading, isFirebase } = useAuth();

  if (loading) {
    return <div className="min-h-screen bg-zinc-950" aria-hidden />;
  }

  if (!isFirebase || !user) {
    return <Navigate to="/hq/login" replace />;
  }

  return <Navigate to={hqDestinationForUser(user)} replace />;
};

export default HQIndexRedirect;
