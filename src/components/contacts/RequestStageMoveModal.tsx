import { useState } from 'react';
import { Loader2 } from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';

type StageType = 'COLD_CALLING' | 'ASPIRATION' | 'ACHIEVEMENT' | 'INACTIVE';

const STAGES: { value: StageType; label: string }[] = [
  { value: 'COLD_CALLING', label: 'Cold Calling' },
  { value: 'ASPIRATION', label: 'Aspiration' },
  { value: 'ACHIEVEMENT', label: 'Achievement' },
  { value: 'INACTIVE', label: 'Inactive' },
];

interface RequestStageMoveModalProps {
  contactId: string;
  contactName: string;
  currentStage: StageType;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function RequestStageMoveModal({
  contactId,
  contactName,
  currentStage,
  isOpen,
  onClose,
  onSuccess,
}: RequestStageMoveModalProps) {
  const { toast } = useToast();
  const [proposedStage, setProposedStage] = useState<StageType | ''>('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availableStages = STAGES.filter(s => s.value !== currentStage);

  const handleSubmit = async () => {
    if (!proposedStage || !notes.trim()) {
      toast({
        variant: 'destructive',
        title: 'Validation error',
        description: 'Please select a stage and provide notes.',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const proposedStageLabel = STAGES.find(s => s.value === proposedStage)?.label || proposedStage;
      
      // Create an interaction as a stage move request
      const { error } = await supabase
        .from('interactions')
        .insert({
          contact_id: contactId,
          interaction_type: 'NOTE',
          outcome: 'FOLLOW_UP',
          subject: `Stage Move Request: ${proposedStageLabel}`,
          notes: notes.trim(),
          interaction_at: new Date().toISOString(),
        });

      if (error) {
        throw error;
      }

      toast({
        title: 'Request sent',
        description: 'Primary owner will review.',
      });

      // Reset form
      setProposedStage('');
      setNotes('');
      onClose();
      onSuccess?.();
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Failed to submit request',
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setProposedStage('');
      setNotes('');
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request Stage Move</DialogTitle>
          <DialogDescription>
            Request the Primary owner to move <strong>{contactName}</strong> to a different stage.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="proposed-stage">Proposed Stage *</Label>
            <Select
              value={proposedStage}
              onValueChange={(val) => setProposedStage(val as StageType)}
            >
              <SelectTrigger id="proposed-stage">
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
            <Label htmlFor="notes">Notes *</Label>
            <Textarea
              id="notes"
              placeholder="Explain why this contact should be moved..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">
              {notes.length}/500 characters
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !proposedStage || !notes.trim()}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Request'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
