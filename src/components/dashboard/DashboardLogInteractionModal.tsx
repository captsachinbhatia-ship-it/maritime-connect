import { useState, useEffect, useCallback } from 'react';
import { Loader2, CalendarIcon, FileText, Search } from 'lucide-react';
import { format } from 'date-fns';
import { useAssignedContacts } from '@/hooks/useAssignedContacts';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { createInteraction, InteractionType } from '@/services/interactions';
import { useCrmUser } from '@/hooks/useCrmUser';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { INTERACTION_TYPE_OPTIONS, OUTCOME_OPTIONS } from '@/lib/interactionConstants';

interface ContactOption {
  id: string;
  full_name: string;
  company_name?: string | null;
}

interface DashboardLogInteractionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function DashboardLogInteractionModal({
  open, onOpenChange, onSuccess,
}: DashboardLogInteractionModalProps) {
  const { crmUserId, loading: crmLoading } = useCrmUser();
  const { isAdmin } = useAuth();

  // Debug guard: warn if CRM user mapping is missing after auth loads
  useEffect(() => {
    if (open && !crmLoading && !crmUserId && !isAdmin) {
      console.warn('[LogInteraction] crmUserId is null after auth loaded');
      toast({ title: 'Warning', description: 'CRM user mapping missing for this login. Contact admin.', variant: 'destructive' });
    }
  }, [open, crmLoading, crmUserId, isAdmin]);

  // Non-admin: reuse the same two-step assignment fetch as My Primary / My Secondary pages
  const { contacts: assignedContacts, loading: assignedLoading } = useAssignedContacts(crmUserId, open && !isAdmin);

  const [adminContacts, setAdminContacts] = useState<ContactOption[]>([]);
  const [adminContactsLoading, setAdminContactsLoading] = useState(false);
  const [selectedContact, setSelectedContact] = useState<ContactOption | null>(null);
  const [contactPopoverOpen, setContactPopoverOpen] = useState(false);

  const [interactionType, setInteractionType] = useState<InteractionType | ''>('');
  const [subject, setSubject] = useState('');
  const [notes, setNotes] = useState('');
  const [outcome, setOutcome] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');

  const [needsFollowup, setNeedsFollowup] = useState(false);
  const [nextAction, setNextAction] = useState('');
  const [dueDate, setDueDate] = useState<Date | undefined>();

  // Admin: fetch all active contacts (existing logic)
  const fetchAdminContacts = useCallback(async () => {
    if (!crmUserId || !isAdmin) return;
    setAdminContactsLoading(true);
    try {
      const { data } = await supabase
        .from('contacts')
        .select('id, full_name, companies(name)')
        .eq('is_active', true)
        .eq('is_deleted', false)
        .order('full_name')
        .limit(500);
      setAdminContacts((data || []).map((c: any) => ({
        id: c.id,
        full_name: c.full_name || 'Unknown',
        company_name: c.companies?.name || null,
      })));
    } catch (err) {
      console.error('Failed to fetch admin contacts:', err);
    } finally {
      setAdminContactsLoading(false);
    }
  }, [crmUserId, isAdmin]);

  useEffect(() => {
    if (open && isAdmin) fetchAdminContacts();
  }, [open, isAdmin, fetchAdminContacts]);

  // Unified contacts list + loading flag
  const contacts: ContactOption[] = isAdmin ? adminContacts : assignedContacts;
  const contactsLoading = isAdmin ? adminContactsLoading : assignedLoading;

  // Debug: log contact count when it changes
  useEffect(() => {
    if (open && !contactsLoading) {
      console.log('[DashboardLogInteraction] contacts ready:', contacts.length, isAdmin ? '(admin)' : '(user)');
    }
  }, [open, contactsLoading, contacts.length, isAdmin]);

  const resetForm = () => {
    setSelectedContact(null);
    setInteractionType('');
    setSubject('');
    setNotes('');
    setOutcome('');
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

    if (!selectedContact) {
      setValidationMessage('Please select a contact.');
      return;
    }
    if (!interactionType) {
      setValidationMessage('Please select an interaction type.');
      return;
    }

    const isNotInterested = outcome === 'NOT_INTERESTED';
    if (!isNotInterested && !subject.trim() && !notes.trim()) {
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

    if (!crmUserId) {
      toast({ title: 'Error', description: 'User session not found.', variant: 'destructive' });
      return;
    }

    // Governance: non-admin must have active assignment
    if (!isAdmin) {
      const { data: assignment } = await supabase
        .from('contact_assignments')
        .select('id')
        .eq('contact_id', selectedContact.id)
        .eq('assigned_to_crm_user_id', crmUserId)
        .eq('status', 'ACTIVE')
        .is('ended_at', null)
        .in('assignment_role', ['PRIMARY', 'SECONDARY'])
        .limit(1);
      
      if (!assignment || assignment.length === 0) {
        toast({
          title: 'Not Allowed',
          description: 'You can only log interactions for contacts assigned to you (Primary/Secondary).',
          variant: 'destructive',
        });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const nextFollowUpAt = needsFollowup && dueDate ? dueDate.toISOString() : null;
      const result = await createInteraction({
        contact_id: selectedContact.id,
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
        return;
      }

      toast({
        title: 'Interaction Logged',
        description: needsFollowup ? 'Interaction logged and follow-up created.' : 'Interaction logged successfully.',
      });

      resetForm();
      onOpenChange(false);
      onSuccess?.();
      window.dispatchEvent(new Event('dashboard:refresh'));
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to log interaction', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Log Interaction</DialogTitle>
          <DialogDescription>Select a contact and record an interaction.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Contact Selector */}
          <div className="space-y-2">
            <Label>Contact <span className="text-destructive">*</span></Label>
            <Popover open={contactPopoverOpen} onOpenChange={setContactPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                  {selectedContact ? (
                    <span className="truncate">
                      {selectedContact.full_name}
                      {selectedContact.company_name && <span className="text-muted-foreground ml-1">({selectedContact.company_name})</span>}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Search contacts...</span>
                  )}
                  <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[400px] p-0 z-[60] bg-popover"
                align="start"
                side="bottom"
                avoidCollisions={false}
              >
                <Command className="flex flex-col" shouldFilter={true}>
                  <CommandInput placeholder="Type to search..." />
                  <CommandList className="max-h-[300px] overflow-y-auto overflow-x-hidden overscroll-contain">
                    <CommandEmpty>
                      {contactsLoading ? 'Loading...' : 'No contacts found.'}
                    </CommandEmpty>
                    <CommandGroup>
                      {contacts.map((c) => (
                        <CommandItem
                          key={c.id}
                          value={`${c.full_name} ${c.company_name || ''}`}
                          onSelect={() => {
                            setSelectedContact(c);
                            setContactPopoverOpen(false);
                          }}
                        >
                          <span className="truncate">{c.full_name}</span>
                          {c.company_name && (
                            <span className="ml-2 text-xs text-muted-foreground truncate">
                              {c.company_name}
                            </span>
                          )}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Interaction Type */}
          <div className="space-y-2">
            <Label>Interaction Type <span className="text-destructive">*</span></Label>
            <Select value={interactionType} onValueChange={(v) => setInteractionType(v as InteractionType)}>
              <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
              <SelectContent>
                {INTERACTION_TYPE_OPTIONS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.icon} {t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label>Subject (optional)</Label>
            <Input value={subject} onChange={(e) => { setSubject(e.target.value); setValidationMessage(''); }} placeholder="e.g., Discussed Q1 rates" maxLength={200} />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes <span className="text-destructive">*</span></Label>
            <Textarea value={notes} onChange={(e) => { setNotes(e.target.value); setValidationMessage(''); }} placeholder="Describe the interaction..." rows={3} maxLength={2000} />
          </div>

          {/* Outcome */}
          <div className="space-y-2">
            <Label>Outcome</Label>
            <Select value={outcome} onValueChange={setOutcome}>
              <SelectTrigger><SelectValue placeholder="Select outcome..." /></SelectTrigger>
              <SelectContent>
                {OUTCOME_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.icon} {o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Follow-up Section */}
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox id="dashboard-followup" checked={needsFollowup} onCheckedChange={(c) => setNeedsFollowup(c as boolean)} />
              <label htmlFor="dashboard-followup" className="text-sm font-medium leading-none cursor-pointer">Set Follow-up Reminder</label>
            </div>
            {needsFollowup && (
              <>
                <div className="space-y-2">
                  <Label>Next Action</Label>
                  <Input value={nextAction} onChange={(e) => { setNextAction(e.target.value); setValidationMessage(''); }} placeholder="e.g., Send rate sheet" maxLength={200} />
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
                      <Calendar mode="single" selected={dueDate} onSelect={setDueDate} disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))} initialFocus className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>
              </>
            )}
          </div>

          {validationMessage && <p className="text-sm text-destructive">{validationMessage}</p>}

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
