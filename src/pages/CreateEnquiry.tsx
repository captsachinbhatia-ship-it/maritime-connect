import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft, Anchor, Package, Zap, FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { getCurrentCrmUserId } from '@/services/profiles';
import { useAuth } from '@/contexts/AuthContext';
import { useDraftPersistence } from '@/hooks/useDraftPersistence';
import { SmartEnquiryParser, type ParsedEnquiry } from '@/components/enquiries/SmartEnquiryParser';

type EnquiryMode = 'CARGO' | 'VESSEL';

interface EnquiryDraft {
  mode: EnquiryMode;
  enquiryType: string;
  subject: string;
  contactId: string;
  contactReference: string;
  companyId: string;
  description: string;
  cargoType: string;
  quantity: string;
  quantityUnit: string;
  loadingPort: string;
  dischargePort: string;
  laycanFrom: string;
  laycanTo: string;
  vesselType: string;
  vesselName: string;
  budgetMin: string;
  budgetMax: string;
  currency: string;
  estimatedValue: string;
  receivedVia: string;
  sourceDetails: string;
  tags: string;
  notes: string;
}

const INITIAL_DRAFT: EnquiryDraft = {
  mode: 'CARGO',
  enquiryType: 'BROKERAGE',
  subject: '',
  contactId: '',
  contactReference: '',
  companyId: '',
  description: '',
  cargoType: '',
  quantity: '',
  quantityUnit: 'MT',
  loadingPort: '',
  dischargePort: '',
  laycanFrom: '',
  laycanTo: '',
  vesselType: '',
  vesselName: '',
  budgetMin: '',
  budgetMax: '',
  currency: 'USD',
  estimatedValue: '',
  receivedVia: '',
  sourceDetails: '',
  tags: '',
  notes: '',
};

