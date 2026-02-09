import { useState, useEffect } from 'react';
import { format, addDays, setHours, setMinutes } from 'date-fns';
import { CalendarIcon, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import {
  getActiveAssignmentForContact,
  createFollowup,
  FollowupType,
  RecurrenceFrequency,
} from '@/services/followups';

interface AddFollowupModalProps {
  contactId: string;
  contactName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  // Optional: if launched from an interaction row
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
  { value: 'OTHER', label: 'Other' },
];

export function AddFollowupModal({
  contactId,
  contactName,
  isOpen,
  onClose,
  onSuccess,
  sourceInteraction,
}: AddFollowupModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingAssignment, setIsLoadingAssignment] = useState(true);
  const [activeAssignmentId, setActiveAssignmentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [dueTime, setDueTime] = useState('11:00');
  const [followupType, setFollowupType] = useState<FollowupType>('CALL');
  const [followupReason, setFollowupReason] = useState('');
  const [notes, setNotes] = useState('');

  // Recurrence state
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<RecurrenceFrequency>('WEEKLY');
  const [recurrenceInterval, setRecurrenceInterval] = useState(1);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<Date | undefined>(undefined);
  // Check for active assignment when modal opens
  useEffect(() => {
    if (isOpen && contactId) {
      loadActiveAssignment();
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
      setActiveAssignmentId(null);
      setIsRecurring(false);
      setRecurrenceFrequency('WEEKLY');
      setRecurrenceInterval(1);
      setRecurrenceEndDate(undefined);
    }
  }, [isOpen]);

  const loadActiveAssignment = async () => {
    setIsLoadingAssignment(true);
    const result = await getActiveAssignmentForContact(contactId);
    setActiveAssignmentId(result.data?.id || null);
    setIsLoadingAssignment(false);
  };

  const applySuggestions = () => {
    // Auto-suggest based on source interaction
    if (sourceInteraction) {
      const type = sourceInteraction.type;
      const outcome = sourceInteraction.outcome || '';

      let suggestedDays = 3;
      let suggestedTime = '11:00';

      // If interaction type/outcome contains MEETING
      if (type === 'MEETING' || outcome.includes('MEETING')) {
        suggestedDays = 1;
        suggestedTime = '10:30';
      } else if (type === 'CALL' || type === 'WHATSAPP') {
        suggestedDays = 2;
        suggestedTime = '11:00';
      }

      const suggestedDate = addDays(new Date(), suggestedDays);
      setDueDate(suggestedDate);
      setDueTime(suggestedTime);
      setFollowupReason('Follow up on last interaction');
    } else {
      // Default: 3 days from now at 11:00
      setDueDate(addDays(new Date(), 3));
      setDueTime('11:00');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!activeAssignmentId) {
      setError('No active assignment found for this contact. Cannot create follow-up.');
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

    const result = await createFollowup({
      contact_id: contactId,
      assignment_id: activeAssignmentId,
      interaction_id: sourceInteraction?.id || null,
      followup_type: followupType,
      followup_reason: followupReason.trim(),
      notes: notes.trim() || null,
      due_at: dueAt.toISOString(),
      recurrence_enabled: isRecurring,
      recurrence_frequency: isRecurring ? recurrenceFrequency : null,
      recurrence_interval: isRecurring ? recurrenceInterval : null,
      recurrence_end_date: isRecurring && recurrenceEndDate ? recurrenceEndDate.toISOString() : null,
    });

    setIsLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    toast({
      title: isRecurring ? '♻️ Recurring follow-up scheduled' : 'Follow-up scheduled successfully',
      description: isRecurring
        ? `Repeats every ${recurrenceInterval > 1 ? recurrenceInterval + ' ' : ''}${recurrenceFrequency.toLowerCase()}${recurrenceInterval > 1 ? 's' : ''}`
        : `Scheduled for ${format(dueAt, 'MMM d, yyyy h:mm a')}`,
    });

    onSuccess();
    onClose();
  };

  const noAssignmentMessage = !isLoadingAssignment && !activeAssignmentId;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Follow-up</DialogTitle>
          <DialogDescription>
            Schedule a follow-up for {contactName}
          </DialogDescription>
        </DialogHeader>

        {noAssignmentMessage ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No active assignment found for this contact. A contact must be assigned before adding follow-ups.
            </AlertDescription>
          </Alert>
        ) : isLoadingAssignment ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
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

            {/* Recurrence */}
            <div className="border-t pt-4 space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="recurring"
                  checked={isRecurring}
                  onCheckedChange={(checked) => setIsRecurring(checked as boolean)}
                />
                <label htmlFor="recurring" className="text-sm font-medium cursor-pointer flex items-center gap-1.5">
                  <RefreshCw className="h-3.5 w-3.5" />
                  Make this recurring
                </label>
              </div>

              {isRecurring && (
                <div className="pl-6 space-y-3 border-l-2 border-primary/20">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Frequency</Label>
                      <Select value={recurrenceFrequency} onValueChange={(v) => setRecurrenceFrequency(v as RecurrenceFrequency)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DAILY">Daily</SelectItem>
                          <SelectItem value="WEEKLY">Weekly</SelectItem>
                          <SelectItem value="BIWEEKLY">Bi-weekly</SelectItem>
                          <SelectItem value="MONTHLY">Monthly</SelectItem>
                          <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                          <SelectItem value="YEARLY">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Every</Label>
                      <Input
                        type="number"
                        min={1}
                        max={52}
                        value={recurrenceInterval}
                        onChange={(e) => setRecurrenceInterval(parseInt(e.target.value) || 1)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>End Date (optional)</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full justify-start text-left font-normal',
                            !recurrenceEndDate && 'text-muted-foreground'
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {recurrenceEndDate ? format(recurrenceEndDate, 'PPP') : 'No end date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={recurrenceEndDate}
                          onSelect={setRecurrenceEndDate}
                          initialFocus
                          disabled={(date) => date < new Date()}
                        />
                      </PopoverContent>
                    </Popover>
                    <p className="text-xs text-muted-foreground">Leave blank to continue indefinitely</p>
                  </div>

                  <div className="text-sm text-primary bg-primary/5 p-2 rounded flex items-start gap-2">
                    <RefreshCw className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>
                      When you mark this complete, the next follow-up will auto-create{' '}
                      {recurrenceInterval > 1 ? `${recurrenceInterval} ` : ''}
                      {recurrenceFrequency.toLowerCase()}{recurrenceInterval > 1 ? 's' : ''} later.
                    </span>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading || noAssignmentMessage}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Follow-up
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
