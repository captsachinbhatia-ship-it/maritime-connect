import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, CalendarIcon, FileText, Link2, Plus } from 'lucide-react';
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
import { createFollowup, getActiveAssignmentForContact, FollowupType } from '@/services/followups';
import {
  createEnquiry,
  createEnquiryQuote,
  fetchEnquiriesForContact,
  EnquiryPriority,
} from '@/services/enquiries';
import { getCurrentCrmUserId } from '@/services/profiles';

const INTERACTION_TYPES: { value: InteractionType; label: string; icon: string }[] = [
  { value: 'CALL', label: 'Call', icon: '📞' },
  { value: 'EMAIL', label: 'Email', icon: '✉️' },
  { value: 'WHATSAPP', label: 'WhatsApp', icon: '💬' },
  { value: 'MEETING', label: 'Meeting', icon: '🤝' },
  { value: 'NOTE', label: 'Note', icon: '📝' },
];

const OUTCOME_OPTIONS = [
  { value: 'INTERESTED', label: 'Positive', icon: '✅' },
  { value: 'NO_RESPONSE', label: 'No Response', icon: '🔇' },
  { value: 'NOT_INTERESTED', label: 'Not Interested', icon: '❌' },
  { value: 'FOLLOW_UP', label: 'Follow-up Needed', icon: '🔔' },
  { value: 'MEETING_SCHEDULED', label: 'Meeting Scheduled', icon: '📅' },
  { value: 'DEAL_PROGRESS', label: 'Deal Progress', icon: '📈' },
  { value: 'CLOSED_WON', label: 'Closed Won', icon: '🎉' },
  { value: 'CLOSED_LOST', label: 'Closed Lost', icon: '📉' },
];

