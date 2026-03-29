import { useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Users,
  FileText,
  BarChart3,
  LogOut,
  ClipboardCheck,
  UserCog,
  Activity,
  FolderOpen,
  TrendingUp,
  Globe,
  Newspaper,
  Anchor,
} from 'lucide-react';
import aqMaritimeLogo from '@/assets/logo-aq-maritime.jpg';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';

const marketItems = [
  { title: 'Fixtures', url: '/market-reports', icon: Newspaper },
  { title: 'Baltic & Rates', url: '/baltic-routes', icon: Anchor },
  { title: 'Bunker Prices', url: '/market-reports/bunker', icon: Newspaper },
];

const navItems = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'Companies', url: '/companies', icon: Building2 },
  { title: 'Contacts', url: '/contacts', icon: Users },
  { title: 'Enquiries', url: '/enquiries', icon: FileText },
  { title: 'Documents', url: '/documents', icon: FolderOpen },
  { title: 'Performance', url: '/performance', icon: TrendingUp },
  { title: 'Map View', url: '/map', icon: Globe },
];

const adminNavItems = [
  { title: 'Follow-ups Oversight', url: '/followups-oversight', icon: ClipboardCheck },
  { title: 'Daily Work Done', url: '/admin/daily-work-done', icon: Activity },
  { title: 'Admin Summary', url: '/admin/summary', icon: BarChart3 },
  { title: 'Admin – Users', url: '/admin-users', icon: UserCog },
];

export function AppSidebar() {
  const { user, crmUser, signOut, isAdmin, isPreviewMode } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <img 
            src={aqMaritimeLogo} 
            alt="AQ Maritime" 
            className="h-12 w-auto object-contain"
          />
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Market Intelligence — top of sidebar */}
        <SidebarGroup>
          <SidebarGroupLabel>Market Intelligence</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {marketItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink to={item.url} className="flex items-center gap-3" activeClassName="bg-sidebar-accent text-sidebar-accent-foreground">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink to={item.url} className="flex items-center gap-3" activeClassName="bg-sidebar-accent text-sidebar-accent-foreground">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin-only: Reporting */}
        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Analytics</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive('/reporting')}>
                    <NavLink to="/reporting" className="flex items-center gap-3" activeClassName="bg-sidebar-accent text-sidebar-accent-foreground">
                      <BarChart3 className="h-4 w-4" />
                      <span>Reporting</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Admin-only navigation */}
        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Management</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminNavItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)}>
                      <NavLink to={item.url} className="flex items-center gap-3" activeClassName="bg-sidebar-accent text-sidebar-accent-foreground">
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="mb-3 flex items-center gap-3 px-2 py-1.5 rounded-lg bg-sidebar-accent/50">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
            {(isPreviewMode ? crmUser?.full_name : (crmUser?.full_name || user?.email))?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="min-w-0 flex flex-col">
            {(isPreviewMode ? crmUser?.full_name : crmUser?.full_name) && (
              <span className="text-sm font-medium text-sidebar-foreground truncate">
                {isPreviewMode ? crmUser?.full_name : crmUser?.full_name}
              </span>
            )}
            <span className="text-xs text-sidebar-foreground/60 truncate">
              {isPreviewMode ? crmUser?.email : user?.email}
            </span>
          </div>
        </div>
        <Button 
          variant="destructive" 
          size="sm" 
          className="w-full justify-center gap-2 font-medium"
          onClick={signOut}
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
