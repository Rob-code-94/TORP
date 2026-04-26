import React from 'react';
import { Outlet } from 'react-router-dom';
import DemoDataBanner from './DemoDataBanner';
import { AdminThemeProvider } from '../lib/adminTheme';

/**
 * Wraps all non-landing routes so light/dark theme context is available
 * (admin, staff, portal, logins, print). `/` (Landing) stays outside.
 * DemoDataBanner is rendered here (not on `/`) so it can use theme if needed.
 */
const ThemedAppShell: React.FC = () => (
  <AdminThemeProvider>
    <DemoDataBanner />
    <Outlet />
  </AdminThemeProvider>
);

export default ThemedAppShell;
