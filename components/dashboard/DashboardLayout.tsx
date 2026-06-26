import React, { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { UserRole } from '../../types';
import { CircleHelp, LayoutDashboard, LogOut, Moon, Sun } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { useAdminTheme } from '../../lib/adminTheme';
import { getGuideSectionsForContext } from '../../lib/hqProductGuideFilter';
import { HQ_GUIDE_TIP_EVENT } from '../../lib/hqGuideTipStorage';
import { startHqAdminShellTour } from '../../lib/hqAdminTour';
import HqProductGuidePanel from '../hq/HqProductGuidePanel';
import HqFirestoreListenerBanner from '../hq/HqFirestoreListenerBanner';
import HqProfileMenuCluster from '../hq/HqProfileMenu';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { hqUserInitials } from '@/lib/hqUserDisplay';

interface DashboardLayoutProps {
  role: UserRole;
  children: React.ReactNode;
  onLogout: () => void;
}

type NavItem = { icon: React.ReactNode; label: string; to: string };

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ role, children, onLogout }) => {
  const { user, updateSessionProfile } = useAuth();
  const { theme, toggleTheme } = useAdminTheme();
  const isDark = theme === 'dark';
  const { pathname } = useLocation();
  const [guideOpen, setGuideOpen] = useState(false);
  const guideSurface = role === UserRole.CLIENT ? 'client' : 'staff';
  const guideSections = useMemo(
    () => getGuideSectionsForContext({ surface: guideSurface, user: user ?? null }),
    [guideSurface, user]
  );

  useEffect(() => {
    const onOpen = () => setGuideOpen(true);
    window.addEventListener(HQ_GUIDE_TIP_EVENT, onOpen);
    return () => window.removeEventListener(HQ_GUIDE_TIP_EVENT, onOpen);
  }, []);

  const getNavItems = (): NavItem[] => {
    switch (role) {
      case UserRole.STAFF:
        return [{ icon: <LayoutDashboard size={20} />, label: 'Overview', to: '/hq/staff' }];
      case UserRole.CLIENT:
        return [{ icon: <LayoutDashboard size={20} />, label: 'Overview', to: '/portal' }];
      case UserRole.ADMIN:
      case UserRole.PROJECT_MANAGER:
        return [{ icon: <LayoutDashboard size={20} />, label: 'Overview', to: '/hq/admin' }];
      default:
        return [];
    }
  };

  const roleLabel =
    role === UserRole.ADMIN ? 'Staff Portal' : role === UserRole.STAFF ? 'Crew Portal' : 'Client Suite';

  return (
    <SidebarProvider>
      <Sidebar collapsible="offcanvas" className="border-r">
        <SidebarHeader className="border-b border-sidebar-border">
          <div className="flex h-12 items-center gap-2 px-2">
            <span className="font-semibold tracking-tight">TORP</span>
            <span className="rounded-md border border-sidebar-border px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
              {roleLabel}
            </span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarMenu>
              {getNavItems().map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton asChild tooltip={item.label}>
                    <NavLink to={item.to} end>
                      {item.icon}
                      <span>{item.label}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="border-t border-sidebar-border">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={onLogout} className="text-destructive hover:text-destructive">
                <LogOut />
                <span>Sign out</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="min-w-0">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
          <SidebarTrigger className="-ml-1 md:hidden" />
          <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4 md:hidden" />
          <h2 className="font-semibold text-lg flex-1 min-w-0 truncate">Dashboard</h2>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setGuideOpen(true)}
              data-tour="hq-dashboard-guide"
              aria-label="Open product guide"
            >
              <CircleHelp className="size-4" />
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={toggleTheme} aria-label="Toggle theme">
              {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>
            {role === UserRole.STAFF ? (
              <HqProfileMenuCluster
                variant="staff"
                user={user}
                isDark={isDark}
                pathname={pathname}
                updateSessionProfile={updateSessionProfile}
              />
            ) : (
              <div
                className="flex size-8 items-center justify-center rounded-full border bg-muted text-xs font-medium"
                title={user?.displayName || user?.email || 'Account'}
              >
                {hqUserInitials(user)}
              </div>
            )}
          </div>
        </header>
        <HqFirestoreListenerBanner />
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 min-w-0">{children}</div>
      </SidebarInset>

      <HqProductGuidePanel
        open={guideOpen}
        onClose={() => setGuideOpen(false)}
        sections={guideSections}
        isDark={isDark}
        subtitle={role === UserRole.CLIENT ? 'Client suite' : 'Crew home'}
        canStartTour={role === UserRole.STAFF}
        onStartTour={() => {
          if (!user || role !== UserRole.STAFF) return;
          setGuideOpen(false);
          window.setTimeout(
            () =>
              void startHqAdminShellTour({
                pathname,
                role: user.role,
              }),
            0
          );
        }}
      />
    </SidebarProvider>
  );
};

export default DashboardLayout;
