import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  Loader2,
  ArrowLeft,
  Save,
  Send,
  Check,
  X,
  MessageSquarePlus,
  FileText,
  Clock,
  User,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import {
  fetchEnquiryDetail,
  fetchEnquiryQuotes,
  fetchEnquiryActivities,
  updateEnquiry,
  updateQuoteStatus,
  addEnquiryNote,
  EnquiryDetail,
  EnquiryQuote,
  EnquiryActivity,
  EnquiryStatus,
  EnquiryPriority,
  QuoteStatus,
} from '@/services/enquiries';
import { getCurrentCrmUserId } from '@/services/profiles';
import { useAuth } from '@/contexts/AuthContext';
import { CreateQuoteModal } from '@/components/enquiries/CreateQuoteModal';

const STATUS_COLORS: Record<string, string> = {
  NEW: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  IN_PROGRESS: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
  QUOTED: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  NEGOTIATING: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  WON: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  LOST: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  CANCELLED: 'bg-muted text-muted-foreground',
  ON_HOLD: 'bg-muted text-muted-foreground',
};

const QUOTE_STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-muted text-muted-foreground',
  SENT: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  ACCEPTED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  EXPIRED: 'bg-muted text-muted-foreground',
  REVISED: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
};

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  NOTE_ADDED: <MessageSquarePlus className="h-4 w-4" />,
  STATUS_CHANGED: <Clock className="h-4 w-4" />,
  QUOTE_SENT: <Send className="h-4 w-4" />,
  QUOTE_ACCEPTED: <Check className="h-4 w-4" />,
  QUOTE_REJECTED: <X className="h-4 w-4" />,
  CREATED: <FileText className="h-4 w-4" />,
};

