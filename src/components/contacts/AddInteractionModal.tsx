import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { createInteraction, InteractionType } from '@/services/interactions';

const INTERACTION_TYPES: { value: InteractionType; label: string }[] = [
  { value: 'CALL', label: 'Call' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'MEETING', label: 'Meeting' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'NOTE', label: 'Note' },
];

const OUTCOME_OPTIONS = [
  { value: 'NO_RESPONSE', label: 'No Response' },
  { value: 'INTERESTED', label: 'Interested' },
  { value: 'NOT_INTERESTED', label: 'Not Interested' },
  { value: 'FOLLOW_UP', label: 'Follow Up' },
  { value: 'MEETING_SCHEDULED', label: 'Meeting Scheduled' },
  { value: 'DEAL_PROGRESS', label: 'Deal Progress' },
  { value: 'CLOSED_WON', label: 'Closed Won' },
  { value: 'CLOSED_LOST', label: 'Closed Lost' },
];

interface AddInteractionModalProps {
  contactId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddInteractionModal({
  contactId,
  isOpen,
  onClose,
  onSuccess,
}: AddInteractionModalProps) {
  const [interactionType, setInteractionType] = useState<InteractionType | ''>('');
  const [outcome, setOutcome] = useState<string>('');
  const [subject, setSubject] = useState('');
  const [notes, setNotes] = useState('');
  const [interactionAt, setInteractionAt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setInteractionType('');
    setOutcome('');
    setSubject('');
    setNotes('');
    setInteractionAt('');
    setValidationMessage('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const [validationMessage, setValidationMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationMessage('');

    if (!interactionType) {
      toast({
        title: 'Validation Error',
        description: 'Please select an interaction type.',
        variant: 'destructive',
      });
      return;
    }

    // Validation: If outcome is NOT_INTERESTED, subject and notes are optional
    // Otherwise, require at least one of subject or notes
    const isNotInterested = outcome === 'NOT_INTERESTED';
    const hasSubject = subject.trim().length > 0;
    const hasNotes = notes.trim().length > 0;

    if (!isNotInterested && !hasSubject && !hasNotes) {
      setValidationMessage('Please enter a Subject or Notes');
      return;
    }

    setIsSubmitting(true);

    const result = await createInteraction({
      contact_id: contactId,
      interaction_type: interactionType,
      outcome: outcome || null,
      subject: subject.trim() || null,
      notes: notes.trim(),
      interaction_at: interactionAt || new Date().toISOString(),
    });

    setIsSubmitting(false);

    if (result.error) {
      toast({
        title: 'Error',
        description: result.error,
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Success',
      description: 'Interaction added successfully.',
    });

    resetForm();
    onSuccess();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Interaction</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="interaction-type">
              Type <span className="text-destructive">*</span>
            </Label>
            <Select
              value={interactionType}
              onValueChange={(val) => setInteractionType(val as InteractionType)}
            >
              <SelectTrigger id="interaction-type">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {INTERACTION_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="outcome">Outcome</Label>
            <Select value={outcome} onValueChange={setOutcome}>
              <SelectTrigger id="outcome">
                <SelectValue placeholder="Select outcome (optional)" />
              </SelectTrigger>
              <SelectContent>
                {OUTCOME_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value);
                if (validationMessage) setValidationMessage('');
              }}
              placeholder="Optional subject"
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                if (validationMessage) setValidationMessage('');
              }}
              placeholder="Enter interaction notes..."
              rows={4}
              maxLength={2000}
            />
          </div>

          {validationMessage && (
            <p className="text-sm text-muted-foreground">
              {validationMessage}
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="interaction-at">Date & Time</Label>
            <Input
              id="interaction-at"
              type="datetime-local"
              value={interactionAt}
              onChange={(e) => setInteractionAt(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Leave empty to use current time
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Interaction
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
