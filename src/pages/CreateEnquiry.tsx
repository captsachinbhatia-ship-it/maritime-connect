import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft, Package, Zap, FileText, X, Copy, ChevronDown } from 'lucide-react';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { getCurrentCrmUserId } from '@/services/profiles';
import { useAuth } from '@/contexts/AuthContext';
import { useDraftPersistence } from '@/hooks/useDraftPersistence';
import { SmartEnquiryParser, type ParsedEnquiry } from '@/components/enquiries/SmartEnquiryParser';

interface CargoDraft {
  cargoGrade: string;
  quantity: string;
  quantityUnit: string;
  loadingPort: string;
  dischargePort: string;
  laycanFrom: string;
  laycanTo: string;
  // Optional
  vesselType: string;
  contactReference: string;
  notes: string;
  receivedVia: string;
  sourceDetails: string;
  tags: string;
}

const INITIAL_DRAFT: CargoDraft = {
  cargoGrade: '',
  quantity: '',
  quantityUnit: 'MT',
  loadingPort: '',
  dischargePort: '',
  laycanFrom: '',
  laycanTo: '',
  vesselType: '',
  contactReference: '',
  notes: '',
  receivedVia: '',
  sourceDetails: '',
  tags: '',
};

function generateSubject(f: CargoDraft): string {
  const parts = [
    f.quantity && f.quantityUnit ? `${f.quantity}${f.quantityUnit}` : f.quantity,
    f.cargoGrade,
    f.loadingPort ? `EX ${f.loadingPort.toUpperCase()}` : '',
    f.dischargePort ? `TO ${f.dischargePort.toUpperCase()}` : '',
  ].filter(Boolean).join(' ');

  if (f.laycanFrom || f.laycanTo) {
    const from = f.laycanFrom || '?';
    const to = f.laycanTo || '?';
    return `${parts} LAYCAN ${from}-${to}`;
  }
  return parts;
}

function generateWhatsApp(enqNo: string, f: CargoDraft): string {
  const qty = f.quantity && f.quantityUnit ? `${f.quantity}${f.quantityUnit}` : f.quantity || '';
  let text = `${enqNo}: ${qty} ${f.cargoGrade} EX ${f.loadingPort?.toUpperCase() || ''} TO ${f.dischargePort?.toUpperCase() || ''} LAYCAN ${f.laycanFrom || '?'}-${f.laycanTo || '?'}.`;
  if (f.vesselType) text += `\nREQ ${f.vesselType}.`;
  if (f.notes?.trim()) text += `\nREMARKS: ${f.notes.trim()}.`;
  return text;
}