export default function EnquiryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const [loading, setLoading] = useState(true);
  const [enquiry, setEnquiry] = useState<EnquiryDetail | null>(null);
  const [quotes, setQuotes] = useState<EnquiryQuote[]>([]);
  const [activities, setActivities] = useState<EnquiryActivity[]>([]);
  const [crmUserId, setCrmUserId] = useState<string | null>(null);
  const [readOnly, setReadOnly] = useState(false);
  const [saving, setSaving] = useState(false);

  // Editable fields
  const [formData, setFormData] = useState<Partial<EnquiryDetail>>({});

  // Quote modal
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);

  // Rejection reason dialog
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingQuoteId, setRejectingQuoteId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Note
  const [noteText, setNoteText] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  useEffect(() => {
    getCurrentCrmUserId().then(r => setCrmUserId(r.data));
  }, []);

  const loadAll = useCallback(async () => {
    if (!id) return;
    setLoading(true);

    const [detailResult, quotesResult, activitiesResult] = await Promise.all([
      fetchEnquiryDetail(id),
      fetchEnquiryQuotes(id),
      fetchEnquiryActivities(id),
    ]);

    if (detailResult.error) {
      toast({
        title: 'Access Denied',
        description: 'You can see this in the feed. To work it, add an offer/quote or ask admin.',
        variant: 'destructive',
      });
      setReadOnly(true);
    } else if (detailResult.data) {
      setEnquiry(detailResult.data);
      setFormData(detailResult.data);
    } else {
      toast({ title: 'Not Found', description: 'Enquiry not found.', variant: 'destructive' });
      navigate('/enquiries');
      return;
    }

    setQuotes(quotesResult.data || []);
    setActivities(activitiesResult.data || []);
    setLoading(false);
  }, [id, navigate]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleSave = async () => {
    if (!id || readOnly) return;
    setSaving(true);

    const result = await updateEnquiry(id, formData);
    setSaving(false);

    if (result.error) {
      if (result.error.includes('access policy')) {
        setReadOnly(true);
      }
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    } else {
      toast({ title: 'Saved', description: 'Enquiry updated.' });
      loadAll();
    }
  };

  const handleQuoteAction = async (quoteId: string, action: 'SENT' | 'ACCEPTED' | 'REJECTED') => {
    if (action === 'REJECTED') {
      setRejectingQuoteId(quoteId);
      setRejectDialogOpen(true);
      return;
    }

    const result = await updateQuoteStatus(quoteId, action as QuoteStatus, {
      sent_by_crm_user_id: crmUserId || undefined,
    });

    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    } else {
      toast({ title: `Quote ${action.toLowerCase()}` });
      loadAll();
    }
  };

  const confirmReject = async () => {
    if (!rejectingQuoteId || !rejectionReason.trim()) {
      toast({ title: 'Rejection reason required', variant: 'destructive' });
      return;
    }

    const result = await updateQuoteStatus(rejectingQuoteId, 'REJECTED', {
      rejection_reason: rejectionReason.trim(),
    });

    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    } else {
      toast({ title: 'Quote Rejected' });
      setRejectDialogOpen(false);
      setRejectingQuoteId(null);
      setRejectionReason('');
      loadAll();
    }
  };

  const handleAddNote = async () => {
    if (!id || !crmUserId || !noteText.trim()) return;
    setAddingNote(true);

    const result = await addEnquiryNote(id, noteText.trim(), crmUserId);
    setAddingNote(false);

    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    } else {
      toast({ title: 'Note Added' });
      setNoteText('');
      loadAll();
    }
  };

  const updateField = (field: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/enquiries')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">
                {enquiry?.enquiry_number || 'Enquiry'}
              </h1>
              {enquiry?.status && (
                <Badge className={STATUS_COLORS[enquiry.status]}>{enquiry.status.replace('_', ' ')}</Badge>
              )}
              {enquiry?.priority && (
                <Badge variant="outline">{enquiry.priority}</Badge>
              )}
            </div>
            <p className="text-muted-foreground mt-1">{enquiry?.subject || 'No subject'}</p>
            {readOnly && (
              <p className="text-sm text-destructive mt-1">Read-only: not a participant.</p>
            )}
          </div>
        </div>
        {!readOnly && (
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="quotes">Quotes ({quotes.length})</TabsTrigger>
          <TabsTrigger value="activity">Activity ({activities.length})</TabsTrigger>
        </TabsList>

        {/* ─── Overview Tab ─── */}
        <TabsContent value="overview" className="mt-4 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Info */}
            <Card>
              <CardHeader><CardTitle className="text-base">Basic Information</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Input
                    value={formData.subject || ''}
                    onChange={(e) => updateField('subject', e.target.value)}
                    disabled={readOnly}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description || ''}
                    onChange={(e) => updateField('description', e.target.value)}
                    rows={4}
                    disabled={readOnly}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Input
                      value={formData.enquiry_type || ''}
                      onChange={(e) => updateField('enquiry_type', e.target.value)}
                      disabled={readOnly}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select
                      value={formData.priority || ''}
                      onValueChange={(v) => updateField('priority', v)}
                      disabled={readOnly}
                    >
                      <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LOW">Low</SelectItem>
                        <SelectItem value="MEDIUM">Medium</SelectItem>
                        <SelectItem value="HIGH">High</SelectItem>
                        <SelectItem value="URGENT">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={formData.status || ''}
                      onValueChange={(v) => updateField('status', v)}
                      disabled={readOnly}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NEW">New</SelectItem>
                        <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                        <SelectItem value="QUOTED">Quoted</SelectItem>
                        <SelectItem value="NEGOTIATING">Negotiating</SelectItem>
                        <SelectItem value="WON">Won</SelectItem>
                        <SelectItem value="LOST">Lost</SelectItem>
                        <SelectItem value="CANCELLED">Cancelled</SelectItem>
                        <SelectItem value="ON_HOLD">On Hold</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Received Via</Label>
                    <Input
                      value={formData.received_via || ''}
                      onChange={(e) => updateField('received_via', e.target.value)}
                      disabled={readOnly}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={formData.notes || ''}
                    onChange={(e) => updateField('notes', e.target.value)}
                    rows={3}
                    disabled={readOnly}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Cargo & Vessel */}
            <Card>
              <CardHeader><CardTitle className="text-base">Cargo & Vessel</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Vessel Type</Label>
                    <Input value={formData.vessel_type || ''} onChange={(e) => updateField('vessel_type', e.target.value)} disabled={readOnly} />
                  </div>
                  <div className="space-y-2">
                    <Label>Vessel Name</Label>
                    <Input value={formData.vessel_name || ''} onChange={(e) => updateField('vessel_name', e.target.value)} disabled={readOnly} />
                  </div>
                  <div className="space-y-2">
                    <Label>Cargo Type</Label>
                    <Input value={formData.cargo_type || ''} onChange={(e) => updateField('cargo_type', e.target.value)} disabled={readOnly} />
                  </div>
                  <div className="space-y-2">
                    <Label>Quantity</Label>
                    <Input type="number" value={formData.quantity ?? ''} onChange={(e) => updateField('quantity', e.target.value ? parseFloat(e.target.value) : null)} disabled={readOnly} />
                  </div>
                  <div className="space-y-2">
                    <Label>Quantity Unit</Label>
                    <Input value={formData.quantity_unit || ''} onChange={(e) => updateField('quantity_unit', e.target.value)} disabled={readOnly} />
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Loading Port</Label>
                    <Input value={formData.loading_port || ''} onChange={(e) => updateField('loading_port', e.target.value)} disabled={readOnly} />
                  </div>
                  <div className="space-y-2">
                    <Label>Discharge Port</Label>
                    <Input value={formData.discharge_port || ''} onChange={(e) => updateField('discharge_port', e.target.value)} disabled={readOnly} />
                  </div>
                  <div className="space-y-2">
                    <Label>Laycan From</Label>
                    <Input type="date" value={formData.laycan_from || ''} onChange={(e) => updateField('laycan_from', e.target.value)} disabled={readOnly} />
                  </div>
                  <div className="space-y-2">
                    <Label>Laycan To</Label>
                    <Input type="date" value={formData.laycan_to || ''} onChange={(e) => updateField('laycan_to', e.target.value)} disabled={readOnly} />
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Budget Min</Label>
                    <Input type="number" value={formData.budget_min ?? ''} onChange={(e) => updateField('budget_min', e.target.value ? parseFloat(e.target.value) : null)} disabled={readOnly} />
                  </div>
                  <div className="space-y-2">
                    <Label>Budget Max</Label>
                    <Input type="number" value={formData.budget_max ?? ''} onChange={(e) => updateField('budget_max', e.target.value ? parseFloat(e.target.value) : null)} disabled={readOnly} />
                  </div>
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Input value={formData.currency || ''} onChange={(e) => updateField('currency', e.target.value)} disabled={readOnly} />
                  </div>
                  <div className="space-y-2">
                    <Label>Win Probability (%)</Label>
                    <Input type="number" min="0" max="100" value={formData.win_probability ?? ''} onChange={(e) => updateField('win_probability', e.target.value ? parseInt(e.target.value) : null)} disabled={readOnly} />
                  </div>
                  <div className="space-y-2">
                    <Label>Estimated Value</Label>
                    <Input type="number" value={formData.estimated_value ?? ''} onChange={(e) => updateField('estimated_value', e.target.value ? parseFloat(e.target.value) : null)} disabled={readOnly} />
                  </div>
                  <div className="space-y-2">
                    <Label>Expected Close</Label>
                    <Input type="date" value={formData.expected_close_date || ''} onChange={(e) => updateField('expected_close_date', e.target.value)} disabled={readOnly} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Meta info */}
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            {enquiry?.created_at && (
              <span>Created: {format(new Date(enquiry.created_at), 'MMM d, yyyy HH:mm')}</span>
            )}
            {enquiry?.updated_at && (
              <span>Updated: {format(new Date(enquiry.updated_at), 'MMM d, yyyy HH:mm')}</span>
            )}
          </div>
        </TabsContent>

        {/* ─── Quotes Tab ─── */}
        <TabsContent value="quotes" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setQuoteModalOpen(true)}>
              <Send className="h-4 w-4 mr-2" />
              Create Quote
            </Button>
          </div>

          {quotes.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No quotes yet. Create one to get started.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quote #</TableHead>
                    <TableHead>Ver</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Sent</TableHead>
                    <TableHead>Accepted</TableHead>
                    <TableHead>Rejected</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotes.map((q) => (
                    <TableRow key={q.id}>
                      <TableCell className="font-mono text-xs">{q.quote_number || '—'}</TableCell>
                      <TableCell>{q.version ?? '—'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={QUOTE_STATUS_COLORS[q.status] || ''}>{q.status}</Badge>
                      </TableCell>
                      <TableCell>
                        {q.total_amount != null ? `${q.total_amount.toLocaleString()} ${q.currency || ''}` : '—'}
                      </TableCell>
                      <TableCell className="text-sm">{q.sent_at ? format(new Date(q.sent_at), 'MMM d') : '—'}</TableCell>
                      <TableCell className="text-sm">{q.accepted_at ? format(new Date(q.accepted_at), 'MMM d') : '—'}</TableCell>
                      <TableCell className="text-sm">{q.rejected_at ? format(new Date(q.rejected_at), 'MMM d') : '—'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {q.status === 'DRAFT' && (
                            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleQuoteAction(q.id, 'SENT')}>
                              <Send className="h-3 w-3 mr-1" /> Mark Sent
                            </Button>
                          )}
                          {(q.status === 'SENT' || q.status === 'DRAFT') && (
                            <>
                              <Button variant="ghost" size="sm" className="h-7 text-xs text-green-700" onClick={() => handleQuoteAction(q.id, 'ACCEPTED')}>
                                <Check className="h-3 w-3 mr-1" /> Accept
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 text-xs text-red-700" onClick={() => handleQuoteAction(q.id, 'REJECTED')}>
                                <X className="h-3 w-3 mr-1" /> Reject
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* ─── Activity Tab ─── */}
        <TabsContent value="activity" className="mt-4 space-y-4">
          {/* Add Note */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex gap-2">
                <Textarea
                  placeholder="Add a note..."
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  rows={2}
                  className="flex-1"
                />
                <Button
                  onClick={handleAddNote}
                  disabled={addingNote || !noteText.trim()}
                  className="self-end"
                >
                  {addingNote ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquarePlus className="h-4 w-4 mr-1" />}
                  Add
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          {activities.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No activity recorded yet.
            </div>
          ) : (
            <div className="space-y-3">
              {activities.map((activity) => (
                <div key={activity.id} className="flex gap-3 p-3 rounded-lg border bg-card">
                  <div className="shrink-0 rounded-full p-2 bg-muted text-muted-foreground">
                    {ACTIVITY_ICONS[activity.activity_type] || <FileText className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs">
                        {activity.activity_type?.replace(/_/g, ' ')}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {activity.created_at ? format(new Date(activity.created_at), 'MMM d, HH:mm') : ''}
                      </span>
                    </div>
                    <p className="text-sm mt-1 whitespace-pre-wrap">{activity.description || ''}</p>
                    {activity.creator_name && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <User className="h-3 w-3" />
                        {activity.creator_name}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Quote Modal */}
      <CreateQuoteModal
        open={quoteModalOpen}
        onOpenChange={setQuoteModalOpen}
        enquiryId={id || ''}
        contactId={enquiry?.contact_id}
        allowDraft
        onSuccess={() => { setQuoteModalOpen(false); loadAll(); }}
      />

      {/* Rejection Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Reject Quote</DialogTitle>
            <DialogDescription>Please provide a reason for rejection.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Reason for rejection..."
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={confirmReject} disabled={!rejectionReason.trim()}>
                Confirm Rejection
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
