import { useState } from 'react';
import { Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { createStageRequest } from '@/services/stageRequests';
import { useAuth } from '@/contexts/AuthContext';

type StageType = 'COLD_CALLING' | 'TARGETING' | 'ASPIRATION' | 'ACHIEVEMENT' | 'INACTIVE';

const STAGES: { value: StageType; label: string }[] = [
  { value: 'COLD_CALLING', label: 'Cold Calling' },
  { value: 'TARGETING', label: 'Targeting' },
  { value: 'ASPIRATION', label: 'Aspiration' },
  { value: 'ACHIEVEMENT', label: 'Achievement' },
  { value: 'INACTIVE', label: 'Inactive' },
];

const STAGE_COLORS: Record<string, string> = {
  COLD_CALLING: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  TARGETING: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  ASPIRATION: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
  ACHIEVEMENT: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  INACTIVE: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
};

interface StageRequestModalProps {
  contactId: string;
  contactName: string;
  currentStage: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function StageRequestModal({
  contactId,
  contactName,
  currentStage,
  isOpen,
  onClose,
  onSuccess,
}: StageRequestModalProps) {
  const { toast } = useToast();
  const { crmUser } = useAuth();
  const [requestedStage, setRequestedStage] = useState<StageType | ''>('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availableStages = STAGES.filter(s => s.value !== currentStage);

  const handleSubmit = async () => {
    if (!requestedStage) {
      toast({
        variant: 'destructive',
        title: 'Validation error',
        description: 'Please select a stage.',
      });
      return;
    }

    if (!crmUser?.id) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'User not authenticated.',
      });
      return;
    }

    setIsSubmitting(true);

    const result = await createStageRequest(
      contactId,
      requestedStage,
      crmUser.id,
      note.trim() || undefined
    );

    if (result.success) {
      toast({
        title: 'Request sent for approval',
        description: 'The Primary owner will review your stage move request.',
      });

      setRequestedStage('');
      setNote('');
      onClose();
      onSuccess?.();
    } else {
      toast({
        variant: 'destructive',
        title: 'Failed to submit request',
        description: result.error || 'Unknown error',
      });
    }

    setIsSubmitting(false);
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setRequestedStage('');
      setNote('');
      onClose();
    }
  };

  const currentStageLabel = STAGES.find(s => s.value === currentStage)?.label || currentStage;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request Stage Move</DialogTitle>
          <DialogDescription>
            Request approval to move <strong>{contactName}</strong> to a different stage.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current Stage Display */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <div className="text-sm text-muted-foreground">Current:</div>
            <Badge className={STAGE_COLORS[currentStage] || STAGE_COLORS.INACTIVE}>
              {currentStageLabel}
            </Badge>
            {requestedStage && (
              <>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <Badge className={STAGE_COLORS[requestedStage] || STAGE_COLORS.INACTIVE}>
                  {STAGES.find(s => s.value === requestedStage)?.label || requestedStage}
                </Badge>
              </>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="requested-stage">Requested Stage *</Label>
            <Select
              value={requestedStage}
              onValueChange={(val) => setRequestedStage(val as StageType)}
            >
              <SelectTrigger id="requested-stage">
                <SelectValue placeholder="Select a stage" />
              </SelectTrigger>
              <SelectContent>
                {availableStages.map((stage) => (
                  <SelectItem key={stage.value} value={stage.value}>
                    {stage.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Note (optional)</Label>
            <Textarea
              id="note"
              placeholder="Explain why this contact should be moved..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">
              {note.length}/500 characters
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !requestedStage}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              'Send Request'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