export default function CreateEnquiry() {
  const navigate = useNavigate();
  const { crmUser, isPreviewMode } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [whatsappSubmitting, setWhatsappSubmitting] = useState(false);
  const [crmUserId, setCrmUserId] = useState<string | null>(null);
  const [showParser, setShowParser] = useState(false);
  const [optionalOpen, setOptionalOpen] = useState(false);

  const { value: form, updateField, clearDraft, hasDraft } = useDraftPersistence<CargoDraft>('cargo-enquiry-draft', INITIAL_DRAFT);

  useEffect(() => {
    if (isPreviewMode) {
      setCrmUserId(crmUser?.id || null);
    } else {
      getCurrentCrmUserId().then(r => setCrmUserId(r.data));
    }
  }, [isPreviewMode, crmUser]);

  const handleParsedData = (parsed: ParsedEnquiry) => {
    if (parsed.cargo) updateField('cargoGrade', parsed.cargo);
    if (parsed.quantity) updateField('quantity', parsed.quantity);
    if (parsed.loadingPort) updateField('loadingPort', parsed.loadingPort);
    if (parsed.dischargePort) updateField('dischargePort', parsed.dischargePort);
    if (parsed.laycanFrom) updateField('laycanFrom', parsed.laycanFrom);
    if (parsed.laycanTo) updateField('laycanTo', parsed.laycanTo);
    if (parsed.vesselType) updateField('vesselType', parsed.vesselType);
    if (parsed.other.length > 0) {
      const existingNotes = form.notes ? form.notes + '\n' : '';
      updateField('notes', existingNotes + parsed.other.join('\n'));
    }
    setShowParser(false);
    toast({ title: 'Fields populated from parsed text' });
  };

  const validate = (): boolean => {
    const missing: string[] = [];
    if (!form.cargoGrade.trim()) missing.push('Cargo Grade');
    if (!form.quantity.trim()) missing.push('Quantity');
    if (!form.quantityUnit) missing.push('Unit');
    if (!form.loadingPort.trim()) missing.push('Loading Port');
    if (!form.dischargePort.trim()) missing.push('Discharge Port');
    if (!form.laycanFrom) missing.push('Laycan From');
    if (!form.laycanTo) missing.push('Laycan To');
    if (missing.length > 0) {
      toast({ title: 'Required fields missing', description: missing.join(', '), variant: 'destructive' });
      return false;
    }
    if (!crmUserId) {
      toast({ title: 'Could not identify current user', variant: 'destructive' });
      return false;
    }
    return true;
  };

  const buildPayload = () => {
    const subject = generateSubject(form);
    const payload: Record<string, unknown> = {
      enquiry_mode: 'CARGO_OPEN',
      cargo_grade: form.cargoGrade.trim(),
      quantity: parseFloat(form.quantity),
      quantity_unit: form.quantityUnit,
      loading_port: form.loadingPort.trim(),
      discharge_port: form.dischargePort.trim(),
      laycan_from: form.laycanFrom,
      laycan_to: form.laycanTo,
      subject,
      vessel_type: form.vesselType.trim() || null,
      contact_reference: form.contactReference.trim() || null,
      notes: form.notes.trim() || null,
      received_via: form.receivedVia || null,
      source_details: form.sourceDetails.trim() || null,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : null,
    };
    return payload;
  };

  const doSubmit = async (copyWhatsApp: boolean) => {
    if (!validate()) return;

    const setLoading = copyWhatsApp ? setWhatsappSubmitting : setSubmitting;
    setLoading(true);

    try {
      const payload = buildPayload();

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
        setLoading(false);
        return;
      }

      clearDraft();

      if (copyWhatsApp) {
        const waText = generateWhatsApp(data.enquiry_number, form);
        await navigator.clipboard.writeText(waText);
        toast({ title: 'Enquiry created and copied', description: `${data.enquiry_number} — WhatsApp text on clipboard` });
      } else {
        toast({ title: 'Enquiry Created', description: `${data.enquiry_number} created successfully.` });
      }

      navigate(`/enquiries/${data.id}`);
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/enquiries')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              New Cargo Enquiry
              {hasDraft && (
                <Badge variant="secondary" className="text-xs font-normal">
                  <FileText className="mr-1 h-3 w-3" />
                  Draft
                </Badge>
              )}
            </h1>
            <p className="text-muted-foreground text-sm">Fill required fields and submit in under 30 seconds</p>
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

      {/* Smart Parser */}
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

      <form onSubmit={(e) => { e.preventDefault(); doSubmit(false); }} className="space-y-6">
        {/* Required Fields */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4" />
              Cargo Details
              <Badge variant="outline" className="text-xs ml-auto font-normal">All required</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cargo Grade / Type <span className="text-destructive">*</span></Label>
                <Input
                  value={form.cargoGrade}
                  onChange={e => updateField('cargoGrade', e.target.value)}
                  placeholder="e.g., Naphtha, Crude, ULSD"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Quantity <span className="text-destructive">*</span></Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={form.quantity}
                    onChange={e => updateField('quantity', e.target.value)}
                    placeholder="30000"
                    className="flex-1"
                    required
                  />
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Loading Port <span className="text-destructive">*</span></Label>
                <Input
                  value={form.loadingPort}
                  onChange={e => updateField('loadingPort', e.target.value)}
                  placeholder="e.g., Ras Tanura"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Discharge Port <span className="text-destructive">*</span></Label>
                <Input
                  value={form.dischargePort}
                  onChange={e => updateField('dischargePort', e.target.value)}
                  placeholder="e.g., Chiba"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Laycan From <span className="text-destructive">*</span></Label>
                <Input
                  type="date"
                  value={form.laycanFrom}
                  onChange={e => updateField('laycanFrom', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Laycan To <span className="text-destructive">*</span></Label>
                <Input
                  type="date"
                  value={form.laycanTo}
                  onChange={e => updateField('laycanTo', e.target.value)}
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Optional Details — Collapsed */}
        <Card>
          <Collapsible open={optionalOpen} onOpenChange={setOptionalOpen}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg">
                <CardTitle className="text-base flex items-center justify-between w-full">
                  <span>Optional Details</span>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${optionalOpen ? 'rotate-180' : ''}`} />
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4 pt-0">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Vessel Type Required</Label>
                    <Input
                      value={form.vesselType}
                      onChange={e => updateField('vesselType', e.target.value)}
                      placeholder="e.g., MR, LR1, VLCC"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Contact Reference</Label>
                    <Input
                      value={form.contactReference}
                      onChange={e => updateField('contactReference', e.target.value)}
                      placeholder="e.g., John from ABC Shipping"
                    />
                  </div>
                </div>

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
                    <Input
                      value={form.sourceDetails}
                      onChange={e => updateField('sourceDetails', e.target.value)}
                      placeholder="e.g., Broker X referral"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Tags (comma-separated)</Label>
                  <Input
                    value={form.tags}
                    onChange={e => updateField('tags', e.target.value)}
                    placeholder="e.g., urgent, spot, MEG"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={form.notes}
                    onChange={e => updateField('notes', e.target.value)}
                    rows={3}
                    maxLength={2000}
                    placeholder="Any additional remarks..."
                  />
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate('/enquiries')}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={whatsappSubmitting || submitting}
            className="min-w-[200px]"
            onClick={() => doSubmit(true)}
          >
            {whatsappSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Copy className="mr-1.5 h-4 w-4" />
            Create & Copy WhatsApp
          </Button>
          <Button type="submit" disabled={submitting || whatsappSubmitting} className="min-w-[140px]">
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Enquiry
          </Button>
        </div>
      </form>
    </div>
  );
}
