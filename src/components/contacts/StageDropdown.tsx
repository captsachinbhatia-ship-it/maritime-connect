import { useState } from 'react';
import { Loader2, ChevronDown } from 'lucide-react';
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
  { value: 'INACTIVE', label: 'Inactive' },
];

const STAGE_COLORS: Record<AssignmentStage, string> = {
  COLD_CALLING: 'bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300',
  ASPIRATION: 'bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300',
  ACHIEVEMENT: 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300',
  INACTIVE: 'bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-800/50 dark:text-gray-300',
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

  const handleStageSelect = async (newStage: AssignmentStage) => {
    if (newStage === currentStage) return;

    setIsUpdating(true);

    // Call RPC for all stage changes - it handles INACTIVE requests internally
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
      if (result.data.action === 'REQUESTED') {
        // INACTIVE transition created a request for admin approval
        toast({
          title: 'Inactive request sent for admin approval',
          description: 'An administrator will review this request.',
        });
      } else {
        // Direct update succeeded
        toast({
          title: 'Stage updated',
          description: `Contact moved to ${STAGES.find(s => s.value === newStage)?.label}`,
        });
      }
      onStageChange();
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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled || isUpdating}
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
            {stage.value === 'INACTIVE' && currentStage !== 'INACTIVE' && (
              <span className="ml-2 text-xs text-muted-foreground">(requires approval)</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
