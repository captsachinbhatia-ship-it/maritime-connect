import { useState } from 'react';
import { Loader2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { updateStage, AssignmentStage } from '@/services/assignments';
import { createStageRequest } from '@/services/stageRequests';
import { useAuth } from '@/contexts/AuthContext';

interface StageDropdownProps {
  contactId: string;
  currentStage: AssignmentStage;
  onStageChange: () => void;
  disabled?: boolean;
}

const STAGES: { value: AssignmentStage; label: string }[] = [
  { value: 'COLD_CALLING', label: 'Cold Calling' },
  { value: 'ASPIRATION', label: 'Aspiration' },
  { value: 'ACHIEVEMENT', label: 'Achievement' },
  { value: 'INACTIVE', label: 'Inactive' },
];

const STAGE_COLORS: Record<AssignmentStage, string> = {
  COLD_CALLING: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
  ASPIRATION: 'bg-amber-100 text-amber-800 hover:bg-amber-200',
  ACHIEVEMENT: 'bg-green-100 text-green-800 hover:bg-green-200',
  INACTIVE: 'bg-gray-100 text-gray-800 hover:bg-gray-200',
};

export function StageDropdown({ 
  contactId, 
  currentStage, 
  onStageChange,
  disabled = false 
}: StageDropdownProps) {
  const { toast } = useToast();
  const { crmUser } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStageSelect = async (newStage: AssignmentStage) => {
    if (newStage === currentStage) return;

    setIsUpdating(true);

    // INACTIVE requires admin approval - create a request instead of direct update
    if (newStage === 'INACTIVE') {
      if (!crmUser?.id) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'User not authenticated.',
        });
        setIsUpdating(false);
        return;
      }

      const result = await createStageRequest(
        contactId,
        'INACTIVE',
        crmUser.id
      );

      if (result.success) {
        toast({
          title: 'Inactive request sent for admin approval',
          description: 'An administrator will review this request.',
        });
        onStageChange();
      } else {
        toast({
          variant: 'destructive',
          title: 'Failed to submit request',
          description: result.error || 'Unknown error',
        });
      }

      setIsUpdating(false);
      return;
    }

    // Other stages - direct update
    const result = await updateStage({
      contact_id: contactId,
      stage: newStage,
    });

    if (result.error) {
      toast({
        variant: 'destructive',
        title: 'Failed to update stage',
        description: result.error,
      });
    } else {
      toast({
        title: 'Stage updated',
        description: `Contact moved to ${STAGES.find(s => s.value === newStage)?.label}`,
      });
      onStageChange();
    }

    setIsUpdating(false);
  };

  const currentStageInfo = STAGES.find(s => s.value === currentStage);

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
