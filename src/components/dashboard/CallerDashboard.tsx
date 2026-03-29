import { RecentInteractions } from './RecentInteractions';
import { EnquiriesSummary } from './EnquiriesSummary';
import { DailyReport } from './DailyReport';
import { ModeIndicator } from './ModeIndicator';
import { FollowupsDueWidget } from './FollowupsDueWidget';
import { TeamTasksWidget } from './TeamTasksWidget';
import { NotepadCard } from './NotepadCard';
import { Briefcase } from 'lucide-react';


interface CallerDashboardProps {
  isAdmin: boolean;
  isCEO: boolean;
}

export function CallerDashboard({ isAdmin, isCEO }: CallerDashboardProps) {
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

      {/* ═══════════ ACTION ZONE ═══════════ */}
      <div className="space-y-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Briefcase className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">Action Zone</h2>
            <p className="text-xs text-muted-foreground">Your daily working desk</p>
          </div>
        </div>

        {/* Interactions + Tasks side by side, Follow-ups under Interactions, Notes under Tasks */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left column: Interactions → Follow-ups */}
          <div className="space-y-6">
            <RecentInteractions />
            <FollowupsDueWidget />
          </div>
          {/* Right column: Tasks → Notes */}
          <div className="space-y-6">
            <TeamTasksWidget />
            <NotepadCard />
          </div>
        </div>

        {/* Row 3: Enquiries + Daily Report */}
        <div className="grid gap-6 lg:grid-cols-2">
          <EnquiriesSummary isPersonal />
          <DailyReport />
        </div>
      </div>

    </div>
  );
}
