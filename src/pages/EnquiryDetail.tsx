import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  Loader2, ArrowLeft, Save, Send, Check, X,
  MessageSquarePlus, FileText, Clock, User, Anchor, Package,
  List, Copy, Link2, Search, Plus, ExternalLink, Pencil, Trash2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import {
  fetchEnquiryDetail, fetchEnquiryQuotes, fetchEnquiryActivities,
  updateEnquiry, updateQuoteStatus, addEnquiryNote,
  EnquiryDetail, EnquiryQuote, EnquiryActivity, QuoteStatus,
} from '@/services/enquiries';
import { getCurrentCrmUserId } from '@/services/profiles';
import { useAuth } from '@/contexts/AuthContext';
import { CreateQuoteModal } from '@/components/enquiries/CreateQuoteModal';
import {
  TANKER_STATUSES, STATUS_COLORS, PRIORITY_COLORS, QUOTE_STATUS_COLORS,
  MODE_COLORS, MODE_LABELS, deriveDisplayMode,
} from '@/lib/enquiryConstants';
import { buildWhatsAppText } from '@/lib/enquirySubject';
import {
  fetchMatchedVessels, fetchMatchedCargoes, fetchAvailableVessels,
  fetchAvailableCargoes, createMatch, removeMatch, updateMatchNotes,
  EnquiryMatch,
} from '@/services/enquiryMatches';
import {
  fetchDocumentsForEnquiry, linkDocumentToEnquiry, fetchDocuments,
  CrmDocument,
} from '@/services/documents';

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
  const [formData, setFormData] = useState<Partial<EnquiryDetail>>({});
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingQuoteId, setRejectingQuoteId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [noteText, setNoteText] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [shortlistNote, setShortlistNote] = useState('');
  const [savingShortlist, setSavingShortlist] = useState(false);

  // Matching state
  const [matches, setMatches] = useState<EnquiryMatch[]>([]);
  const [matchModalOpen, setMatchModalOpen] = useState(false);
  const [availableForMatch, setAvailableForMatch] = useState<any[]>([]);
  const [matchSearch, setMatchSearch] = useState('');
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [matchNotes, setMatchNotes] = useState('');
  const [savingMatch, setSavingMatch] = useState(false);
  const [editMatchId, setEditMatchId] = useState<string | null>(null);
  const [editMatchNotes, setEditMatchNotes] = useState('');

  // Documents state
  const [relatedDocs, setRelatedDocs] = useState<CrmDocument[]>([]);
  const [linkDocOpen, setLinkDocOpen] = useState(false);
  const [allDocs, setAllDocs] = useState<CrmDocument[]>([]);
  const [docSearch, setDocSearch] = useState('');

  useEffect(() => { getCurrentCrmUserId().then(r => setCrmUserId(r.data)); }, []);

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
        description: 'You can see this in the feed. To work it, add an offer or ask admin.',
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

    // Load matches & related docs
    loadMatchesAndDocs(detailResult.data);
  }, [id, navigate]);

  const loadMatchesAndDocs = useCallback(async (enq?: EnquiryDetail | null) => {
    if (!id) return;
    const currentEnq = enq || enquiry;
    const currentMode = currentEnq ? deriveDisplayMode(currentEnq) : null;

    // Load matches based on mode
    if (currentMode === 'CARGO') {
      const mr = await fetchMatchedVessels(id);
      setMatches(mr.data || []);
    } else if (currentMode === 'VESSEL') {
      const mr = await fetchMatchedCargoes(id);
      setMatches(mr.data || []);
    }

    // Load related documents
    const dr = await fetchDocumentsForEnquiry(id);
    setRelatedDocs(dr.data || []);
  }, [id, enquiry]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleSave = async () => {
    if (!id || readOnly) return;
    setSaving(true);
    const result = await updateEnquiry(id, formData);
    setSaving(false);
    if (result.error) {
      if (result.error.includes('access policy')) setReadOnly(true);
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

  const handleSaveShortlist = async () => {
    if (!id || !crmUserId || !shortlistNote.trim()) return;
    setSavingShortlist(true);
    const result = await addEnquiryNote(id, `[SHORTLIST] ${shortlistNote.trim()}`, crmUserId);
    setSavingShortlist(false);
    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    } else {
      toast({ title: 'Shortlist note added' });
      setShortlistNote('');
      loadAll();
    }
  };

  // ─── Match handlers ─────────────────────────────────────────────
  const isCargo = () => {
    const m = enquiry ? deriveDisplayMode(enquiry) : 'GENERAL';
    return m === 'CARGO';
  };

  const openMatchModal = async () => {
    if (!id) return;
    const existingIds = matches.map(m => isCargo() ? m.vessel_enq?.id : m.cargo_enq?.id).filter(Boolean) as string[];
    if (isCargo()) {
      const r = await fetchAvailableVessels(existingIds);
      setAvailableForMatch(r.data || []);
    } else {
      const r = await fetchAvailableCargoes(existingIds);
      setAvailableForMatch(r.data || []);
    }
    setMatchModalOpen(true);
  };

  const handleCreateMatch = async () => {
    if (!id || !crmUserId || !selectedMatchId) return;
    setSavingMatch(true);
    const result = isCargo()
      ? await createMatch(id, selectedMatchId, matchNotes.trim() || null, crmUserId)
      : await createMatch(selectedMatchId, id, matchNotes.trim() || null, crmUserId);
    setSavingMatch(false);
    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    } else {
      toast({ title: isCargo() ? 'Vessel matched' : 'Cargo matched' });
      setMatchModalOpen(false);
      setSelectedMatchId(null);
      setMatchNotes('');
      loadMatchesAndDocs();
    }
  };

  const handleRemoveMatch = async (matchId: string) => {
    const result = await removeMatch(matchId);
    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    } else {
      toast({ title: 'Match removed' });
      loadMatchesAndDocs();
    }
  };

  const handleEditMatchNotes = async () => {
    if (!editMatchId) return;
    const result = await updateMatchNotes(editMatchId, editMatchNotes);
    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    } else {
      toast({ title: 'Notes updated' });
      setEditMatchId(null);
      loadMatchesAndDocs();
    }
  };

  const openLinkDocModal = async () => {
    const r = await fetchDocuments();
    setAllDocs(r.data || []);
    setLinkDocOpen(true);
  };

  const handleLinkDoc = async (docId: string) => {
    if (!id) return;
    const result = await linkDocumentToEnquiry(docId, id);
    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    } else {
      toast({ title: 'Document linked' });
      setLinkDocOpen(false);
      loadMatchesAndDocs();
    }
  };

  const updateField = (field: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const mode = enquiry ? deriveDisplayMode(enquiry) : 'GENERAL';
  const isFixedOrWon = ['FIXED', 'WON'].includes(formData.status || '');
  const isFailedOrLost = ['FAILED', 'LOST'].includes(formData.status || '');
  const isCancelledOrWithdrawn = ['CANCELLED', 'WITHDRAWN'].includes(formData.status || '');

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
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-foreground">
                {enquiry?.enquiry_number || 'Enquiry'}
              </h1>
              <Badge variant="outline" className={MODE_COLORS[mode]}>
                {mode === 'CARGO' ? <Package className="h-3 w-3 mr-1" /> : <Anchor className="h-3 w-3 mr-1" />}
                {MODE_LABELS[mode]}
              </Badge>
              {enquiry?.status && (
                <Badge className={STATUS_COLORS[enquiry.status]}>{enquiry.status.replace(/_/g, ' ')}</Badge>
              )}
              {enquiry?.priority && <Badge variant="outline">{enquiry.priority}</Badge>}
            </div>
            <p className="text-muted-foreground mt-1">{enquiry?.subject || 'No subject'}</p>
            {readOnly && <p className="text-sm text-destructive mt-1">Read-only: not a participant.</p>}
            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
              {enquiry?.created_at && <span>Created: {format(new Date(enquiry.created_at), 'dd MMM yyyy HH:mm')}</span>}
              {enquiry?.updated_at && <span>Updated: {format(new Date(enquiry.updated_at), 'dd MMM yyyy HH:mm')}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {enquiry && (
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await navigator.clipboard.writeText(buildWhatsAppText(enquiry));
                toast({ title: 'Copied to clipboard ✓' });
              }}
            >
              <Copy className="mr-1.5 h-4 w-4" />
              Copy WhatsApp Text
            </Button>
          )}
          {!readOnly && (
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="quotes">Offers ({quotes.length})</TabsTrigger>
          <TabsTrigger value="activity">Activity ({activities.length})</TabsTrigger>
          <TabsTrigger value="shortlist" className="gap-1">
            <List className="h-3.5 w-3.5" /> Shortlist
          </TabsTrigger>
          <TabsTrigger value="matching" className="gap-1">
            <Link2 className="h-3.5 w-3.5" /> {mode === 'CARGO' ? 'Matched Vessels' : 'Matched Cargoes'} ({matches.length})
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-1">
            <FileText className="h-3.5 w-3.5" /> Documents ({relatedDocs.length})
          </TabsTrigger>
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
                  <Input value={formData.subject || ''} onChange={e => updateField('subject', e.target.value)} disabled={readOnly} />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={formData.description || ''} onChange={e => updateField('description', e.target.value)} rows={3} disabled={readOnly} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Input value={formData.enquiry_type || ''} onChange={e => updateField('enquiry_type', e.target.value)} disabled={readOnly} />
                  </div>
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select value={formData.priority || ''} onValueChange={v => updateField('priority', v)} disabled={readOnly}>
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
                    <Select value={formData.status || ''} onValueChange={v => updateField('status', v)} disabled={readOnly}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TANKER_STATUSES.map(s => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Received Via</Label>
                    <Input value={formData.received_via || ''} onChange={e => updateField('received_via', e.target.value)} disabled={readOnly} />
                  </div>
                </div>

                {/* Outcome fields */}
                {isFixedOrWon && (
                  <div className="space-y-2 p-3 rounded border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800">
                    <Label>Actual Value</Label>
                    <Input type="number" value={formData.actual_value ?? ''} onChange={e => updateField('actual_value', e.target.value ? parseFloat(e.target.value) : null)} disabled={readOnly} />
                  </div>
                )}
                {isFailedOrLost && (
                  <div className="space-y-3 p-3 rounded border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800">
                    <div className="space-y-2">
                      <Label>Lost Reason</Label>
                      <Textarea value={formData.lost_reason || ''} onChange={e => updateField('lost_reason', e.target.value)} rows={2} disabled={readOnly} />
                    </div>
                    <div className="space-y-2">
                      <Label>Lost to Competitor</Label>
                      <Input value={formData.lost_to_competitor || ''} onChange={e => updateField('lost_to_competitor', e.target.value)} disabled={readOnly} />
                    </div>
                  </div>
                )}
                {isCancelledOrWithdrawn && (
                  <div className="space-y-2 p-3 rounded border border-muted">
                    <Label>Cancellation Reason</Label>
                    <Textarea value={formData.cancellation_reason || ''} onChange={e => updateField('cancellation_reason', e.target.value)} rows={2} disabled={readOnly} />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea value={formData.notes || ''} onChange={e => updateField('notes', e.target.value)} rows={3} disabled={readOnly} />
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
                    <Input value={formData.vessel_type || ''} onChange={e => updateField('vessel_type', e.target.value)} disabled={readOnly} />
                  </div>
                  <div className="space-y-2">
                    <Label>Vessel Name</Label>
                    <Input value={formData.vessel_name || ''} onChange={e => updateField('vessel_name', e.target.value)} disabled={readOnly} />
                  </div>
                  <div className="space-y-2">
                    <Label>Cargo Grade / Type</Label>
                    <Input value={formData.cargo_type || ''} onChange={e => updateField('cargo_type', e.target.value)} disabled={readOnly} />
                  </div>
                  <div className="space-y-2">
                    <Label>Quantity</Label>
                    <Input type="number" value={formData.quantity ?? ''} onChange={e => updateField('quantity', e.target.value ? parseFloat(e.target.value) : null)} disabled={readOnly} />
                  </div>
                  <div className="space-y-2">
                    <Label>Quantity Unit</Label>
                    <Input value={formData.quantity_unit || ''} onChange={e => updateField('quantity_unit', e.target.value)} disabled={readOnly} />
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Loading Port</Label>
                    <Input value={formData.loading_port || ''} onChange={e => updateField('loading_port', e.target.value)} disabled={readOnly} />
                  </div>
                  <div className="space-y-2">
                    <Label>Discharge Port</Label>
                    <Input value={formData.discharge_port || ''} onChange={e => updateField('discharge_port', e.target.value)} disabled={readOnly} />
                  </div>
                  <div className="space-y-2">
                    <Label>Laycan From</Label>
                    <Input type="date" value={formData.laycan_from || ''} onChange={e => updateField('laycan_from', e.target.value)} disabled={readOnly} />
                  </div>
                  <div className="space-y-2">
                    <Label>Laycan To</Label>
                    <Input type="date" value={formData.laycan_to || ''} onChange={e => updateField('laycan_to', e.target.value)} disabled={readOnly} />
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Budget Min</Label>
                    <Input type="number" value={formData.budget_min ?? ''} onChange={e => updateField('budget_min', e.target.value ? parseFloat(e.target.value) : null)} disabled={readOnly} />
                  </div>
                  <div className="space-y-2">
                    <Label>Budget Max</Label>
                    <Input type="number" value={formData.budget_max ?? ''} onChange={e => updateField('budget_max', e.target.value ? parseFloat(e.target.value) : null)} disabled={readOnly} />
                  </div>
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Input value={formData.currency || ''} onChange={e => updateField('currency', e.target.value)} disabled={readOnly} />
                  </div>
                  <div className="space-y-2">
                    <Label>Win Probability (%)</Label>
                    <Input type="number" min="0" max="100" value={formData.win_probability ?? ''} onChange={e => updateField('win_probability', e.target.value ? parseInt(e.target.value) : null)} disabled={readOnly} />
                  </div>
                  <div className="space-y-2">
                    <Label>Estimated Value</Label>
                    <Input type="number" value={formData.estimated_value ?? ''} onChange={e => updateField('estimated_value', e.target.value ? parseFloat(e.target.value) : null)} disabled={readOnly} />
                  </div>
                  <div className="space-y-2">
                    <Label>Expected Close</Label>
                    <Input type="date" value={formData.expected_close_date || ''} onChange={e => updateField('expected_close_date', e.target.value)} disabled={readOnly} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── Offers / Quotes Tab ─── */}
        <TabsContent value="quotes" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setQuoteModalOpen(true)}>
              <Send className="h-4 w-4 mr-2" /> Create Offer
            </Button>
          </div>

          {quotes.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No offers yet. Send one to get started.
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quote #</TableHead>
                    <TableHead>Ver</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Pricing</TableHead>
                    <TableHead>Sent</TableHead>
                    <TableHead>Via</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotes.map((q) => {
                    const pricingSummary = q.rate != null
                      ? `${q.rate} ${q.rate_unit || ''}`
                      : q.total_amount != null
                        ? `${q.total_amount.toLocaleString()} ${q.currency || ''}`
                        : '—';

                    return (
                      <TableRow key={q.id}>
                        <TableCell className="font-mono text-xs">{q.quote_number || '—'}</TableCell>
                        <TableCell>{q.version ?? '—'}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={QUOTE_STATUS_COLORS[q.status] || ''}>{q.status}</Badge>
                        </TableCell>
                        <TableCell className="text-sm font-medium">{pricingSummary}</TableCell>
                        <TableCell className="text-sm">
                          {q.sent_at ? format(new Date(q.sent_at), 'dd MMM') : '—'}
                        </TableCell>
                        <TableCell className="text-xs">{q.sent_via || '—'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {q.created_at ? format(new Date(q.created_at), 'dd MMM') : '—'}
                        </TableCell>
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
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* ─── Activity Tab ─── */}
        <TabsContent value="activity" className="mt-4 space-y-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex gap-2">
                <Textarea
                  placeholder="Add a note..."
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  rows={2}
                  className="flex-1"
                  maxLength={2000}
                />
                <Button onClick={handleAddNote} disabled={addingNote || !noteText.trim()} className="self-end">
                  {addingNote ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquarePlus className="h-4 w-4 mr-1" />}
                  Add
                </Button>
              </div>
            </CardContent>
          </Card>

          {activities.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No activity recorded yet.</div>
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
                        {activity.created_at ? format(new Date(activity.created_at), 'dd MMM, HH:mm') : ''}
                      </span>
                    </div>
                    <p className="text-sm mt-1 whitespace-pre-wrap">{activity.description || ''}</p>
                    {activity.creator_name && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <User className="h-3 w-3" /> {activity.creator_name}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ─── Shortlist Tab ─── */}
        <TabsContent value="shortlist" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Shortlist Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Use this tab to track shortlisted candidates, vessels, or counterparties for this enquiry.
                Notes are saved to the activity timeline with a [SHORTLIST] tag.
              </p>
              <div className="flex gap-2">
                <Textarea
                  placeholder="Add shortlist note (e.g., vessel candidate, counterparty interest)..."
                  value={shortlistNote}
                  onChange={e => setShortlistNote(e.target.value)}
                  rows={3}
                  className="flex-1"
                  maxLength={2000}
                />
                <Button
                  onClick={handleSaveShortlist}
                  disabled={savingShortlist || !shortlistNote.trim()}
                  className="self-end"
                >
                  {savingShortlist ? <Loader2 className="h-4 w-4 animate-spin" /> : <List className="h-4 w-4 mr-1" />}
                  Add
                </Button>
              </div>

              {/* Show existing shortlist notes from activity */}
              {activities.filter(a => a.description?.startsWith('[SHORTLIST]')).length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Previous Shortlist Entries</h4>
                    {activities
                      .filter(a => a.description?.startsWith('[SHORTLIST]'))
                      .map(a => (
                        <div key={a.id} className="p-3 rounded border bg-muted/50 text-sm">
                          <p className="whitespace-pre-wrap">{a.description?.replace('[SHORTLIST] ', '')}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                            {a.created_at && <span>{format(new Date(a.created_at), 'dd MMM HH:mm')}</span>}
                            {a.creator_name && <span>— {a.creator_name}</span>}
                          </div>
                        </div>
                      ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Matching Tab ─── */}
        <TabsContent value="matching" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              {mode === 'CARGO' ? '🔗 Matched Vessels' : '🔗 Matched Cargoes'}
            </h3>
            <Button size="sm" onClick={openMatchModal}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              {mode === 'CARGO' ? 'Match Vessel' : 'Match Cargo'}
            </Button>
          </div>

          {matches.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No matches yet.</div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ENQ #</TableHead>
                    {mode === 'CARGO' ? (
                      <>
                        <TableHead>Vessel Name</TableHead>
                        <TableHead>Vessel Size</TableHead>
                        <TableHead>Open Port</TableHead>
                        <TableHead>Open Date</TableHead>
                        <TableHead>Owner Contact</TableHead>
                      </>
                    ) : (
                      <>
                        <TableHead>Product</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Load Port</TableHead>
                        <TableHead>Disch Port</TableHead>
                        <TableHead>Laycan</TableHead>
                        <TableHead>Charterer</TableHead>
                      </>
                    )}
                    <TableHead>Notes</TableHead>
                    <TableHead>Matched By</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {matches.map(m => {
                    const v = m.vessel_enq;
                    const c = m.cargo_enq;
                    return (
                      <TableRow key={m.id}>
                        <TableCell className="font-mono text-xs">
                          <a href={`/enquiries/${mode === 'CARGO' ? v?.id : c?.id}`} className="text-primary hover:underline">
                            {mode === 'CARGO' ? v?.enquiry_number : c?.enquiry_number}
                          </a>
                        </TableCell>
                        {mode === 'CARGO' ? (
                          <>
                            <TableCell>{v?.vessel_name || 'TBN'}</TableCell>
                            <TableCell>{v?.vessel_type || '—'}</TableCell>
                            <TableCell>{v?.loading_port || '—'}</TableCell>
                            <TableCell className="text-xs">{v?.laycan_from ? format(new Date(v.laycan_from), 'dd MMM') : '—'}</TableCell>
                            <TableCell className="text-xs">{(v?.contact as any)?.full_name || '—'}</TableCell>
                          </>
                        ) : (
                          <>
                            <TableCell>{c?.cargo_type || '—'}</TableCell>
                            <TableCell>{c?.quantity ? `${c.quantity} ${c.quantity_unit || ''}` : '—'}</TableCell>
                            <TableCell>{c?.loading_port || '—'}</TableCell>
                            <TableCell>{c?.discharge_port || '—'}</TableCell>
                            <TableCell className="text-xs">
                              {c?.laycan_from ? format(new Date(c.laycan_from), 'dd MMM') : '—'}
                              {c?.laycan_to ? ` – ${format(new Date(c.laycan_to), 'dd MMM')}` : ''}
                            </TableCell>
                            <TableCell className="text-xs">{(c?.contact as any)?.full_name || '—'}</TableCell>
                          </>
                        )}
                        <TableCell className="text-xs max-w-[150px] truncate">{m.match_notes || '—'}</TableCell>
                        <TableCell className="text-xs">{(m.matched_by_user as any)?.full_name || '—'}</TableCell>
                        <TableCell className="text-xs">{m.matched_at ? format(new Date(m.matched_at), 'dd MMM') : '—'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                              setEditMatchId(m.id);
                              setEditMatchNotes(m.match_notes || '');
                            }}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleRemoveMatch(m.id)}>
                              <X className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* ─── Documents Tab ─── */}
        <TabsContent value="documents" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold">📎 Related Documents</h3>
            <Button size="sm" onClick={openLinkDocModal}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Link Document
            </Button>
          </div>

          {relatedDocs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No documents linked yet.</div>
          ) : (
            <div className="space-y-2">
              {relatedDocs.map(doc => (
                <div key={doc.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="font-medium text-sm flex-1 truncate">{doc.title}</span>
                  <Badge variant="outline" className="text-[10px]">{doc.category}</Badge>
                  {doc.drive_url && (
                    <a href={doc.drive_url} target="_blank" rel="noopener noreferrer" className="text-primary">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                  <span className="text-xs text-muted-foreground">{(doc.uploaded_by_user as any)?.full_name || ''}</span>
                  <span className="text-xs text-muted-foreground">{format(new Date(doc.created_at), 'dd MMM')}</span>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Match Modal */}
      <Dialog open={matchModalOpen} onOpenChange={v => { if (!v) { setMatchModalOpen(false); setSelectedMatchId(null); setMatchNotes(''); setMatchSearch(''); } }}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{mode === 'CARGO' ? 'Match Vessel to this Cargo' : 'Match Cargo to this Vessel'}</DialogTitle>
            <DialogDescription>Select an active {mode === 'CARGO' ? 'vessel open' : 'cargo enquiry'} to match.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={matchSearch} onChange={e => setMatchSearch(e.target.value)} placeholder="Search..." className="pl-9" />
            </div>
            <div className="max-h-[300px] overflow-y-auto border rounded space-y-0">
              {availableForMatch
                .filter(item => {
                  if (!matchSearch) return true;
                  const s = matchSearch.toLowerCase();
                  return (
                    item.enquiry_number?.toLowerCase().includes(s) ||
                    item.vessel_name?.toLowerCase().includes(s) ||
                    item.vessel_type?.toLowerCase().includes(s) ||
                    item.cargo_type?.toLowerCase().includes(s) ||
                    item.loading_port?.toLowerCase().includes(s) ||
                    item.discharge_port?.toLowerCase().includes(s)
                  );
                })
                .map(item => (
                  <div
                    key={item.id}
                    className={`p-3 border-b cursor-pointer hover:bg-muted/50 transition-colors ${selectedMatchId === item.id ? 'bg-primary/10 border-primary' : ''}`}
                    onClick={() => setSelectedMatchId(item.id)}
                  >
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-mono text-xs font-medium">{item.enquiry_number}</span>
                      <span className="font-medium">{item.vessel_name || item.cargo_type || 'TBN'}</span>
                      {item.vessel_type && <Badge variant="outline" className="text-[10px]">{item.vessel_type}</Badge>}
                      {item.loading_port && <span className="text-muted-foreground">· {item.loading_port}</span>}
                      {item.laycan_from && <span className="text-muted-foreground text-xs">· {format(new Date(item.laycan_from), 'dd MMM')}</span>}
                    </div>
                    {(item.contact as any)?.full_name && (
                      <span className="text-xs text-muted-foreground">{(item.contact as any)?.full_name}</span>
                    )}
                  </div>
                ))}
              {availableForMatch.length === 0 && (
                <div className="p-4 text-center text-muted-foreground text-sm">No available {mode === 'CARGO' ? 'vessel opens' : 'cargo enquiries'}.</div>
              )}
            </div>
            {selectedMatchId && (
              <div className="space-y-1">
                <Label className="text-xs">Match Notes (optional)</Label>
                <Textarea value={matchNotes} onChange={e => setMatchNotes(e.target.value)} rows={2} placeholder="e.g. Good fit, laycan overlaps" />
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="ghost" onClick={() => { setMatchModalOpen(false); setSelectedMatchId(null); }}>Cancel</Button>
            <Button disabled={!selectedMatchId || savingMatch} onClick={handleCreateMatch}>
              {savingMatch && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
              Confirm Match
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Match Notes Dialog */}
      <Dialog open={!!editMatchId} onOpenChange={v => { if (!v) setEditMatchId(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Match Notes</DialogTitle>
            <DialogDescription>Update the notes for this match.</DialogDescription>
          </DialogHeader>
          <Textarea value={editMatchNotes} onChange={e => setEditMatchNotes(e.target.value)} rows={3} />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setEditMatchId(null)}>Cancel</Button>
            <Button onClick={handleEditMatchNotes}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Link Document Modal */}
      <Dialog open={linkDocOpen} onOpenChange={v => { if (!v) { setLinkDocOpen(false); setDocSearch(''); } }}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Link Document to Enquiry</DialogTitle>
            <DialogDescription>Select an existing document to link.</DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={docSearch} onChange={e => setDocSearch(e.target.value)} placeholder="Search documents..." className="pl-9" />
          </div>
          <div className="max-h-[300px] overflow-y-auto border rounded space-y-0">
            {allDocs
              .filter(d => !docSearch || d.title.toLowerCase().includes(docSearch.toLowerCase()))
              .filter(d => d.related_enquiry_id !== id) // exclude already linked
              .map(d => (
                <div
                  key={d.id}
                  className="p-3 border-b cursor-pointer hover:bg-muted/50 flex items-center justify-between"
                  onClick={() => handleLinkDoc(d.id)}
                >
                  <div>
                    <span className="text-sm font-medium">{d.title}</span>
                    <Badge variant="outline" className="ml-2 text-[10px]">{d.category}</Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">{format(new Date(d.created_at), 'dd MMM')}</span>
                </div>
              ))}
          </div>
        </DialogContent>
      </Dialog>

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
            <DialogTitle>Reject Offer</DialogTitle>
            <DialogDescription>Please provide a reason for rejection.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} placeholder="Reason for rejection..." rows={3} maxLength={1000} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={confirmReject} disabled={!rejectionReason.trim()}>Confirm Rejection</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
