import React from 'react';
import { useNavigate } from 'react-router-dom';
import { UserRole } from '../../types';
import DashboardLayout from '../dashboard/DashboardLayout';
import { useAuth } from '../../lib/auth';

interface PortalShellProps {
  children: React.ReactNode;
}

/** Client-facing portal chrome. Only used under `/portal`. */
const PortalShell: React.FC<PortalShellProps> = ({ children }) => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  return (
    <DashboardLayout
      role={UserRole.CLIENT}
      onLogout={() => {
        logout();
        navigate('/portal/login');
      }}
    >
      {children}
    </DashboardLayout>
  );
};

export default PortalShell;