const INTERACTION_TO_FOLLOWUP: Record<string, FollowupType> = {
  CALL: 'CALL',
  EMAIL: 'EMAIL',
  WHATSAPP: 'WHATSAPP',
  MEETING: 'MEETING',
  NOTE: 'OTHER',
};

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

  // Enquiry & Offer section
  const [showEnquirySection, setShowEnquirySection] = useState(false);
  const [enquiryAction, setEnquiryAction] = useState<'new' | 'link'>('new');
  const [existingEnquiries, setExistingEnquiries] = useState<{ id: string; enquiry_number: string; subject: string | null }[]>([]);
  const [selectedEnquiryId, setSelectedEnquiryId] = useState('');

  // New enquiry fields
  const [enqType, setEnqType] = useState('GENERAL');
  const [enqSubject, setEnqSubject] = useState('');
  const [enqDescription, setEnqDescription] = useState('');
  const [enqPriority, setEnqPriority] = useState<EnquiryPriority>('MEDIUM');
  const [enqEstValue, setEnqEstValue] = useState('');
  const [enqVesselType, setEnqVesselType] = useState('');
  const [enqCargoType, setEnqCargoType] = useState('');
  const [enqLoadPort, setEnqLoadPort] = useState('');
  const [enqDischPort, setEnqDischPort] = useState('');
  const [enqLaycanFrom, setEnqLaycanFrom] = useState('');
  const [enqLaycanTo, setEnqLaycanTo] = useState('');

  // Quote fields (when sending offer)
  const [sendOffer, setSendOffer] = useState(false);
  const [sentVia, setSentVia] = useState('EMAIL');
  const [sentMessage, setSentMessage] = useState('');
  const [quoteRate, setQuoteRate] = useState('');
  const [quoteTotalAmount, setQuoteTotalAmount] = useState('');
  const [quoteCurrency, setQuoteCurrency] = useState('USD');

  // Load existing enquiries when section opens
  useEffect(() => {
    if (showEnquirySection && enquiryAction === 'link') {
      fetchEnquiriesForContact(contactId).then(result => {
        setExistingEnquiries(result.data || []);
      });
    }
  }, [showEnquirySection, enquiryAction, contactId]);

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
    setShowEnquirySection(false);
    setEnquiryAction('new');
    setSelectedEnquiryId('');
    setEnqType('GENERAL');
    setEnqSubject('');
    setEnqDescription('');
    setEnqPriority('MEDIUM');
    setEnqEstValue('');
    setEnqVesselType('');
    setEnqCargoType('');
    setEnqLoadPort('');
    setEnqDischPort('');
    setEnqLaycanFrom('');
    setEnqLaycanTo('');
    setSendOffer(false);
    setSentVia('EMAIL');
    setSentMessage('');
    setQuoteRate('');
    setQuoteTotalAmount('');
    setQuoteCurrency('USD');
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

    if (showEnquirySection && enquiryAction === 'new' && !enqSubject.trim()) {
      setValidationMessage('Please enter a subject for the new enquiry.');
      return;
    }

    if (showEnquirySection && enquiryAction === 'link' && !selectedEnquiryId) {
      setValidationMessage('Please select an existing enquiry to link.');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Log the interaction
      const result = await createInteraction({
        contact_id: contactId,
        interaction_type: interactionType,
        outcome: outcome || null,
        subject: subject.trim() || null,
        notes: notes.trim(),
        interaction_at: new Date().toISOString(),
      });

      if (result.error) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
        setIsSubmitting(false);
        return;
      }

      // 2. Follow-up
      if (needsFollowup && nextAction.trim() && dueDate) {
        const assignmentResult = await getActiveAssignmentForContact(contactId);
        const assignmentId = assignmentResult.data?.id;

        if (assignmentId) {
          await createFollowup({
            contact_id: contactId,
            assignment_id: assignmentId,
            followup_type: INTERACTION_TO_FOLLOWUP[interactionType] || 'OTHER',
            followup_reason: nextAction.trim(),
            notes: `Follow-up from ${interactionType.toLowerCase()}: ${subject || notes.substring(0, 100)}`,
            due_at: dueDate.toISOString(),
          });
        }
      }

      // 3. Enquiry & Quote
      let enquiryId: string | null = null;

      if (showEnquirySection) {
        const { data: crmUserId } = await getCurrentCrmUserId();

        if (enquiryAction === 'new') {
          const enqResult = await createEnquiry({
            contact_id: contactId,
            enquiry_type: enqType,
            subject: enqSubject.trim(),
            description: enqDescription.trim() || undefined,
            priority: enqPriority,
            estimated_value: enqEstValue ? parseFloat(enqEstValue) : undefined,
            vessel_type: enqVesselType || undefined,
            cargo_type: enqCargoType || undefined,
            loading_port: enqLoadPort || undefined,
            discharge_port: enqDischPort || undefined,
            laycan_from: enqLaycanFrom || undefined,
            laycan_to: enqLaycanTo || undefined,
          });

          if (enqResult.error) {
            toast({ title: 'Enquiry Error', description: enqResult.error, variant: 'destructive' });
          } else {
            enquiryId = enqResult.data?.id || null;
          }
        } else {
          enquiryId = selectedEnquiryId;
        }

        // Send quote/offer if enabled
        if (sendOffer && enquiryId && crmUserId) {
          const quoteResult = await createEnquiryQuote(
            {
              enquiry_id: enquiryId,
              status: 'SENT',
              rate: quoteRate ? parseFloat(quoteRate) : null,
              total_amount: quoteTotalAmount ? parseFloat(quoteTotalAmount) : null,
              currency: quoteCurrency,
              sent_via: sentVia,
              sent_message: sentMessage || null,
            },
            crmUserId,
            contactId
          );

          if (quoteResult.error) {
            toast({ title: 'Quote Error', description: quoteResult.error, variant: 'destructive' });
          }
        }
      }

      toast({
        title: 'Interaction Logged',
        description: enquiryId
          ? 'Interaction logged with enquiry. Redirecting...'
          : needsFollowup
            ? 'Interaction logged and follow-up created.'
            : 'Interaction logged successfully.',
      });

      resetForm();
      onOpenChange(false);
      onSuccess?.();

      // Navigate to enquiry if one was created/linked
      if (enquiryId) {
        navigate(`/enquiries/${enquiryId}`);
      }
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
          <DialogDescription>Record a contact interaction with optional follow-up and enquiry.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Interaction Type */}
          <div className="space-y-2">
            <Label>Interaction Type <span className="text-destructive">*</span></Label>
            <Select value={interactionType} onValueChange={(val) => setInteractionType(val as InteractionType)}>
              <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
              <SelectContent>
                {INTERACTION_TYPES.map((type) => (
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

          {/* Enquiry & Offer Section */}
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox id="enquiry-check" checked={showEnquirySection} onCheckedChange={(checked) => setShowEnquirySection(checked as boolean)} />
              <label htmlFor="enquiry-check" className="text-sm font-medium leading-none cursor-pointer flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                Enquiry & Offer
              </label>
            </div>

            {showEnquirySection && (
              <div className="space-y-4 pl-2 border-l-2 border-primary/20">
                {/* New vs Link */}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={enquiryAction === 'new' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setEnquiryAction('new')}
                    className="gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" /> New Enquiry
                  </Button>
                  <Button
                    type="button"
                    variant={enquiryAction === 'link' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setEnquiryAction('link')}
                    className="gap-1"
                  >
                    <Link2 className="h-3.5 w-3.5" /> Link Existing
                  </Button>
                </div>

                {enquiryAction === 'new' ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Type</Label>
                        <Select value={enqType} onValueChange={setEnqType}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="GENERAL">General</SelectItem>
                            <SelectItem value="CARGO">Cargo</SelectItem>
                            <SelectItem value="VESSEL">Vessel</SelectItem>
                            <SelectItem value="CHARTERING">Chartering</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Priority</Label>
                        <Select value={enqPriority} onValueChange={(v) => setEnqPriority(v as EnquiryPriority)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="LOW">Low</SelectItem>
                            <SelectItem value="MEDIUM">Medium</SelectItem>
                            <SelectItem value="HIGH">High</SelectItem>
                            <SelectItem value="URGENT">Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Subject *</Label>
                      <Input value={enqSubject} onChange={(e) => setEnqSubject(e.target.value)} placeholder="Enquiry subject" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Description</Label>
                      <Textarea value={enqDescription} onChange={(e) => setEnqDescription(e.target.value)} rows={2} placeholder="Details..." />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Vessel Type</Label>
                        <Input value={enqVesselType} onChange={(e) => setEnqVesselType(e.target.value)} placeholder="e.g., Bulk Carrier" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Cargo Type</Label>
                        <Input value={enqCargoType} onChange={(e) => setEnqCargoType(e.target.value)} placeholder="e.g., Coal" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Loading Port</Label>
                        <Input value={enqLoadPort} onChange={(e) => setEnqLoadPort(e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Discharge Port</Label>
                        <Input value={enqDischPort} onChange={(e) => setEnqDischPort(e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Laycan From</Label>
                        <Input type="date" value={enqLaycanFrom} onChange={(e) => setEnqLaycanFrom(e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Laycan To</Label>
                        <Input type="date" value={enqLaycanTo} onChange={(e) => setEnqLaycanTo(e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Estimated Value</Label>
                        <Input type="number" value={enqEstValue} onChange={(e) => setEnqEstValue(e.target.value)} placeholder="0.00" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label className="text-xs">Select Enquiry</Label>
                    <Select value={selectedEnquiryId} onValueChange={setSelectedEnquiryId}>
                      <SelectTrigger><SelectValue placeholder="Choose an enquiry..." /></SelectTrigger>
                      <SelectContent>
                        {existingEnquiries.length === 0 ? (
                          <SelectItem value="__none" disabled>No enquiries for this contact</SelectItem>
                        ) : (
                          existingEnquiries.map(enq => (
                            <SelectItem key={enq.id} value={enq.id}>
                              {enq.enquiry_number} — {enq.subject || 'No subject'}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Send Offer / Quote toggle */}
                <div className="border-t pt-3 space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="send-offer" checked={sendOffer} onCheckedChange={(c) => setSendOffer(c as boolean)} />
                    <label htmlFor="send-offer" className="text-sm font-medium cursor-pointer">
                      Send Offer / Quote
                    </label>
                  </div>

                  {sendOffer && (
                    <div className="space-y-3 pl-2">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Sent Via</Label>
                          <Select value={sentVia} onValueChange={setSentVia}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="EMAIL">Email</SelectItem>
                              <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                              <SelectItem value="PHONE">Phone</SelectItem>
                              <SelectItem value="OTHER">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Currency</Label>
                          <Select value={quoteCurrency} onValueChange={setQuoteCurrency}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="USD">USD</SelectItem>
                              <SelectItem value="EUR">EUR</SelectItem>
                              <SelectItem value="GBP">GBP</SelectItem>
                              <SelectItem value="AED">AED</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Rate</Label>
                          <Input type="number" value={quoteRate} onChange={(e) => setQuoteRate(e.target.value)} placeholder="0.00" step="0.01" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Total Amount</Label>
                          <Input type="number" value={quoteTotalAmount} onChange={(e) => setQuoteTotalAmount(e.target.value)} placeholder="0.00" step="0.01" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Message</Label>
                        <Textarea value={sentMessage} onChange={(e) => setSentMessage(e.target.value)} rows={2} placeholder="Message sent with the quote..." />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
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
