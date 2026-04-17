import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { UserRole } from './types';
import { AuthProvider } from './lib/auth';
import Landing from './components/landing/Landing';
import HQIndexRedirect from './components/hq/HQIndexRedirect';
import HQLogin from './components/hq/HQLogin';
import PortalLogin from './components/portal/PortalLogin';
import HQShell from './components/hq/HQShell';
import PortalShell from './components/portal/PortalShell';
import RequireAuth from './components/common/RequireAuth';
import AdminView from './components/dashboard/AdminView';
import StaffView from './components/dashboard/StaffView';
import ClientView from './components/dashboard/ClientView';

/**
 * Router shell: `/` = public marketing; `/hq/*` = internal HQ; `/portal/*` = client.
 */
const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/hq" element={<HQIndexRedirect />} />
          <Route path="/hq/login" element={<HQLogin />} />
          <Route
            path="/hq/admin"
            element={
              <RequireAuth role={UserRole.ADMIN} redirectTo="/hq/login">
                <HQShell role={UserRole.ADMIN}>
                  <AdminView />
                </HQShell>
              </RequireAuth>
            }
          />
          <Route
            path="/hq/staff"
            element={
              <RequireAuth role={UserRole.STAFF} redirectTo="/hq/login">
                <HQShell role={UserRole.STAFF}>
                  <StaffView />
                </HQShell>
              </RequireAuth>
            }
          />
          <Route path="/portal/login" element={<PortalLogin />} />
          <Route
            path="/portal"
            element={
              <RequireAuth role={UserRole.CLIENT} redirectTo="/portal/login">
                <PortalShell>
                  <ClientView />
                </PortalShell>
              </RequireAuth>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
