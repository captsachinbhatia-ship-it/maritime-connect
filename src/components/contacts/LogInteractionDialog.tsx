import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, CalendarIcon, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { createInteraction, InteractionType } from '@/services/interactions';
import { createFollowupTask } from '@/services/teamTasks';
import { useCrmUser } from '@/hooks/useCrmUser';
import { INTERACTION_TYPE_OPTIONS, OUTCOME_OPTIONS } from '@/lib/interactionConstants';

interface LogInteractionDialogProps {
  contactId: string;
  contactName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function LogInteractionDialog({
  contactId,
  contactName,
  open,
  onOpenChange,
  onSuccess,
}: LogInteractionDialogProps) {
  const navigate = useNavigate();
  const { crmUserId } = useCrmUser();

  // Core interaction fields
  const [interactionType, setInteractionType] = useState<InteractionType | ''>('');
  const [subject, setSubject] = useState('');
  const [notes, setNotes] = useState('');
  const [outcome, setOutcome] = useState('');
  const [duration, setDuration] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');

  // Follow-up
  const [needsFollowup, setNeedsFollowup] = useState(false);
  const [nextAction, setNextAction] = useState('');
  const [dueDate, setDueDate] = useState<Date | undefined>();

  const resetForm = () => {
    setInteractionType('');
    setSubject('');
    setNotes('');
    setOutcome('');
    setDuration('');
    setNeedsFollowup(false);
    setNextAction('');
    setDueDate(undefined);
    setValidationMessage('');
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationMessage('');

    if (!interactionType) {
      toast({ title: 'Missing Required Fields', description: 'Please select an interaction type.', variant: 'destructive' });
      return;
    }

    const isNotInterested = outcome === 'NOT_INTERESTED';
    const hasSubject = subject.trim().length > 0;
    const hasNotes = notes.trim().length > 0;

    if (!isNotInterested && !hasSubject && !hasNotes) {
      setValidationMessage('Please enter a Subject or Notes.');
      return;
    }

    if (needsFollowup && !nextAction.trim()) {
      setValidationMessage('Please enter a next action for the follow-up.');
      return;
    }

    if (needsFollowup && !dueDate) {
      setValidationMessage('Please select a due date for the follow-up.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (!crmUserId) {
        toast({ title: 'Error', description: 'User session not found. Please log in again.', variant: 'destructive' });
        setIsSubmitting(false);
        return;
      }

      // Build next_follow_up_at if follow-up requested
      const nextFollowUpAt = needsFollowup && dueDate ? dueDate.toISOString() : null;

      // Single insert into contact_interactions (V2)
      const result = await createInteraction({
        contact_id: contactId,
        user_id: crmUserId,
        interaction_type: interactionType,
        outcome: outcome || null,
        subject: subject.trim() || null,
        notes: notes.trim(),
        interaction_at: new Date().toISOString(),
        next_follow_up_at: nextFollowUpAt,
      });

      if (result.error) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
        setIsSubmitting(false);
        return;
      }

      // Create follow-up task in tasks table with related_contact_id
      if (needsFollowup && dueDate) {
        const followupTitle = nextAction.trim() || `Follow up: ${interactionType} with ${contactName}`;
        const taskResult = await createFollowupTask({
          title: followupTitle,
          notes: notes.trim() || null,
          due_at: dueDate.toISOString(),
          crmUserId,
          related_contact_id: contactId,
        });
        if (taskResult.error) {
          console.error('[Follow-up task creation failed]', taskResult.error);
          // Don't block — interaction was already logged
        }
      }

      toast({
        title: 'Interaction Logged',
        description: needsFollowup
          ? 'Interaction logged and follow-up task created.'
          : 'Interaction logged successfully.',
      });

      resetForm();
      onOpenChange(false);
      onSuccess?.();
      // Signal dashboard widgets to refresh
      window.dispatchEvent(new Event('dashboard:refresh'));
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to log interaction', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const showDuration = interactionType === 'CALL' || interactionType === 'MEETING';

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Log Interaction — {contactName}</DialogTitle>
          <DialogDescription>Record a contact interaction with optional follow-up.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Interaction Type */}
          <div className="space-y-2">
            <Label>Interaction Type <span className="text-destructive">*</span></Label>
            <Select value={interactionType} onValueChange={(val) => setInteractionType(val as InteractionType)}>
              <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
              <SelectContent>
                {INTERACTION_TYPE_OPTIONS.map((type) => (
                  <SelectItem key={type.value} value={type.value}>{type.icon} {type.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label>Subject (optional)</Label>
            <Input
              value={subject}
              onChange={(e) => { setSubject(e.target.value); if (validationMessage) setValidationMessage(''); }}
              placeholder="e.g., Discussed Q1 rates"
              maxLength={200}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes <span className="text-destructive">*</span></Label>
            <Textarea
              value={notes}
              onChange={(e) => { setNotes(e.target.value); if (validationMessage) setValidationMessage(''); }}
              placeholder="Describe the interaction..."
              rows={3}
              maxLength={2000}
            />
          </div>

          {/* Outcome */}
          <div className="space-y-2">
            <Label>Outcome</Label>
            <Select value={outcome} onValueChange={setOutcome}>
              <SelectTrigger><SelectValue placeholder="Select outcome..." /></SelectTrigger>
              <SelectContent>
                {OUTCOME_OPTIONS.map((out) => (
                  <SelectItem key={out.value} value={out.value}>{out.icon} {out.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Duration */}
          {showDuration && (
            <div className="space-y-2">
              <Label>Duration (minutes)</Label>
              <Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="e.g., 15" min="0" max="480" />
            </div>
          )}

          {/* Follow-up Section */}
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox id="followup-check" checked={needsFollowup} onCheckedChange={(checked) => setNeedsFollowup(checked as boolean)} />
              <label htmlFor="followup-check" className="text-sm font-medium leading-none cursor-pointer">Set Follow-up Reminder</label>
            </div>
            {needsFollowup && (
              <>
                <div className="space-y-2">
                  <Label>Next Action</Label>
                  <Input value={nextAction} onChange={(e) => { setNextAction(e.target.value); if (validationMessage) setValidationMessage(''); }} placeholder="e.g., Send rate sheet" maxLength={200} />
                </div>
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !dueDate && 'text-muted-foreground')}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dueDate ? format(dueDate, 'PPP') : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={dueDate} onSelect={setDueDate} disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))} initialFocus className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>
              </>
            )}
          </div>

          {/* Enquiry link — directs to Enquiry tab */}
          <div className="rounded-lg border border-dashed p-3 flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="h-4 w-4 shrink-0" />
            <span>Need to create an enquiry?</span>
            <Button
              type="button"
              variant="link"
              size="sm"
              className="h-auto p-0 text-primary"
              onClick={() => navigate('/enquiries')}
            >
              Go to Enquiries →
            </Button>
          </div>

          {/* Validation message */}
          {validationMessage && <p className="text-sm text-destructive">{validationMessage}</p>}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Log It →
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
