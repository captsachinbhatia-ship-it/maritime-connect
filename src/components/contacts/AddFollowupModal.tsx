import { useState, useEffect } from 'react';
import { format, addDays, setHours, setMinutes } from 'date-fns';
import { CalendarIcon, Loader2, AlertCircle } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { useCrmUser } from '@/hooks/useCrmUser';
import { createInteraction, InteractionType } from '@/services/interactions';

type FollowupType = 'CALL' | 'EMAIL' | 'MEETING' | 'WHATSAPP' | 'NOTE';

interface AddFollowupModalProps {
  contactId: string;
  contactName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  sourceInteraction?: {
    id: string;
    type: string;
    outcome: string | null;
  } | null;
}

const FOLLOWUP_TYPES: { value: FollowupType; label: string }[] = [
  { value: 'CALL', label: 'Call' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'MEETING', label: 'Meeting' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'NOTE', label: 'Other' },
];

export function AddFollowupModal({
  contactId,
  contactName,
  isOpen,
  onClose,
  onSuccess,
  sourceInteraction,
}: AddFollowupModalProps) {
  const { crmUserId } = useCrmUser();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [dueTime, setDueTime] = useState('11:00');
  const [followupType, setFollowupType] = useState<FollowupType>('CALL');
  const [followupReason, setFollowupReason] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen && contactId) {
      applySuggestions();
    }
  }, [isOpen, contactId, sourceInteraction]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setDueDate(undefined);
      setDueTime('11:00');
      setFollowupType('CALL');
      setFollowupReason('');
      setNotes('');
      setError(null);
    }
  }, [isOpen]);

  const applySuggestions = () => {
    if (sourceInteraction) {
      const type = sourceInteraction.type;
      const outcome = sourceInteraction.outcome || '';
      let suggestedDays = 3;
      let suggestedTime = '11:00';
      if (type === 'MEETING' || outcome.includes('MEETING')) {
        suggestedDays = 1;
        suggestedTime = '10:30';
      } else if (type === 'CALL' || type === 'WHATSAPP') {
        suggestedDays = 2;
        suggestedTime = '11:00';
      }
      setDueDate(addDays(new Date(), suggestedDays));
      setDueTime(suggestedTime);
      setFollowupReason('Follow up on last interaction');
    } else {
      setDueDate(addDays(new Date(), 3));
      setDueTime('11:00');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!crmUserId) {
      setError('User session not found. Please log in again.');
      return;
    }

    if (!dueDate) {
      setError('Please select a due date.');
      return;
    }

    if (!followupReason.trim()) {
      setError('Next Action is required. Please specify what needs to be done.');
      return;
    }

    // Combine date and time
    const [hours, minutes] = dueTime.split(':').map(Number);
    const dueAt = setMinutes(setHours(dueDate, hours), minutes);

    setIsLoading(true);

    // V2: Insert into contact_interactions with next_follow_up_at
    const result = await createInteraction({
      contact_id: contactId,
      user_id: crmUserId,
      interaction_type: followupType as InteractionType,
      outcome: null,
      subject: `[FOLLOWUP] ${followupReason.trim()}`,
      notes: notes.trim() || followupReason.trim(),
      interaction_at: new Date().toISOString(),
      next_follow_up_at: dueAt.toISOString(),
    });

    setIsLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    toast({
      title: 'Follow-up scheduled',
      description: `Scheduled for ${format(dueAt, 'MMM d, yyyy h:mm a')}`,
    });

    onSuccess();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Follow-up</DialogTitle>
          <DialogDescription>
            Schedule a follow-up for {contactName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Due Date */}
          <div className="space-y-2">
            <Label>Due Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !dueDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, 'PPP') : 'Select date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={setDueDate}
                  initialFocus
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Due Time */}
          <div className="space-y-2">
            <Label htmlFor="due-time">Due Time *</Label>
            <Input
              id="due-time"
              type="time"
              value={dueTime}
              onChange={(e) => setDueTime(e.target.value)}
              required
            />
          </div>

          {/* Follow-up Type */}
          <div className="space-y-2">
            <Label>Type *</Label>
            <Select value={followupType} onValueChange={(v) => setFollowupType(v as FollowupType)}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {FOLLOWUP_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Next Action (mandatory) */}
          <div className="space-y-2">
            <Label htmlFor="reason">Next Action *</Label>
            <Input
              id="reason"
              value={followupReason}
              onChange={(e) => setFollowupReason(e.target.value)}
              placeholder="e.g., Send rate sheet, Call back for pricing"
              required
              maxLength={255}
            />
            <p className="text-xs text-muted-foreground">What specific action needs to be taken?</p>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes..."
              rows={3}
              maxLength={1000}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Follow-up
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
