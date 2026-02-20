import { useState, useEffect } from 'react';
import { Loader2, ChevronDown, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { changeContactStage, AssignmentStage } from '@/services/assignments';
import { supabase } from '@/lib/supabaseClient';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface StageDropdownProps {
  contactId: string;
  currentStage: AssignmentStage;
  onStageChange: () => void;
  disabled?: boolean;
  readOnly?: boolean;
}

const STAGES: { value: AssignmentStage; label: string }[] = [
  { value: 'COLD_CALLING', label: 'Cold Calling' },
  { value: 'ASPIRATION', label: 'Aspiration' },
  { value: 'ACHIEVEMENT', label: 'Achievement' },
];

const STAGE_COLORS: Record<AssignmentStage, string> = {
  COLD_CALLING: 'bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300',
  ASPIRATION: 'bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300',
  ACHIEVEMENT: 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300',
};

export function StageDropdown({ 
  contactId, 
  currentStage, 
  onStageChange,
  disabled = false,
  readOnly = false,
}: StageDropdownProps) {
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  const [hasActivePrimary, setHasActivePrimary] = useState<boolean | null>(null);

  useEffect(() => {
    if (readOnly) return;
    let cancelled = false;
    supabase
      .from('contact_assignments')
      .select('id', { count: 'exact', head: true })
      .eq('contact_id', contactId)
      .eq('assignment_role', 'PRIMARY')
      .eq('status', 'ACTIVE')
      .is('ended_at', null)
      .then(({ count }) => {
        if (!cancelled) setHasActivePrimary((count ?? 0) > 0);
      });
    return () => { cancelled = true; };
  }, [contactId, readOnly, currentStage]);

  const handleStageSelect = async (newStage: AssignmentStage) => {
    if (newStage === currentStage) return;

    setIsUpdating(true);

    const result = await changeContactStage({
      contact_id: contactId,
      to_stage: newStage,
    });

    if (result.error) {
      toast({
        variant: 'destructive',
        title: 'Failed to update stage',
        description: result.error,
      });
    } else if (result.data) {
      if (result.data.action === 'NO_ROWS') {
        toast({
          variant: 'destructive',
          title: 'Stage update failed',
          description: 'No active primary assignment found.',
        });
      } else if (result.data.action === 'REQUESTED') {
        toast({
          title: 'Inactive request sent for admin approval',
          description: 'An administrator will review this request.',
        });
        onStageChange();
      } else {
        toast({
          title: 'Stage updated',
          description: `Contact moved to ${STAGES.find(s => s.value === newStage)?.label}`,
        });
        onStageChange();
      }
    }

    setIsUpdating(false);
  };

  const currentStageInfo = STAGES.find(s => s.value === currentStage);

  if (readOnly) {
    return (
      <Badge
        className={`h-7 px-2 font-medium text-xs ${STAGE_COLORS[currentStage]}`}
      >
        {currentStageInfo?.label ?? currentStage}
      </Badge>
    );
  }

  // No active primary assignment — show disabled badge with tooltip
  if (hasActivePrimary === false) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            className={`h-7 px-2 font-medium text-xs cursor-not-allowed opacity-60 ${STAGE_COLORS[currentStage]}`}
          >
            {currentStageInfo?.label ?? currentStage}
            <AlertCircle className="ml-1 h-3 w-3" />
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          Assign a Primary Owner to change stage.
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled || isUpdating || hasActivePrimary === null}
          className={`h-7 px-2 font-medium ${STAGE_COLORS[currentStage]}`}
        >
          {isUpdating ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <>
              {currentStageInfo?.label}
              <ChevronDown className="ml-1 h-3 w-3" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {STAGES.map((stage) => (
          <DropdownMenuItem
            key={stage.value}
            onClick={() => handleStageSelect(stage.value)}
            className={currentStage === stage.value ? 'bg-accent' : ''}
          >
            {stage.label}
            {false && (
              <span className="ml-2 text-xs text-muted-foreground">(requires approval)</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
