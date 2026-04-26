import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { UserRole } from './types';
import { AuthProvider } from './lib/auth';
import DemoDataBanner from './components/DemoDataBanner';
import Landing from './components/landing/Landing';
import HQIndexRedirect from './components/hq/HQIndexRedirect';
import HQLogin from './components/hq/HQLogin';
import PortalLogin from './components/portal/PortalLogin';
import HQShell from './components/hq/HQShell';
import PortalShell from './components/portal/PortalShell';
import RequireAuth from './components/common/RequireAuth';
import StaffView from './components/dashboard/StaffView';
import CallSheetPrintView from './components/dashboard/CallSheetPrintView';
import ClientView from './components/dashboard/ClientView';
import AdminLayout from './components/hq/admin/AdminLayout';
import AdminCommand from './components/hq/admin/AdminCommand';
import AdminProjects from './components/hq/admin/AdminProjects';
import AdminProjectDetail from './components/hq/admin/AdminProjectDetail';
import AdminPlanner from './components/hq/admin/AdminPlanner';
import AdminFinancials from './components/hq/admin/AdminFinancials';
import AdminCrew from './components/hq/admin/AdminCrew';
import AdminClients from './components/hq/admin/AdminClients';
import AdminSettings from './components/hq/admin/AdminSettings';
import { AdminThemeProvider } from './lib/adminTheme';

/**
 * Router shell: `/` = public marketing; `/hq/*` = internal HQ; `/portal/*` = client.
 */
const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <DemoDataBanner />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/hq" element={<HQIndexRedirect />} />
          <Route path="/hq/login" element={<HQLogin />} />
          <Route
            path="/hq/admin"
            element={
              <RequireAuth roles={[UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.STAFF]} redirectTo="/hq/login">
                <AdminThemeProvider>
                  <AdminLayout />
                </AdminThemeProvider>
              </RequireAuth>
            }
          >
            <Route index element={<AdminCommand />} />
            <Route path="projects" element={<AdminProjects />} />
            <Route path="projects/:projectId" element={<AdminProjectDetail />} />
            <Route path="planner" element={<AdminPlanner />} />
            <Route path="financials" element={<AdminFinancials />} />
            <Route path="crew" element={<AdminCrew />} />
            <Route path="clients" element={<AdminClients />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>
          <Route
            path="/hq/staff"
            element={
              <RequireAuth roles={[UserRole.STAFF]} redirectTo="/hq/login">
                <HQShell role={UserRole.STAFF}>
                  <StaffView />
                </HQShell>
              </RequireAuth>
            }
          />
          <Route
            path="/hq/staff/call-sheet/:shootId/print"
            element={
              <RequireAuth roles={[UserRole.STAFF]} redirectTo="/hq/login">
                <CallSheetPrintView />
              </RequireAuth>
            }
          />
          <Route path="/portal/login" element={<PortalLogin />} />
          <Route
            path="/portal"
            element={
              <RequireAuth roles={[UserRole.CLIENT]} redirectTo="/portal/login">
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
