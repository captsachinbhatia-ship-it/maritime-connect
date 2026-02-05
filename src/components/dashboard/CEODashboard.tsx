import { CEOKPIRow } from './CEOKPIRow';
import { PipelineHealth } from './PipelineHealth';
import { TeamActivitySnapshot } from './TeamActivitySnapshot';
import { RiskNeglectList } from './RiskNeglectList';
import { RecentCompanies } from './RecentCompanies';
import { ModeIndicator } from './ModeIndicator';
import { PendingStageRequests } from './PendingStageRequests';
import { UnassignedContactsList } from './UnassignedContactsList';

interface CEODashboardProps {
  isAdmin: boolean;
  isCEO: boolean;
}

export function CEODashboard({ isAdmin, isCEO }: CEODashboardProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Management Dashboard</h1>
          <p className="mt-1 text-muted-foreground">
            Company-wide overview
          </p>
        </div>
        {isAdmin && <ModeIndicator isCEO={isCEO} />}
      </div>

      {/* Global KPI Row */}
      <CEOKPIRow />

      {/* Pending Stage Requests */}
      <PendingStageRequests />

      {/* Unassigned Contacts - Admin operational pool */}
      <UnassignedContactsList />

      {/* Pipeline Health - Full Width */}
      <PipelineHealth />

      {/* Secondary Panels */}
      <div className="grid gap-6 lg:grid-cols-2">
        <TeamActivitySnapshot />
        <RiskNeglectList />
      </div>

      {/* Recent Companies */}
      <RecentCompanies />
    </div>
  );
}
