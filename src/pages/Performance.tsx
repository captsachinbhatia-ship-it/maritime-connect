import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { ContactHealthSnapshot } from '@/components/dashboard/ContactHealthSnapshot';
import { DashboardLineChart } from '@/components/dashboard/DashboardLineChart';
import { ActivityMatrix } from '@/components/dashboard/ActivityMatrix';
import { TouchTargets } from '@/components/dashboard/TouchTargets';
import { ExecutiveSnapshot } from '@/components/dashboard/ExecutiveSnapshot';
import { MyWorkToday } from '@/components/dashboard/MyWorkToday';
import { UserVsTeamComparison } from '@/components/dashboard/UserVsTeamComparison';
import { RecentCompanies } from '@/components/dashboard/RecentCompanies';
import { ContactDetailsDrawer } from '@/components/contacts/ContactDetailsDrawer';
import { ContactWithCompany } from '@/types';
import { BarChart3, Loader2 } from 'lucide-react';

export default function Performance() {
  const { crmUser, isAdmin } = useAuth();
  const [isCEO, setIsCEO] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedContact, setSelectedContact] = useState<ContactWithCompany | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const checkMode = async () => {
      if (!crmUser?.id) { setIsLoading(false); return; }
      try {
        const { data, error } = await supabase.rpc('is_ceo_mode');
        setIsCEO(!error && data === true);
      } catch {
        setIsCEO(false);
      } finally {
        setIsLoading(false);
      }
    };
    checkMode();
  }, [crmUser?.id]);

  const handleContactClick = (contact: ContactWithCompany) => {
    setSelectedContact(contact);
    setDrawerOpen(true);
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
    setSelectedContact(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/60">
          <BarChart3 className="h-4 w-4 text-accent-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Performance</h1>
          <p className="text-xs text-muted-foreground">KPIs, health metrics &amp; analytics</p>
        </div>
      </div>

      <ExecutiveSnapshot />
      <ContactHealthSnapshot />
      <DashboardLineChart isPersonal />
      <ActivityMatrix />
      <UserVsTeamComparison isCEO={isCEO ?? false} isAdmin={isAdmin} />
      <TouchTargets onContactClick={handleContactClick} isAdmin={isAdmin} />
      <MyWorkToday onContactClick={handleContactClick} />
      <RecentCompanies />

      <ContactDetailsDrawer
        contact={selectedContact}
        companyName={null}
        currentStage={null}
        isOpen={drawerOpen}
        onClose={handleDrawerClose}
      />
    </div>
  );
}
