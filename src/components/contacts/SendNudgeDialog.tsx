import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { CalendarIcon, Send, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface CrmUser {
  id: string;
  full_name: string;
  email: string;
}

interface SendNudgeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string;
  contactName: string;
  onSuccess?: () => void;
}

export function SendNudgeDialog({ open, onOpenChange, contactId, contactName, onSuccess }: SendNudgeDialogProps) {
  const [assignedTo, setAssignedTo] = useState('');
  const [followupType, setFollowupType] = useState('CALL_BACK');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [users, setUsers] = useState<CrmUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    if (open) {
      loadUsers();
    }
  }, [open]);

  async function loadUsers() {
    setLoadingUsers(true);
    const { data } = await supabase
      .from('crm_users')
      .select('id, full_name, email')
      .eq('active', true)
      .order('full_name');

    if (data) setUsers(data);
    setLoadingUsers(false);
  }

  async function handleSendNudge() {
    if (!assignedTo || !reason || !dueDate) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Please fill in all required fields',
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.rpc('create_nudge', {
        p_contact_id: contactId,
        p_followup_type: followupType,
        p_followup_reason: reason,
        p_notes: notes || null,
        p_due_at: dueDate.toISOString(),
        p_assigned_to_crm_user_id: assignedTo,
      });

      if (error) throw error;

      toast({
        title: 'Nudge Sent',
        description: 'Follow-up assigned successfully',
      });

      onOpenChange(false);
      resetForm();
      onSuccess?.();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to Send Nudge',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setAssignedTo('');
    setFollowupType('CALL_BACK');
    setReason('');
    setNotes('');
    setDueDate(undefined);
  }

  function handleClose() {
    resetForm();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Send Follow-up Nudge
          </DialogTitle>
          <DialogDescription>
            Assign follow-up for: <strong>{contactName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Assign To */}
          <div className="space-y-2">
            <Label htmlFor="assignTo">Assign To *</Label>
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger>
                <SelectValue placeholder={loadingUsers ? 'Loading users...' : 'Select user'} />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name} ({user.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Follow-up Type */}
          <div className="space-y-2">
            <Label htmlFor="followupType">Follow-up Type *</Label>
            <Select value={followupType} onValueChange={setFollowupType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CALL_BACK">Call Back</SelectItem>
                <SelectItem value="SEND_INFO">Send Information</SelectItem>
                <SelectItem value="QUOTE_FOLLOWUP">Quote Follow-up</SelectItem>
                <SelectItem value="CHECK_IN">Check In</SelectItem>
                <SelectItem value="SCHEDULE_MEETING">Schedule Meeting</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason *</Label>
            <Textarea
              id="reason"
              placeholder="Why is this follow-up needed?"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              placeholder="Any additional context..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label>Due Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={setDueDate}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSendNudge} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send Nudge
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
