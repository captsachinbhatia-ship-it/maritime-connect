import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { format, addDays } from 'date-fns';
import {
  Loader2, ArrowLeft, Package, Zap, ChevronDown, CalendarIcon, Search, X, FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { generateCargoSubject } from '@/lib/enquirySubject';
import { useDraftPersistence } from '@/hooks/useDraftPersistence';
import { SmartEnquiryParser, type ParsedEnquiry } from '@/components/enquiries/SmartEnquiryParser';

interface CargoDraft {
  cargoType: string;
  quantity: string;
  quantityUnit: string;
  loadingPort: string;
  dischargePort: string;
  laycanFrom: string;
  laycanTo: string;
  vesselType: string;
  receivedVia: string;
  contactId: string;
  notes: string;
  tags: string;
}

const INITIAL: CargoDraft = {
  cargoType: '', quantity: '', quantityUnit: 'MT',
  loadingPort: '', dischargePort: '',
  laycanFrom: '', laycanTo: '',
  vesselType: '', receivedVia: '', contactId: '', notes: '', tags: '',
};

const UNIT_OPTIONS = ['MT', 'CBM', 'BBLS', 'LOTS', 'UNITS'];

function fmt(d: Date) { return format(d, 'yyyy-MM-dd'); }

export default function NewCargoEnquiry() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { value: form, updateField, clearDraft, hasDraft } = useDraftPersistence<CargoDraft>('cargo-enq-draft-v2', INITIAL);

  const [submitting, setSubmitting] = useState(false);
  const [showParser, setShowParser] = useState(false);
  const [optionalOpen, setOptionalOpen] = useState(false);

  // Autocomplete suggestions
  const [cargoSuggestions, setCargoSuggestions] = useState<string[]>([]);
  const [portSuggestions, setPortSuggestions] = useState<string[]>([]);

  // Contact search
  const [contactSearch, setContactSearch] = useState('');
  const [contactResults, setContactResults] = useState<{ id: string; full_name: string; company_name?: string | null }[]>([]);
  const [selectedContactName, setSelectedContactName] = useState('');
  const [contactPopoverOpen, setContactPopoverOpen] = useState(false);

  // Load autocomplete data
  useEffect(() => {
    supabase.from('enquiries').select('cargo_type').not('cargo_type', 'is', null).limit(500)
      .then(({ data }) => {
        const unique = [...new Set((data || []).map(r => r.cargo_type).filter(Boolean))] as string[];
        setCargoSuggestions(unique.sort());
      });
    supabase.from('enquiries').select('loading_port, discharge_port').limit(500)
      .then(({ data }) => {
        const ports = new Set<string>();
        (data || []).forEach(r => {
          if (r.loading_port) ports.add(r.loading_port);
          if (r.discharge_port) ports.add(r.discharge_port);
        });
        setPortSuggestions([...ports].sort());
      });
  }, []);

  // Pre-fill from query params
  useEffect(() => {
    const cid = searchParams.get('contact_id');
    const notes = searchParams.get('prefill_notes');
    if (cid && !form.contactId) {
      updateField('contactId', cid);
      // Fetch name
      supabase.from('contacts').select('id, full_name').eq('id', cid).single()
        .then(({ data }) => { if (data) setSelectedContactName(data.full_name); });
    }
    if (notes && !form.notes) updateField('notes', decodeURIComponent(notes));
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  // Contact search
  useEffect(() => {
    if (contactSearch.length < 2) { setContactResults([]); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from('contacts')
        .select('id, full_name, company_name')
        .ilike('full_name', `%${contactSearch}%`)
        .limit(10);
      setContactResults(data || []);
    }, 300);
    return () => clearTimeout(t);
  }, [contactSearch]);

  // Live subject preview
  const subjectPreview = useMemo(() => generateCargoSubject({
    quantity: form.quantity,
    quantityUnit: form.quantityUnit,
    cargoType: form.cargoType,
    loadingPort: form.loadingPort,
    dischargePort: form.dischargePort,
    laycanFrom: form.laycanFrom,
    laycanTo: form.laycanTo,
  }), [form.cargoType, form.quantity, form.quantityUnit, form.loadingPort, form.dischargePort, form.laycanFrom, form.laycanTo]);

  const handleParsedData = (parsed: ParsedEnquiry) => {
    if (parsed.cargo) updateField('cargoType', parsed.cargo);
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

  const setLaycanRange = (fromOffset: number, toOffset: number) => {
    const today = new Date();
    updateField('laycanFrom', fmt(addDays(today, fromOffset)));
    updateField('laycanTo', fmt(addDays(today, toOffset)));
  };

  const doSubmit = async (isDraft: boolean) => {
    if (!isDraft) {
      const missing: string[] = [];
      if (!form.cargoType.trim()) missing.push('Cargo');
      if (!form.quantity.trim()) missing.push('Quantity');
      if (!form.quantityUnit) missing.push('Unit');
      if (!form.loadingPort.trim()) missing.push('Loading Port');
      if (!form.dischargePort.trim()) missing.push('Discharge Port');
      if (!form.laycanFrom) missing.push('Laycan From');
      if (!form.laycanTo) missing.push('Laycan To');
      if (missing.length > 0) {
        toast({ title: 'Required fields missing', description: missing.join(', '), variant: 'destructive' });
        return;
      }
    }

    setSubmitting(true);
    try {
      const subject = generateCargoSubject({
        quantity: form.quantity, quantityUnit: form.quantityUnit,
        cargoType: form.cargoType, loadingPort: form.loadingPort,
        dischargePort: form.dischargePort, laycanFrom: form.laycanFrom, laycanTo: form.laycanTo,
      });

      const { data: enquiryId, error } = await supabase.rpc('rpc_create_enquiry_fast', {
        p_mode: 'SPOT',
        p_subject: subject,
        p_cargo_type: form.cargoType.trim() || null,
        p_quantity: form.quantity ? parseFloat(form.quantity) : null,
        p_quantity_unit: form.quantityUnit || null,
        p_lp: form.loadingPort.trim() || null,
        p_dp: form.dischargePort.trim() || null,
        p_laycan_from: form.laycanFrom || null,
        p_laycan_to: form.laycanTo || null,
        p_vessel_type: form.vesselType.trim() || null,
        p_notes: form.notes.trim() || null,
        p_is_draft: isDraft,
      });

      if (error) {
        if (error.message.includes('CRM user mapping missing')) {
          toast({ title: 'Your account is not linked to a CRM user. Please contact your admin.', variant: 'destructive' });
        } else {
          toast({ title: 'Error', description: error.message, variant: 'destructive' });
        }
        return;
      }

      // Link contact if selected
      if (form.contactId && enquiryId) {
        await supabase.from('enquiries').update({ contact_id: form.contactId }).eq('id', enquiryId);
      }

      clearDraft();
      toast({ title: isDraft ? 'Draft saved' : 'ENQ created successfully' });
      navigate(`/enquiries/${enquiryId}`);
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/enquiries/new')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Package className="h-5 w-5 text-cyan-600" />
              New Cargo Enquiry
              {hasDraft && <Badge variant="secondary" className="text-xs font-normal"><FileText className="mr-1 h-3 w-3" />Draft</Badge>}
            </h1>
            <p className="text-muted-foreground text-sm">Fill required fields and submit in under 30 seconds</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasDraft && (
            <Button variant="ghost" size="sm" onClick={clearDraft}><X className="mr-1 h-3.5 w-3.5" />Clear Draft</Button>
          )}
          <Button variant={showParser ? 'default' : 'outline'} size="sm" onClick={() => setShowParser(!showParser)}>
            <Zap className="mr-1.5 h-4 w-4" />
            {showParser ? 'Manual Entry' : 'Smart Parse'}
          </Button>
        </div>
      </div>

      {/* Smart Parser */}
      {showParser && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Zap className="h-4 w-4 text-primary" />Smart Parse — Paste Enquiry Text</CardTitle></CardHeader>
          <CardContent><SmartEnquiryParser onParsed={handleParsedData} /></CardContent>
        </Card>
      )}

      <form onSubmit={e => { e.preventDefault(); doSubmit(false); }} className="space-y-5">
        {/* Required Fields */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              Cargo Details
              <Badge variant="outline" className="text-xs ml-auto font-normal">All required</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Cargo + Quantity */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cargo <span className="text-destructive">*</span></Label>
                <AutocompleteInput
                  value={form.cargoType}
                  onChange={v => updateField('cargoType', v)}
                  suggestions={cargoSuggestions}
                  placeholder="e.g., Naphtha, Crude, ULSD"
                />
              </div>
              <div className="space-y-2">
                <Label>Quantity <span className="text-destructive">*</span></Label>
                <div className="flex gap-2">
                  <Input type="number" value={form.quantity} onChange={e => updateField('quantity', e.target.value)} placeholder="30000" className="flex-1" />
                  <Select value={form.quantityUnit} onValueChange={v => updateField('quantityUnit', v)}>
                    <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {UNIT_OPTIONS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Ports */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Loading Port <span className="text-destructive">*</span></Label>
                <AutocompleteInput value={form.loadingPort} onChange={v => updateField('loadingPort', v)} suggestions={portSuggestions} placeholder="e.g., Ras Tanura" />
              </div>
              <div className="space-y-2">
                <Label>Discharge Port <span className="text-destructive">*</span></Label>
                <AutocompleteInput value={form.dischargePort} onChange={v => updateField('dischargePort', v)} suggestions={portSuggestions} placeholder="e.g., Chiba" />
              </div>
            </div>

            {/* Laycan */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Laycan From <span className="text-destructive">*</span></Label>
                <DatePickerField value={form.laycanFrom} onChange={v => updateField('laycanFrom', v)} />
              </div>
              <div className="space-y-2">
                <Label>Laycan To <span className="text-destructive">*</span></Label>
                <DatePickerField value={form.laycanTo} onChange={v => updateField('laycanTo', v)} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setLaycanRange(0, 7)}>Next 7 days</Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setLaycanRange(0, 14)}>Next 14 days</Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setLaycanRange(28, 35)}>+30 days</Button>
            </div>
          </CardContent>
        </Card>

        {/* Subject Preview */}
        <div className="rounded-lg border bg-sky-50 dark:bg-sky-950/30 p-4 space-y-1">
          <div className="flex items-center gap-2 text-xs font-medium text-sky-700 dark:text-sky-300">
            <Zap className="h-3.5 w-3.5" />
            Auto-generated subject
          </div>
          <p className="text-sm font-mono whitespace-pre-line text-foreground">{subjectPreview}</p>
        </div>

        {/* Optional Details */}
        <Card>
          <Collapsible open={optionalOpen} onOpenChange={setOptionalOpen}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg">
                <CardTitle className="text-base flex items-center justify-between w-full">
                  <span>More options</span>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${optionalOpen ? 'rotate-180' : ''}`} />
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4 pt-0">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Vessel Type</Label>
                    <Input value={form.vesselType} onChange={e => updateField('vesselType', e.target.value)} placeholder="e.g., MR, LR1, VLCC" />
                  </div>
                  <div className="space-y-2">
                    <Label>Received Via</Label>
                    <Select value={form.receivedVia} onValueChange={v => updateField('receivedVia', v)}>
                      <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                        <SelectItem value="EMAIL">Email</SelectItem>
                        <SelectItem value="PHONE">Phone</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Contact Reference */}
                <div className="space-y-2">
                  <Label>Contact Reference</Label>
                  <Popover open={contactPopoverOpen} onOpenChange={setContactPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start font-normal text-left" type="button">
                        <Search className="mr-2 h-4 w-4 text-muted-foreground" />
                        {selectedContactName || 'Search contact...'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[320px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Type name..." value={contactSearch} onValueChange={setContactSearch} />
                        <CommandList>
                          <CommandEmpty>No contacts found.</CommandEmpty>
                          <CommandGroup>
                            {contactResults.map(c => (
                              <CommandItem key={c.id} onSelect={() => {
                                updateField('contactId', c.id);
                                setSelectedContactName(c.full_name);
                                setContactPopoverOpen(false);
                              }}>
                                {c.full_name} {c.company_name && <span className="text-muted-foreground ml-1">— {c.company_name}</span>}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {form.contactId && (
                    <Button type="button" variant="ghost" size="sm" className="text-xs" onClick={() => { updateField('contactId', ''); setSelectedContactName(''); }}>
                      <X className="h-3 w-3 mr-1" /> Remove
                    </Button>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Tags (comma-separated)</Label>
                  <Input value={form.tags} onChange={e => updateField('tags', e.target.value)} placeholder="e.g., urgent, spot, MEG" />
                </div>

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea value={form.notes} onChange={e => updateField('notes', e.target.value)} rows={3} maxLength={2000} placeholder="Any additional remarks..." />
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={() => navigate('/enquiries')}>Cancel</Button>
          <Button type="button" variant="outline" disabled={submitting} onClick={() => doSubmit(true)}>
            Save as Draft
          </Button>
          <Button type="submit" disabled={submitting} className="min-w-[140px]">
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create & Issue
          </Button>
        </div>
      </form>
    </div>
  );
}

// ─── Small helper components ──────────────────────────────────────────

function AutocompleteInput({ value, onChange, suggestions, placeholder }: {
  value: string; onChange: (v: string) => void; suggestions: string[]; placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const filtered = suggestions.filter(s => s.toLowerCase().includes(value.toLowerCase())).slice(0, 8);

  return (
    <Popover open={open && filtered.length > 0 && value.length > 0} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Input
          value={value}
          onChange={e => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
        />
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-1" align="start" onOpenAutoFocus={e => e.preventDefault()}>
        {filtered.map(s => (
          <button key={s} type="button" className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent rounded-sm" onClick={() => { onChange(s); setOpen(false); }}>
            {s}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

function DatePickerField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const dateVal = value ? new Date(value + 'T00:00:00') : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" type="button" className={cn('w-full justify-start text-left font-normal', !value && 'text-muted-foreground')}>
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? format(dateVal!, 'dd MMM yyyy') : 'Pick a date'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={dateVal}
          onSelect={d => { if (d) { onChange(format(d, 'yyyy-MM-dd')); setOpen(false); } }}
          initialFocus
          className={cn('p-3 pointer-events-auto')}
        />
      </PopoverContent>
    </Popover>
  );
}
