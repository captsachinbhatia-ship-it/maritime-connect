import { useState } from 'react';
import { KPIRow } from './KPIRow';
import { MyWorkToday } from './MyWorkToday';
import { RecentInteractions } from './RecentInteractions';
import { StageSnapshot } from './StageSnapshot';
import { RecentCompanies } from './RecentCompanies';
import { ContactDetailsDrawer } from '@/components/contacts/ContactDetailsDrawer';
import { ContactWithCompany } from '@/types';
import { ModeIndicator } from './ModeIndicator';

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Dashboard</h1>
          <p className="mt-1 text-muted-foreground">
            Your personal work and assigned contacts
          </p>
        </div>
        {isAdmin && <ModeIndicator isCEO={isCEO} />}
      </div>

      {/* KPI Row */}
      <KPIRow />

      {/* My Work Today */}
      <MyWorkToday onContactClick={handleContactClick} />

      {/* Secondary Panels */}
      <div className="grid gap-6 lg:grid-cols-2">
        <RecentInteractions />
        <StageSnapshot />
      </div>

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
