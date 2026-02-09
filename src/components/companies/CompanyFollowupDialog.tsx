import { useState } from 'react';
import { format, addDays, setHours, setMinutes } from 'date-fns';
import { CalendarIcon, Loader2, AlertCircle, RefreshCw, CalendarClock } from 'lucide-react';
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
import { supabase } from '@/lib/supabaseClient';
import { RecurrenceFrequency } from '@/services/followups';

interface CompanyFollowupDialogProps {
  companyId: string;
  companyName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const FOLLOWUP_TYPES = [
  { value: 'FIND_CONTACT', label: 'Find Contact' },
  { value: 'CALL', label: 'Call Back' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'MEETING', label: 'Schedule Meeting' },
  { value: 'OTHER', label: 'General Reminder' },
];

export function CompanyFollowupDialog({
  companyId,
  companyName,
  open,
  onOpenChange,
  onSuccess,
}: CompanyFollowupDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [followupType, setFollowupType] = useState('FIND_CONTACT');
  const [nextAction, setNextAction] = useState('');
  const [notes, setNotes] = useState('');
  const [dueDate, setDueDate] = useState<Date | undefined>(addDays(new Date(), 3));
  const [dueTime, setDueTime] = useState('11:00');

  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<RecurrenceFrequency>('WEEKLY');
  const [recurrenceInterval, setRecurrenceInterval] = useState(1);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<Date | undefined>(undefined);

  const resetForm = () => {
    setFollowupType('FIND_CONTACT');
    setNextAction('');
    setNotes('');
    setDueDate(addDays(new Date(), 3));
    setDueTime('11:00');
    setIsRecurring(false);
    setRecurrenceFrequency('WEEKLY');
    setRecurrenceInterval(1);
    setRecurrenceEndDate(undefined);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!nextAction.trim()) {
      setError('Next Action is required. Please specify what needs to be done.');
      return;
    }

    if (!dueDate) {
      setError('Please select a due date.');
      return;
    }

    const [hours, minutes] = dueTime.split(':').map(Number);
    const dueAt = setMinutes(setHours(dueDate, hours), minutes);

    setIsLoading(true);

    try {
      // Try inserting into company_followups first
      const insertPayload: Record<string, unknown> = {
        company_id: companyId,
        followup_type: followupType,
        followup_reason: nextAction.trim(),
        notes: notes.trim() || null,
        due_at: dueAt.toISOString(),
        status: 'OPEN',
      };

      if (isRecurring) {
        insertPayload.recurrence_enabled = true;
        insertPayload.recurrence_frequency = recurrenceFrequency;
        insertPayload.recurrence_interval = recurrenceInterval;
        insertPayload.recurrence_end_date = recurrenceEndDate ? recurrenceEndDate.toISOString() : null;
        insertPayload.recurrence_count = 0;
      }

      const { error: insertError } = await supabase
        .from('company_followups')
        .insert(insertPayload);

      if (insertError) {
        // If table doesn't exist, fall back to storing as activity note
        if (insertError.message.includes('does not exist') || insertError.code === '42P01') {
          setError('Company follow-ups table not available. Please contact your administrator.');
          setIsLoading(false);
          return;
        }
        if (insertError.message.includes('row-level security')) {
          setError('Permission denied by security policy.');
          setIsLoading(false);
          return;
        }
        throw insertError;
      }

      toast({
        title: isRecurring ? '♻️ Recurring Reminder Set' : 'Reminder Created',
        description: isRecurring
          ? `Repeats every ${recurrenceInterval > 1 ? recurrenceInterval + ' ' : ''}${recurrenceFrequency.toLowerCase()}${recurrenceInterval > 1 ? 's' : ''}`
          : `Reminder set for ${companyName} on ${format(dueAt, 'MMM d, yyyy h:mm a')}`,
      });

      resetForm();
      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create reminder');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" />
            Set Reminder
          </DialogTitle>
          <DialogDescription>
            Schedule a reminder for {companyName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Type */}
          <div className="space-y-2">
            <Label>Type *</Label>
            <Select value={followupType} onValueChange={setFollowupType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FOLLOWUP_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Next Action */}
          <div className="space-y-2">
            <Label htmlFor="company-next-action">Next Action *</Label>
            <Input
              id="company-next-action"
              value={nextAction}
              onChange={(e) => setNextAction(e.target.value)}
              placeholder="e.g., Find decision maker for this company"
              required
              maxLength={255}
            />
            <p className="text-xs text-muted-foreground">What specific action needs to be taken?</p>
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label>Due Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn('w-full justify-start text-left font-normal', !dueDate && 'text-muted-foreground')}
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
            <Label htmlFor="company-due-time">Due Time *</Label>
            <Input
              id="company-due-time"
              type="time"
              value={dueTime}
              onChange={(e) => setDueTime(e.target.value)}
              required
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="company-notes">Notes (optional)</Label>
            <Textarea
              id="company-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional context..."
              rows={2}
              maxLength={1000}
            />
          </div>

          {/* Recurrence */}
          <div className="border-t pt-4 space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="company-recurring"
                checked={isRecurring}
                onCheckedChange={(checked) => setIsRecurring(checked as boolean)}
              />
              <label htmlFor="company-recurring" className="text-sm font-medium cursor-pointer flex items-center gap-1.5">
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
                      <SelectTrigger><SelectValue /></SelectTrigger>
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
                        className={cn('w-full justify-start text-left font-normal', !recurrenceEndDate && 'text-muted-foreground')}
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
                </div>

                <div className="text-sm text-primary bg-primary/5 p-2 rounded flex items-start gap-2">
                  <RefreshCw className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>Auto-repeats when marked complete.</span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { resetForm(); onOpenChange(false); }}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Reminder
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
