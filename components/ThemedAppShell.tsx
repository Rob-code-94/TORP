import React from 'react';
import { Outlet } from 'react-router-dom';
import DemoDataBanner from './DemoDataBanner';
import FirebaseMisconfiguredBanner from './FirebaseMisconfiguredBanner';
import { AdminThemeProvider } from '../lib/adminTheme';

/**
 * Wraps all non-landing routes so light/dark theme context is available
 * (admin, staff, portal, logins, print). `/` (Landing) stays outside.
 * Banners render here so they sit above the route content but below the
 * landing page; FirebaseMisconfiguredBanner takes precedence over the demo
 * banner because a missing config blocks every authed feature.
 */
const ThemedAppShell: React.FC = () => (
  <AdminThemeProvider>
    <FirebaseMisconfiguredBanner />
    <DemoDataBanner />
    <Outlet />
  </AdminThemeProvider>
);

export default ThemedAppShell;
