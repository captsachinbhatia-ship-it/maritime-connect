import { useState } from 'react';
import { KPIRow } from './KPIRow';
import { StageSnapshot } from './StageSnapshot';
import { RecentCompanies } from './RecentCompanies';
import { RecentInteractions } from './RecentInteractions';
import { ContactDetailsDrawer } from '@/components/contacts/ContactDetailsDrawer';
import { ContactWithCompany } from '@/types';
import { ModeIndicator } from './ModeIndicator';
import { TouchTargets } from './TouchTargets';
import { GrowthTargets } from './GrowthTargets';
import { DailyReport } from './DailyReport';
import { EnquiriesSummary } from './EnquiriesSummary';
import { ActivityMatrix } from './ActivityMatrix';
import { UserVsTeamComparison } from './UserVsTeamComparison';
import { DashboardLineChart } from './DashboardLineChart';
import { ContactHealthSnapshot } from './ContactHealthSnapshot';
import { MyWorkToday } from './MyWorkToday';

interface CallerDashboardProps {
  isAdmin: boolean;
  isCEO: boolean;
}

export function CallerDashboard({ isAdmin, isCEO }: CallerDashboardProps) {
  const [selectedContact, setSelectedContact] = useState<ContactWithCompany | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

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
          <h1 className="text-2xl font-bold text-foreground">My Dashboard</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Your personal work and assigned contacts
          </p>
        </div>
        {isAdmin && <ModeIndicator isCEO={isCEO} />}
      </div>

      {/* KPI Row */}
      <KPIRow />

      {/* Contact Health + Line Chart */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ContactHealthSnapshot />
        <DashboardLineChart isPersonal />
      </div>

      {/* Activity Matrix */}
      <ActivityMatrix />

      {/* CEO: User vs Team Comparison */}
      <UserVsTeamComparison isCEO={isCEO} isAdmin={isAdmin} />

      {/* Touch Targets + Growth Targets */}
      <div className="grid gap-6 lg:grid-cols-2">
        <TouchTargets onContactClick={handleContactClick} />
        <GrowthTargets />
      </div>

      {/* Stage Snapshot */}
      <StageSnapshot />

      {/* Stale Contacts */}
      <MyWorkToday onContactClick={handleContactClick} />

      {/* Recent Interactions + Recent Companies */}
      <div className="grid gap-6 lg:grid-cols-2">
        <RecentInteractions />
        <RecentCompanies />
      </div>

      {/* Enquiries + Daily Report */}
      <div className="grid gap-6 lg:grid-cols-2">
        <EnquiriesSummary />
        <DailyReport />
      </div>

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
