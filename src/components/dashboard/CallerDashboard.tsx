import { useState } from 'react';
import { ContactHealthSnapshot } from './ContactHealthSnapshot';
import { DashboardLineChart } from './DashboardLineChart';
import { ActivityMatrix } from './ActivityMatrix';
import { TouchTargets } from './TouchTargets';
import { GrowthTargets } from './GrowthTargets';
import { RecentCompanies } from './RecentCompanies';
import { RecentInteractions } from './RecentInteractions';
import { EnquiriesSummary } from './EnquiriesSummary';
import { DailyReport } from './DailyReport';
import { MyWorkToday } from './MyWorkToday';
import { UserVsTeamComparison } from './UserVsTeamComparison';
import { ModeIndicator } from './ModeIndicator';
import { ContactDetailsDrawer } from '@/components/contacts/ContactDetailsDrawer';
import { ContactWithCompany } from '@/types';

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

      {/* Contact Health — full width */}
      <ContactHealthSnapshot />

      {/* Performance Trend — full width */}
      <DashboardLineChart isPersonal />

      {/* Activity Matrix — full width */}
      <ActivityMatrix />

      {/* CEO: User vs Team Comparison */}
      <UserVsTeamComparison isCEO={isCEO} isAdmin={isAdmin} />

      {/* Touch Targets — full width (includes Follow-ups / Nudges KPI cards) */}
      <TouchTargets onContactClick={handleContactClick} isAdmin={isAdmin} />

      {/* Growth Targets — full width */}
      <GrowthTargets />

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