export default function CreateEnquiry() {
  const navigate = useNavigate();
  const { crmUser, isPreviewMode } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [crmUserId, setCrmUserId] = useState<string | null>(null);
  const [showParser, setShowParser] = useState(false);

  // Draft persistence
  const { value: form, updateField, clearDraft, hasDraft } = useDraftPersistence<EnquiryDraft>('enquiry-draft', INITIAL_DRAFT);

  // Contacts for dropdown
  const [contacts, setContacts] = useState<{ id: string; full_name: string; company_id: string | null }[]>([]);
  const [contactSearch, setContactSearch] = useState('');

  useEffect(() => {
    if (isPreviewMode) {
      setCrmUserId(crmUser?.id || null);
    } else {
      getCurrentCrmUserId().then(r => setCrmUserId(r.data));
    }
  }, [isPreviewMode, crmUser]);

  useEffect(() => {
    supabase
      .from('contacts')
      .select('id, full_name, company_id')
      .order('full_name')
      .limit(500)
      .then(({ data }) => setContacts(data || []));
  }, []);

  // Auto-fill company when contact selected
  useEffect(() => {
    if (form.contactId) {
      const contact = contacts.find(c => c.id === form.contactId);
      if (contact?.company_id) updateField('companyId', contact.company_id);
    }
  }, [form.contactId, contacts, updateField]);

  const filteredContacts = contactSearch
    ? contacts.filter(c => c.full_name?.toLowerCase().includes(contactSearch.toLowerCase()))
    : contacts;

  const handleParsedData = (parsed: ParsedEnquiry) => {
    if (parsed.cargo) updateField('cargoType', parsed.cargo);
    if (parsed.quantity) updateField('quantity', parsed.quantity);
    if (parsed.loadingPort) updateField('loadingPort', parsed.loadingPort);
    if (parsed.dischargePort) updateField('dischargePort', parsed.dischargePort);
    if (parsed.laycanFrom) updateField('laycanFrom', parsed.laycanFrom);
    if (parsed.laycanTo) updateField('laycanTo', parsed.laycanTo);
    if (parsed.vesselType) updateField('vesselType', parsed.vesselType);
    if (parsed.vesselName) updateField('vesselName', parsed.vesselName);
    if (parsed.subject && !form.subject) updateField('subject', parsed.subject);
    if (parsed.other.length > 0) {
      const existingNotes = form.notes ? form.notes + '\n' : '';
      updateField('notes', existingNotes + parsed.other.join('\n'));
    }
    setShowParser(false);
    toast({ title: 'Fields populated from parsed text' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Minimal validation — only mode is truly required
    if (!crmUserId) {
      toast({ title: 'Could not identify current user', variant: 'destructive' });
      return;
    }

    setSubmitting(true);

    try {
      const payload: Record<string, unknown> = {
        subject: form.subject.trim() || `${form.mode === 'CARGO' ? 'Cargo' : 'Vessel'} Enquiry`,
        contact_id: form.contactId || null,
        company_id: form.companyId || null,
        enquiry_type: form.enquiryType,
        priority: 'MEDIUM',
        description: form.description.trim() || null,
        status: 'RECEIVED',
        created_by: crmUserId,
        assigned_to: crmUserId,
        assigned_at: new Date().toISOString(),
        cargo_type: form.cargoType || null,
        quantity: form.quantity ? parseFloat(form.quantity) : null,
        quantity_unit: form.quantityUnit || null,
        loading_port: form.loadingPort || null,
        discharge_port: form.dischargePort || null,
        laycan_from: form.laycanFrom || null,
        laycan_to: form.laycanTo || null,
        vessel_type: form.vesselType || null,
        vessel_name: form.vesselName || null,
        budget_min: form.budgetMin ? parseFloat(form.budgetMin) : null,
        budget_max: form.budgetMax ? parseFloat(form.budgetMax) : null,
        currency: form.currency || 'USD',
        estimated_value: form.estimatedValue ? parseFloat(form.estimatedValue) : null,
        received_via: form.receivedVia || null,
        source_details: form.sourceDetails || null,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : null,
        notes: form.notes.trim() || null,
      };

      // Try writing enquiry_mode
      try { payload.enquiry_mode = form.mode; } catch { /* column may not exist */ }

      // Store contact reference in notes if no contact_id
      if (!form.contactId && form.contactReference.trim()) {
        const ref = `[Contact Ref: ${form.contactReference.trim()}]`;
        payload.notes = payload.notes ? `${ref}\n${payload.notes}` : ref;
      }

      const { data, error } = await supabase
        .from('enquiries')
        .insert(payload)
        .select('id, enquiry_number')
        .single();

      if (error) {
        if (error.message.includes('row-level security')) {
          toast({ title: 'Not permitted by access policy.', variant: 'destructive' });
        } else {
          toast({ title: 'Error', description: error.message, variant: 'destructive' });
        }
        setSubmitting(false);
        return;
      }

      clearDraft();
      toast({ title: 'Enquiry Created', description: `${data.enquiry_number} created successfully.` });
      navigate(`/enquiries/${data.id}`);
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/enquiries')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              New Enquiry
              {hasDraft && (
                <Badge variant="secondary" className="text-xs font-normal">
                  <FileText className="mr-1 h-3 w-3" />
                  Draft Saved
                </Badge>
              )}
            </h1>
            <p className="text-muted-foreground text-sm">Create a cargo enquiry or open vessel enquiry</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasDraft && (
            <Button variant="ghost" size="sm" onClick={clearDraft}>
              <X className="mr-1 h-3.5 w-3.5" />
              Clear Draft
            </Button>
          )}
          <Button
            variant={showParser ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowParser(!showParser)}
          >
            <Zap className="mr-1.5 h-4 w-4" />
            {showParser ? 'Manual Entry' : 'Smart Parse'}
          </Button>
        </div>
      </div>

      {/* Smart Parser Panel */}
      {showParser && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Smart Parse — Paste Enquiry Text
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SmartEnquiryParser onParsed={handleParsedData} />
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Mode Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Enquiry Mode</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Button
                type="button"
                variant={form.mode === 'CARGO' ? 'default' : 'outline'}
                className="flex-1 h-16 gap-3"
                onClick={() => updateField('mode', 'CARGO')}
              >
                <Package className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-semibold">Cargo Enquiry</div>
                  <div className="text-xs opacity-80">Need vessel for cargo</div>
                </div>
              </Button>
              <Button
                type="button"
                variant={form.mode === 'VESSEL' ? 'default' : 'outline'}
                className="flex-1 h-16 gap-3"
                onClick={() => updateField('mode', 'VESSEL')}
              >
                <Anchor className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-semibold">Open Vessel</div>
                  <div className="text-xs opacity-80">Need cargo for vessel</div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Core Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Core Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input
                value={form.subject}
                onChange={e => updateField('subject', e.target.value)}
                placeholder="e.g., 30K MT Naphtha MEG-Japan (auto-generated if blank)"
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground">Leave blank to auto-generate from cargo/port details</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Contact</Label>
                <Select value={form.contactId} onValueChange={(v) => updateField('contactId', v)}>
                  <SelectTrigger><SelectValue placeholder="Select contact (optional)..." /></SelectTrigger>
                  <SelectContent>
                    <div className="p-2">
                      <Input
                        placeholder="Search contacts..."
                        value={contactSearch}
                        onChange={e => setContactSearch(e.target.value)}
                        className="h-8"
                      />
                    </div>
                    <div className="max-h-[200px] overflow-y-auto">
                      {filteredContacts.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                      ))}
                    </div>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Contact Reference</Label>
                <Input
                  value={form.contactReference}
                  onChange={e => updateField('contactReference', e.target.value)}
                  placeholder="e.g., John from ABC Shipping"
                />
                <p className="text-xs text-muted-foreground">Free text — link to actual contact later</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Enquiry Type</Label>
              <Select value={form.enquiryType} onValueChange={(v) => updateField('enquiryType', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="BROKERAGE">Brokerage</SelectItem>
                  <SelectItem value="GENERAL">General</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={e => updateField('description', e.target.value)}
                placeholder="Additional details..."
                rows={2}
                maxLength={2000}
              />
            </div>
          </CardContent>
        </Card>

        {/* Cargo Section - shown when mode=CARGO */}
        {form.mode === 'CARGO' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4" />
                Cargo Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cargo Grade / Type</Label>
                  <Input value={form.cargoType} onChange={e => updateField('cargoType', e.target.value)} placeholder="e.g., Naphtha, Crude" />
                </div>
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <div className="flex gap-2">
                    <Input value={form.quantity} onChange={e => updateField('quantity', e.target.value)} placeholder="30000" className="flex-1" />
                    <Select value={form.quantityUnit} onValueChange={(v) => updateField('quantityUnit', v)}>
                      <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MT">MT</SelectItem>
                        <SelectItem value="BBL">BBL</SelectItem>
                        <SelectItem value="CBM">CBM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Loading Port</Label>
                  <Input value={form.loadingPort} onChange={e => updateField('loadingPort', e.target.value)} placeholder="e.g., Ras Tanura" />
                </div>
                <div className="space-y-2">
                  <Label>Discharge Port</Label>
                  <Input value={form.dischargePort} onChange={e => updateField('dischargePort', e.target.value)} placeholder="e.g., Chiba" />
                </div>
                <div className="space-y-2">
                  <Label>Laycan From</Label>
                  <Input type="date" value={form.laycanFrom} onChange={e => updateField('laycanFrom', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Laycan To</Label>
                  <Input type="date" value={form.laycanTo} onChange={e => updateField('laycanTo', e.target.value)} />
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Vessel Type Required</Label>
                <Input value={form.vesselType} onChange={e => updateField('vesselType', e.target.value)} placeholder="e.g., MR, LR1, VLCC" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Vessel Section - shown when mode=VESSEL */}
        {form.mode === 'VESSEL' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Anchor className="h-4 w-4" />
                Vessel Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Vessel Name</Label>
                  <Input value={form.vesselName} onChange={e => updateField('vesselName', e.target.value)} placeholder="e.g., MT Pacific Star" />
                </div>
                <div className="space-y-2">
                  <Label>Vessel Type</Label>
                  <Input value={form.vesselType} onChange={e => updateField('vesselType', e.target.value)} placeholder="e.g., MR, LR1, Aframax" />
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Open Area</Label>
                  <Input value={form.loadingPort} onChange={e => updateField('loadingPort', e.target.value)} placeholder="e.g., AG, WC India" />
                </div>
                <div className="space-y-2">
                  <Label>Open Date From</Label>
                  <Input type="date" value={form.laycanFrom} onChange={e => updateField('laycanFrom', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Open Date To</Label>
                  <Input type="date" value={form.laycanTo} onChange={e => updateField('laycanTo', e.target.value)} />
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Cargo Sought</Label>
                <Input value={form.cargoType} onChange={e => updateField('cargoType', e.target.value)} placeholder="e.g., CPP, DPP, Clean" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Commercial */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Commercial</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Budget Min</Label>
                <Input type="number" value={form.budgetMin} onChange={e => updateField('budgetMin', e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>Budget Max</Label>
                <Input type="number" value={form.budgetMax} onChange={e => updateField('budgetMax', e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select value={form.currency} onValueChange={(v) => updateField('currency', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="AED">AED</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Our Estimate</Label>
              <Input type="number" value={form.estimatedValue} onChange={e => updateField('estimatedValue', e.target.value)} placeholder="Estimated deal value" />
            </div>
          </CardContent>
        </Card>

        {/* Source */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Source & Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Received Via</Label>
                <Select value={form.receivedVia} onValueChange={(v) => updateField('receivedVia', v)}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EMAIL">Email</SelectItem>
                    <SelectItem value="PHONE">Phone</SelectItem>
                    <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                    <SelectItem value="BROKER">Broker</SelectItem>
                    <SelectItem value="DIRECT">Direct</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Source Details</Label>
                <Input value={form.sourceDetails} onChange={e => updateField('sourceDetails', e.target.value)} placeholder="e.g., Broker X referral" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tags (comma-separated)</Label>
              <Input value={form.tags} onChange={e => updateField('tags', e.target.value)} placeholder="e.g., urgent, spot, MEG" />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => updateField('notes', e.target.value)} rows={3} maxLength={2000} />
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate('/enquiries')}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting} className="min-w-[160px]">
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Enquiry
          </Button>
        </div>
      </form>
    </div>
  );
}
