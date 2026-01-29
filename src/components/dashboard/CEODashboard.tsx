import { CEOKPIRow } from './CEOKPIRow';
import { PipelineHealth } from './PipelineHealth';
import { TeamActivitySnapshot } from './TeamActivitySnapshot';
import { RiskNeglectList } from './RiskNeglectList';
import { RecentCompanies } from './RecentCompanies';

export function CEODashboard() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Executive Dashboard</h1>
        <p className="mt-1 text-muted-foreground">
          Organization-wide performance overview
        </p>
      </div>

      {/* Global KPI Row */}
      <CEOKPIRow />

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
