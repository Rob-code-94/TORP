import React from 'react';
import { useNavigate } from 'react-router-dom';
import { UserRole } from '../../types';
import DashboardLayout from '../dashboard/DashboardLayout';
import { useAuth } from '../../lib/auth';

interface HQShellProps {
  role: UserRole.ADMIN | UserRole.STAFF;
  children: React.ReactNode;
}

/** Internal HQ chrome (sidebar, sign-out). Only used under `/hq/*`. */
const HQShell: React.FC<HQShellProps> = ({ role, children }) => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  return (
    <DashboardLayout
      role={role}
      onLogout={() => {
        logout();
        navigate('/hq/login');
      }}
    >
      {children}
    </DashboardLayout>
  );
};

export default HQShell;
