import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, addDays } from 'date-fns';
import {
  Loader2, ArrowLeft, Ship, ChevronDown, CalendarIcon, Zap, X, FileText,
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
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { generateVesselSubject } from '@/lib/enquirySubject';
import { useDraftPersistence } from '@/hooks/useDraftPersistence';

interface VesselDraft {
  vesselName: string;
  vesselType: string;
  openPort: string;
  laycanFrom: string;
  laycanTo: string;
  dwt: string;
  notes: string;
  contactId: string;
}

const INITIAL: VesselDraft = {
  vesselName: '', vesselType: '', openPort: '',
  laycanFrom: '', laycanTo: '',
  dwt: '', notes: '', contactId: '',
};

const VESSEL_TYPES = ['VLCC', 'SUEZMAX', 'AFRAMAX', 'PANAMAX', 'SUPRAMAX', 'HANDYSIZE', 'HANDYMAX', 'MR TANKER', 'OTHER'];

function fmt(d: Date) { return format(d, 'yyyy-MM-dd'); }

export default function NewVesselEnquiry() {
  const navigate = useNavigate();
  const { value: form, updateField, clearDraft, hasDraft } = useDraftPersistence<VesselDraft>('vessel-enq-draft-v2', INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [optionalOpen, setOptionalOpen] = useState(false);
  const [portSuggestions, setPortSuggestions] = useState<string[]>([]);

  useEffect(() => {
    supabase.from('enquiries').select('loading_port, discharge_port').limit(500)
      .then(({ data }) => {
        const ports = new Set<string>();
        (data || []).forEach(r => { if (r.loading_port) ports.add(r.loading_port); if (r.discharge_port) ports.add(r.discharge_port); });
        setPortSuggestions([...ports].sort());
      });
  }, []);

  // Auto-set laycanTo = from + 7 days
  useEffect(() => {
    if (form.laycanFrom && !form.laycanTo) {
      updateField('laycanTo', fmt(addDays(new Date(form.laycanFrom), 7)));
    }
  }, [form.laycanFrom]); // eslint-disable-line react-hooks/exhaustive-deps

  const subjectPreview = useMemo(() => generateVesselSubject({
    vesselName: form.vesselName,
    vesselType: form.vesselType,
    openPort: form.openPort,
    laycanFrom: form.laycanFrom,
  }), [form.vesselName, form.vesselType, form.openPort, form.laycanFrom]);

  const doSubmit = async (isDraft: boolean) => {
    if (!isDraft) {
      const missing: string[] = [];
      if (!form.vesselName.trim()) missing.push('Vessel Name');
      if (!form.vesselType) missing.push('Vessel Type');
      if (!form.openPort.trim()) missing.push('Open Port');
      if (!form.laycanFrom) missing.push('Open Date From');
      if (!form.laycanTo) missing.push('Open Date To');
      if (missing.length > 0) {
        toast({ title: 'Required fields missing', description: missing.join(', '), variant: 'destructive' });
        return;
      }
    }

    setSubmitting(true);
    try {
      const subject = generateVesselSubject({
        vesselName: form.vesselName, vesselType: form.vesselType,
        openPort: form.openPort, laycanFrom: form.laycanFrom,
      });

      const otherReq = form.dwt ? { dwt: Number(form.dwt) } : null;

      const { data: enquiryId, error } = await supabase.rpc('rpc_create_enquiry_fast', {
        p_mode: 'TC',
        p_subject: subject,
        p_vessel_name: form.vesselName.trim() || null,
        p_vessel_type: form.vesselType || null,
        p_lp: form.openPort.trim() || null,
        p_dp: 'WORLDWIDE',
        p_laycan_from: form.laycanFrom || null,
        p_laycan_to: form.laycanTo || null,
        p_notes: form.notes.trim() || null,
        p_other_requirements: otherReq,
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
              <Ship className="h-5 w-5 text-indigo-600" />
              New Vessel Open
              {hasDraft && <Badge variant="secondary" className="text-xs font-normal"><FileText className="mr-1 h-3 w-3" />Draft</Badge>}
            </h1>
            <p className="text-muted-foreground text-sm">Vessel looking for cargo</p>
          </div>
        </div>
        {hasDraft && (
          <Button variant="ghost" size="sm" onClick={clearDraft}><X className="mr-1 h-3.5 w-3.5" />Clear Draft</Button>
        )}
      </div>

      <form onSubmit={e => { e.preventDefault(); doSubmit(false); }} className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              Vessel Details
              <Badge variant="outline" className="text-xs ml-auto font-normal">All required</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Vessel Name <span className="text-destructive">*</span></Label>
                <Input value={form.vesselName} onChange={e => updateField('vesselName', e.target.value)} placeholder="e.g., MT FORTUNE" />
              </div>
              <div className="space-y-2">
                <Label>Vessel Type <span className="text-destructive">*</span></Label>
                <Select value={form.vesselType} onValueChange={v => updateField('vesselType', v)}>
                  <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
                  <SelectContent>
                    {VESSEL_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Open Port <span className="text-destructive">*</span></Label>
              <AutocompleteInput value={form.openPort} onChange={v => updateField('openPort', v)} suggestions={portSuggestions} placeholder="e.g., Fujairah" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Open Date From <span className="text-destructive">*</span></Label>
                <DatePickerField value={form.laycanFrom} onChange={v => updateField('laycanFrom', v)} />
              </div>
              <div className="space-y-2">
                <Label>Open Date To <span className="text-destructive">*</span></Label>
                <DatePickerField value={form.laycanTo} onChange={v => updateField('laycanTo', v)} />
              </div>
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

        {/* Optional */}
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
                <div className="space-y-2">
                  <Label>DWT</Label>
                  <Input type="number" value={form.dwt} onChange={e => updateField('dwt', e.target.value)} placeholder="e.g., 47000" />
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
          <Button type="button" variant="outline" disabled={submitting} onClick={() => doSubmit(true)}>Save as Draft</Button>
          <Button type="submit" disabled={submitting} className="min-w-[140px]">
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create & Issue
          </Button>
        </div>
      </form>
    </div>
  );
}

// ─── Helper components (same pattern as cargo page) ───────────────────

function AutocompleteInput({ value, onChange, suggestions, placeholder }: {
  value: string; onChange: (v: string) => void; suggestions: string[]; placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const filtered = suggestions.filter(s => s.toLowerCase().includes(value.toLowerCase())).slice(0, 8);
  return (
    <Popover open={open && filtered.length > 0 && value.length > 0} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Input value={value} onChange={e => { onChange(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} placeholder={placeholder} />
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-1" align="start" onOpenAutoFocus={e => e.preventDefault()}>
        {filtered.map(s => (
          <button key={s} type="button" className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent rounded-sm" onClick={() => { onChange(s); setOpen(false); }}>{s}</button>
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
        <Calendar mode="single" selected={dateVal} onSelect={d => { if (d) { onChange(format(d, 'yyyy-MM-dd')); setOpen(false); } }} initialFocus className={cn('p-3 pointer-events-auto')} />
      </PopoverContent>
    </Popover>
  );
}
