import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  FileText, 
  BarChart3,
  LogOut,
  Anchor,
  CalendarClock,
  ClipboardCheck,
  UserCog,
  Activity
} from 'lucide-react';
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
import { supabase } from '@/lib/supabaseClient';

const navItems = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'Companies', url: '/companies', icon: Building2 },
  { title: 'Contacts', url: '/contacts', icon: Users },
  { title: 'My Follow-ups', url: '/followups', icon: CalendarClock },
  { title: 'Enquiries', url: '/enquiries', icon: FileText },
  { title: 'Reporting', url: '/reporting', icon: BarChart3 },
];

const adminNavItems = [
  { title: 'Follow-ups Oversight', url: '/followups-oversight', icon: ClipboardCheck },
  { title: 'Daily Work Done', url: '/admin/daily-work-done', icon: Activity },
  { title: 'Admin – Users', url: '/admin-users', icon: UserCog },
];

export function AppSidebar() {
  const { user, crmUser, signOut } = useAuth();
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminRole();
  }, [crmUser]);

  const checkAdminRole = async () => {
    if (!crmUser) {
      setIsAdmin(false);
      return;
    }

    // Check profiles table for system role (ADMIN, CEO)
    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user?.id)
      .maybeSingle();

    setIsAdmin(data?.role === 'ADMIN' || data?.role === 'CEO');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <Anchor className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-sidebar-foreground">AQ Maritime</h1>
            <p className="text-xs text-sidebar-foreground/60">CRM System</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild
                    isActive={isActive(item.url)}
                  >
                    <NavLink 
                      to={item.url} 
                      className="flex items-center gap-3"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin-only navigation */}
        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Management</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminNavItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild
                      isActive={isActive(item.url)}
                    >
                      <NavLink 
                        to={item.url} 
                        className="flex items-center gap-3"
                        activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
                      >
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
        <div className="mb-3 truncate text-sm text-sidebar-foreground/70">
          {user?.email}
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full justify-start"
          onClick={signOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
