import { useState } from 'react';
import { UserPlus, CalendarClock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CompanyFollowupDialog } from './CompanyFollowupDialog';

interface CompanyActionsBarProps {
  companyId: string;
  companyName: string;
}

export function CompanyActionsBar({ companyId, companyName }: CompanyActionsBarProps) {
  const [followupOpen, setFollowupOpen] = useState(false);

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setFollowupOpen(true)}
        >
          <CalendarClock className="h-4 w-4 mr-1.5" />
          Set Reminder
        </Button>
      </div>

      <CompanyFollowupDialog
        companyId={companyId}
        companyName={companyName}
        open={followupOpen}
        onOpenChange={setFollowupOpen}
      />
    </>
  );
}
