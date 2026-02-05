import { Outlet } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
 import { PreviewBanner } from '@/components/PreviewBanner';
 import { useAuth } from '@/contexts/AuthContext';

export function AppLayout() {
  const { isPreviewMode } = useAuth();

  return (
    <SidebarProvider>
      <div className={`flex min-h-screen w-full ${isPreviewMode ? 'pt-9' : ''}`}>
        <PreviewBanner />
        <AppSidebar />
        <main className="flex-1 overflow-auto">
          <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-border bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <SidebarTrigger />
            <NotificationCenter />
          </header>
          <div className="p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
