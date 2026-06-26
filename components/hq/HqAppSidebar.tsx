import * as React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Building2,
  Banknote,
  Film,
  KanbanSquare,
  LayoutDashboard,
  LogOut,
  Settings,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';
import { hqUserInitials } from '@/lib/hqUserDisplay';
import type { AuthUser } from '@/lib/auth';

export type HqNavItem = {
  id: string;
  to: string;
  label: string;
  icon: LucideIcon;
  match: (p: string) => boolean;
};

const ALL_NAV: HqNavItem[] = [
  { id: 'command', to: '/hq/admin', label: 'Command', icon: LayoutDashboard, match: (p) => p === '/hq/admin' || p === '/hq/admin/' },
  { id: 'crew', to: '/hq/admin/crew', label: 'Crew', icon: Users, match: (p) => p.startsWith('/hq/admin/crew') },
  { id: 'projects', to: '/hq/admin/projects', label: 'Projects', icon: Film, match: (p) => p.startsWith('/hq/admin/projects') },
  { id: 'planner', to: '/hq/admin/planner', label: 'Planner', icon: KanbanSquare, match: (p) => p.startsWith('/hq/admin/planner') },
  { id: 'financials', to: '/hq/admin/financials', label: 'Financials', icon: Banknote, match: (p) => p.startsWith('/hq/admin/financials') },
  { id: 'clients', to: '/hq/admin/clients', label: 'Clients', icon: Building2, match: (p) => p.startsWith('/hq/admin/clients') },
  { id: 'settings', to: '/hq/admin/settings', label: 'Settings', icon: Settings, match: (p) => p.startsWith('/hq/admin/settings') },
];

type HqAppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  user: AuthUser | null;
  navIds: Set<string>;
  showStaffBack?: boolean;
  onLogout: () => void;
};

export function HqAppSidebar({ user, navIds, showStaffBack, onLogout, ...props }: HqAppSidebarProps) {
  const { pathname } = useLocation();
  const primaryNav = ALL_NAV.filter((item) => navIds.has(item.id) && !['crew', 'clients'].includes(item.id));
  const dockNav = ALL_NAV.filter((item) => navIds.has(item.id) && ['crew', 'clients'].includes(item.id));

  const renderLink = (item: HqNavItem) => {
    const active = item.match(pathname);
    const Icon = item.icon;
    return (
      <SidebarMenuItem key={item.to}>
        <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
          <NavLink to={item.to} end={item.to === '/hq/admin'} data-tour={`hq-nav-${item.id}`}>
            <Icon />
            <span>{item.label}</span>
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex h-12 items-center gap-2 px-2 group-data-[collapsible=icon]:justify-center">
          <span className="font-semibold tracking-tight group-data-[collapsible=icon]:hidden">TORP</span>
          <span className="font-semibold tracking-tight hidden group-data-[collapsible=icon]:inline">T</span>
          <span className="ml-auto rounded-md border border-sidebar-border px-2 py-0.5 text-[10px] font-mono text-muted-foreground group-data-[collapsible=icon]:hidden">
            {hqUserInitials(user)}
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {showStaffBack && (
          <SidebarGroup>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Crew home">
                  <NavLink to="/hq/staff" data-tour="hq-staff-back">
                    <span aria-hidden>←</span>
                    <span>Crew home</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        )}
        <SidebarGroup>
          <SidebarGroupLabel>Operations</SidebarGroupLabel>
          <SidebarMenu>{primaryNav.map(renderLink)}</SidebarMenu>
        </SidebarGroup>
        {dockNav.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Directory</SidebarGroupLabel>
            <SidebarMenu>{dockNav.map(renderLink)}</SidebarMenu>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={onLogout} className="text-destructive hover:text-destructive" tooltip="Sign out">
              <LogOut />
              <span>Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

export { ALL_NAV as HQ_ADMIN_NAV_ITEMS };
