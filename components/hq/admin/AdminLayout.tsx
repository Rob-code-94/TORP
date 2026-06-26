import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { CircleHelp, Moon, Sun } from 'lucide-react';
import { HqAppSidebar } from '../HqAppSidebar';
import HqProfileMenuCluster from '../HqProfileMenu';
import HqProductGuidePanel from '../HqProductGuidePanel';
import HqFirestoreListenerBanner from '../HqFirestoreListenerBanner';
import HqTenantClaimBanner from '../HqTenantClaimBanner';
import AdminRouteErrorBoundary from './AdminRouteErrorBoundary';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { useAuth } from '@/lib/auth';
import { useAdminTheme } from '@/lib/adminTheme';
import { canHqAdminAccessPathForUser, hqAdminNavIdsForUser } from '@/lib/hqAccess';
import { getGuideSectionsForContext } from '@/lib/hqProductGuideFilter';
import { startHqAdminShellTour } from '@/lib/hqAdminTour';
import { HQ_GUIDE_TIP_EVENT } from '@/lib/hqGuideTipStorage';
import { UserRole } from '@/types';
import { Navigate } from 'react-router-dom';

function pageTitle(pathname: string): string {
  if (pathname.match(/^\/hq\/admin\/projects\/[^/]+$/)) return 'Project';
  const titles: Record<string, string> = {
    '/hq/admin': 'Command',
    '/hq/admin/crew': 'Crew',
    '/hq/admin/projects': 'Projects',
    '/hq/admin/planner': 'Planner',
    '/hq/admin/financials': 'Financials',
    '/hq/admin/clients': 'Clients',
    '/hq/admin/settings': 'Settings',
  };
  for (const [prefix, label] of Object.entries(titles)) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return label;
  }
  return 'Admin';
}

/** Route-aware HQ admin shell (ADMIN + PROJECT_MANAGER). */
const AdminLayout: React.FC = () => {
  const { logout, user, updateSessionProfile } = useAuth();
  const { theme, toggleTheme } = useAdminTheme();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [guideOpen, setGuideOpen] = React.useState(false);
  const [wideEnoughForTour, setWideEnoughForTour] = React.useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 640px)').matches
  );

  const title = pageTitle(pathname);
  const allowedNavIds = React.useMemo(() => new Set(hqAdminNavIdsForUser(user)), [user]);
  const staffInAdminProject = React.useMemo(
    () => Boolean(user?.role === UserRole.STAFF && /^\/hq\/admin\/projects\/[^/]+\/?$/.test(pathname)),
    [user?.role, pathname]
  );
  const guideSections = React.useMemo(
    () => getGuideSectionsForContext({ surface: 'admin', user: user ?? null, staffInAdminProject }),
    [user, staffInAdminProject]
  );

  React.useEffect(() => {
    const onOpen = () => setGuideOpen(true);
    window.addEventListener(HQ_GUIDE_TIP_EVENT, onOpen);
    return () => window.removeEventListener(HQ_GUIDE_TIP_EVENT, onOpen);
  }, []);

  React.useEffect(() => {
    const mq = window.matchMedia('(min-width: 640px)');
    const onChange = () => setWideEnoughForTour(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  if (user && !canHqAdminAccessPathForUser(pathname, user)) {
    return <Navigate to={user.role === UserRole.STAFF ? '/hq/staff' : '/hq/admin'} replace />;
  }

  const onLogout = () => {
    logout();
    navigate('/hq/login');
  };

  return (
    <SidebarProvider>
      <HqAppSidebar
        id="hq-sidebar"
        user={user}
        navIds={allowedNavIds}
        showStaffBack={user?.role === UserRole.STAFF}
        onLogout={onLogout}
      />
      <SidebarInset className="min-w-0">
        <header
          className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4"
          data-tour="admin-main"
        >
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
          <Breadcrumb className="min-w-0 flex-1">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage className="truncate">
                  {title}
                  {pathname.match(/^\/hq\/admin\/projects\/[^/]+$/) && (
                    <span className="ml-2 font-normal text-muted-foreground">/ detail</span>
                  )}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setGuideOpen(true)}
              data-tour="hq-header-guide"
              aria-label="Open product guide"
              title="Product guide"
            >
              <CircleHelp className="size-4" />
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={toggleTheme} aria-label="Toggle admin theme">
              {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
              {theme === 'dark' ? 'Light' : 'Dark'}
            </Button>
            <HqProfileMenuCluster
              variant="admin"
              user={user}
              isDark={theme === 'dark'}
              pathname={pathname}
              updateSessionProfile={updateSessionProfile}
            />
          </div>
        </header>
        <HqFirestoreListenerBanner />
        <HqTenantClaimBanner />
        <div className="flex-1 overflow-y-auto no-scrollbar p-4 sm:p-6 min-h-0 min-w-0">
          <AdminRouteErrorBoundary key={pathname}>
            <Outlet />
          </AdminRouteErrorBoundary>
        </div>
      </SidebarInset>

      <HqProductGuidePanel
        open={guideOpen}
        onClose={() => setGuideOpen(false)}
        sections={guideSections}
        isDark={theme === 'dark'}
        canStartTour={wideEnoughForTour}
        onStartTour={() => {
          setGuideOpen(false);
          if (!user) return;
          window.setTimeout(
            () =>
              void startHqAdminShellTour({
                pathname,
                role: user.role,
                allowedNavIds: Array.from(allowedNavIds),
              }),
            0
          );
        }}
      />
    </SidebarProvider>
  );
};

export default AdminLayout;
