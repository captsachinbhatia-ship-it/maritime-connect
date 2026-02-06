import { useState, useEffect } from 'react';
import { KPIRow } from './KPIRow';
import { ContactHealthSnapshot } from './ContactHealthSnapshot';
import { DashboardLineChart } from './DashboardLineChart';
import { ActivityMatrix } from './ActivityMatrix';
import { TouchTargets } from './TouchTargets';
import { GrowthTargets } from './GrowthTargets';
import { StageSnapshot } from './StageSnapshot';
import { RecentInteractions } from './RecentInteractions';
import { RecentCompanies } from './RecentCompanies';
import { MyWorkToday } from './MyWorkToday';
import { ModeIndicator } from './ModeIndicator';
import { EnquiriesSummary } from './EnquiriesSummary';
import { DailyReport } from './DailyReport';
import { ContactDetailsDrawer } from '@/components/contacts/ContactDetailsDrawer';
import { RunningNegotiationsTab } from './management/RunningNegotiationsTab';
import { OperationalIssuesTab } from './management/OperationalIssuesTab';
import { CommercialOutstandingTab } from './management/CommercialOutstandingTab';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabaseClient';
import { ContactWithCompany } from '@/types';

interface CEODashboardProps {
  isAdmin: boolean;
  isCEO: boolean;
}

interface CrmUserOption {
  id: string;
  full_name: string;
}

export function CEODashboard({ isAdmin, isCEO }: CEODashboardProps) {
  const [userFilter, setUserFilter] = useState<string>('all');
  const [crmUsers, setCrmUsers] = useState<CrmUserOption[]>([]);
  const [selectedContact, setSelectedContact] = useState<ContactWithCompany | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      const { data } = await supabase
        .from('crm_users')
        .select('id, full_name')
        .eq('active', true)
        .order('full_name');
      setCrmUsers((data || []).map(u => ({ id: u.id, full_name: u.full_name || 'Unknown' })));
    };
    fetchUsers();
  }, []);

  // null = all users (cumulative), string = specific user
  const selectedUserId: string | null = userFilter === 'all' ? null : userFilter;

  const handleContactClick = (contact: ContactWithCompany) => {
    setSelectedContact(contact);
    setDrawerOpen(true);
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
    setSelectedContact(null);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Management Dashboard</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {selectedUserId
              ? `Viewing: ${crmUsers.find(u => u.id === selectedUserId)?.full_name || 'User'}`
              : 'Company-wide cumulative overview'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={userFilter} onValueChange={setUserFilter}>
            <SelectTrigger className="w-[200px] h-8 text-xs">
              <SelectValue placeholder="All Users" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users (Cumulative)</SelectItem>
              {crmUsers.map(u => (
                <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isAdmin && <ModeIndicator isCEO={isCEO} />}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="dashboard">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="negotiations">Running Negotiations (0)</TabsTrigger>
          <TabsTrigger value="operational">Operational Issues (0)</TabsTrigger>
          <TabsTrigger value="commercial">Commercial Outstanding (0)</TabsTrigger>
        </TabsList>

        {/* Dashboard Tab — mirrors CallerDashboard layout */}
        <TabsContent value="dashboard" className="space-y-6 mt-4">
          {/* KPI Row */}
          <KPIRow crmUserId={selectedUserId} />

          {/* Contact Health + Line Chart */}
          <div className="grid gap-6 lg:grid-cols-2">
            <ContactHealthSnapshot crmUserId={selectedUserId} />
            <DashboardLineChart crmUserId={selectedUserId} isPersonal={false} />
          </div>

          {/* Activity Matrix — full width */}
          <ActivityMatrix crmUserId={selectedUserId} />

          {/* Touch Targets — full width */}
          <TouchTargets crmUserId={selectedUserId} onContactClick={handleContactClick} />

          {/* Growth Targets + Stage Snapshot */}
          <div className="grid gap-6 lg:grid-cols-2">
            <GrowthTargets crmUserId={selectedUserId} />
            <StageSnapshot crmUserId={selectedUserId} />
          </div>

          {/* Stale Contacts */}
          <MyWorkToday crmUserId={selectedUserId} onContactClick={handleContactClick} />

          {/* Recent Interactions + Recent Companies */}
          <div className="grid gap-6 lg:grid-cols-2">
            <RecentInteractions crmUserId={selectedUserId} />
            <RecentCompanies />
          </div>

          {/* Enquiries + Daily Report */}
          <div className="grid gap-6 lg:grid-cols-2">
            <EnquiriesSummary />
            <DailyReport />
          </div>
        </TabsContent>

        {/* Management Tabs */}
        <TabsContent value="negotiations" className="mt-4">
          <RunningNegotiationsTab />
        </TabsContent>

        <TabsContent value="operational" className="mt-4">
          <OperationalIssuesTab />
        </TabsContent>

        <TabsContent value="commercial" className="mt-4">
          <CommercialOutstandingTab />
        </TabsContent>
      </Tabs>

      {/* Contact Details Drawer */}
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
