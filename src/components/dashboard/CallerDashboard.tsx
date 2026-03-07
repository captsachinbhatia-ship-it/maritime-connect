import { useState } from 'react';
import { ContactHealthSnapshot } from './ContactHealthSnapshot';
import { DashboardLineChart } from './DashboardLineChart';
import { ActivityMatrix } from './ActivityMatrix';
import { TouchTargets } from './TouchTargets';
import { ExecutiveSnapshot } from './ExecutiveSnapshot';

import { RecentCompanies } from './RecentCompanies';
import { RecentInteractions } from './RecentInteractions';
import { EnquiriesSummary } from './EnquiriesSummary';
import { DailyReport } from './DailyReport';
import { MyWorkToday } from './MyWorkToday';
import { UserVsTeamComparison } from './UserVsTeamComparison';
import { ModeIndicator } from './ModeIndicator';
import { FollowupsDueWidget } from './FollowupsDueWidget';
import { TeamTasksWidget } from './TeamTasksWidget';
import { NotepadCard } from './NotepadCard';
import { ContactDetailsDrawer } from '@/components/contacts/ContactDetailsDrawer';
import { ContactWithCompany } from '@/types';
import { Button } from '@/components/ui/button';

interface CallerDashboardProps {
  isAdmin: boolean;
  isCEO: boolean;
}

export function CallerDashboard({ isAdmin, isCEO }: CallerDashboardProps) {
  const [selectedContact, setSelectedContact] = useState<ContactWithCompany | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [logModalOpen, setLogModalOpen] = useState(false);

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
          <h1 className="text-2xl font-bold text-foreground">
            {isAdmin ? 'Management Dashboard' : 'My Dashboard'}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {isAdmin ? 'Company-wide overview' : 'Your personal work and assigned contacts'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && <ModeIndicator isCEO={isCEO} />}
        </div>
      </div>

      {/* Row 1: Tasks (8/12) + Notepad (4/12) */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <TeamTasksWidget />
        </div>
        <div className="lg:col-span-4">
          <NotepadCard />
        </div>
      </div>

      {/* Row 2: Recent Interactions (8/12) + Follow-ups Due (4/12) */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <RecentInteractions />
        </div>
        <div className="lg:col-span-4">
          <FollowupsDueWidget />
        </div>
      </div>

      {/* Row 3: Enquiries Overview */}
      <div className="grid gap-6 lg:grid-cols-2">
        <EnquiriesSummary isPersonal />
        <DailyReport />
      </div>

      {/* Row 4: KPI tiles + Analytics */}
      <ExecutiveSnapshot />
      <ContactHealthSnapshot />
      <DashboardLineChart isPersonal />

      {/* Activity Matrix — full width */}
      <ActivityMatrix />

      {/* CEO: User vs Team Comparison */}
      <UserVsTeamComparison isCEO={isCEO} isAdmin={isAdmin} />

      {/* Touch Targets — full width */}
      <TouchTargets onContactClick={handleContactClick} isAdmin={isAdmin} />

      {/* Stale Contacts */}
      <MyWorkToday onContactClick={handleContactClick} />

      {/* Recent Companies */}
      <RecentCompanies />

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
