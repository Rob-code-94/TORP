import React from 'react';
import { Outlet } from 'react-router-dom';
import DemoDataBanner from './DemoDataBanner';
import FirebaseMisconfiguredBanner from './FirebaseMisconfiguredBanner';
import { AdminThemeProvider } from '../lib/adminTheme';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';

/**
 * Wraps all non-landing routes so light/dark theme context is available
 * (admin, staff, portal, logins, print). `/` (Landing) stays outside.
 */
const ThemedAppShell: React.FC = () => (
  <AdminThemeProvider>
    <TooltipProvider>
      <div data-surface="operations" className="hq-operations min-h-svh min-w-0 bg-background text-foreground">
        <FirebaseMisconfiguredBanner />
        <DemoDataBanner />
        <Outlet />
        <Toaster richColors closeButton position="top-right" />
      </div>
    </TooltipProvider>
  </AdminThemeProvider>
);

export default ThemedAppShell;
