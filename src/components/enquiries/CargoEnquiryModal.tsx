import { useState, useMemo, useEffect, useCallback } from 'react';
import { Loader2, Fuel, CalendarIcon, Search, User } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { generateCargoSubject } from '@/lib/enquirySubject';
import { VESSEL_SIZE_OPTIONS } from '@/lib/vesselSizes';
import { useAuth } from '@/contexts/AuthContext';

const UNIT_OPTIONS = ['MT', 'CBM', 'BBLS', 'LOTS'];

function fmtDate(d: Date) { return format(d, 'yyyy-MM-dd'); }

interface ContactOption {
  id: string;
  full_name: string;
  company_name?: string | null;
}

function DatePickerField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const selected = value ? new Date(value + 'T00:00:00') : undefined;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn('w-full justify-start text-left font-normal text-xs h-9', !value && 'text-muted-foreground')}>
          <CalendarIcon className="mr-2 h-3.5 w-3.5" />
          {value || 'Pick date'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={selected} onSelect={d => d && onChange(fmtDate(d))} initialFocus />
      </PopoverContent>
    </Popover>
  );
}

interface CargoEnquiryModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CargoEnquiryModal({ open, onClose, onCreated }: CargoEnquiryModalProps) {
  const { crmUser } = useAuth();

  // Contact search state
  const [contacts, setContacts] = useState<ContactOption[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactPopoverOpen, setContactPopoverOpen] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  const [selectedContactName, setSelectedContactName] = useState<string>('');
  const [selectedCompanyName, setSelectedCompanyName] = useState<string>('');

  // Form state
  const [cargoType, setCargoType] = useState('');
  const [quantity, setQuantity] = useState('');
  const [quantityUnit, setQuantityUnit] = useState('MT');
  const [loadPort, setLoadPort] = useState('');
  const [dischPort, setDischPort] = useState('');
  const [laycanFrom, setLaycanFrom] = useState('');
  const [laycanTo, setLaycanTo] = useState('');
  const [vesselSize, setVesselSize] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const subject = useMemo(() => generateCargoSubject({
    quantity, quantityUnit, cargoType, loadingPort: loadPort, dischargePort: dischPort, laycanFrom, laycanTo,
  }), [cargoType, quantity, quantityUnit, loadPort, dischPort, laycanFrom, laycanTo]);

  // Fetch contacts from Charterer and Broker companies only
  const fetchContacts = useCallback(async () => {
    setContactsLoading(true);
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('id, full_name, companies!inner(company_name, company_type)')
        .eq('is_active', true)
        .eq('is_deleted', false)
        .in('companies.company_type', ['Charterer', 'Broker'])
        .order('full_name')
        .limit(500);

      if (error) {
        console.error('[CargoEnquiryModal] contacts fetch error:', error);
        return;
      }

      setContacts(
        (data || []).map((c: any) => ({
          id: c.id,
          full_name: c.full_name || 'Unknown',
          company_name: c.companies?.company_name || null,
        }))
      );
    } catch (err) {
      console.error('[CargoEnquiryModal] contacts fetch failed:', err);
    } finally {
      setContactsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) fetchContacts();
  }, [open, fetchContacts]);

  const clearForm = () => {
    setSelectedContactId(''); setSelectedContactName(''); setSelectedCompanyName('');
    setCargoType(''); setQuantity(''); setQuantityUnit('MT');
    setLoadPort(''); setDischPort('');
    setLaycanFrom(''); setLaycanTo('');
    setVesselSize(''); setNotes('');
  };

  const handleContactSelect = (contact: ContactOption) => {
    setSelectedContactId(contact.id);
    setSelectedContactName(contact.full_name);
    setSelectedCompanyName(contact.company_name || '');
    setContactPopoverOpen(false);
  };

  const handleSubmit = async () => {
    if (!selectedContactId) {
      toast({ title: 'Contact is required to create an enquiry.', variant: 'destructive' });
      return;
    }

    const missing: string[] = [];
    if (!cargoType.trim()) missing.push('Product / Cargo');
    if (!quantity.trim()) missing.push('Quantity');
    if (!loadPort.trim()) missing.push('Load Port');
    if (!dischPort.trim()) missing.push('Discharge Port');
    if (!laycanFrom) missing.push('Laycan From');
    if (!laycanTo) missing.push('Laycan To');
    if (missing.length) {
      toast({ title: 'Required fields missing', description: missing.join(', '), variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const subj = generateCargoSubject({ quantity, quantityUnit, cargoType, loadingPort: loadPort, dischargePort: dischPort, laycanFrom, laycanTo });
      const { data, error } = await supabase.rpc('rpc_create_enquiry_fast', {
        p_mode: 'SPOT', p_subject: subj,
        p_cargo_type: cargoType.trim(), p_quantity: Number(quantity), p_quantity_unit: quantityUnit,
        p_lp: loadPort.trim(), p_dp: dischPort.trim(),
        p_laycan_from: laycanFrom, p_laycan_to: laycanTo,
        p_vessel_type: vesselSize && vesselSize !== 'NONE' ? vesselSize : null, p_notes: notes.trim() || null,
        p_is_draft: false,
      });
      if (error) {
        const msg = error.message.includes('CRM user mapping missing')
          ? 'Your account is not linked to a CRM profile. Contact your admin.'
          : error.message;
        toast({ title: 'Error', description: msg, variant: 'destructive' });
        return;
      }

      // Link contact to the newly created enquiry
      if (data && selectedContactId) {
        const enquiryId = typeof data === 'string' ? data : (data as any)?.enquiry_id;
        if (enquiryId) {
          await supabase
            .from('enquiries')
            .update({
              contact_id: selectedContactId,
              source_contact_id: selectedContactId,
            })
            .eq('id', enquiryId);
        }
      }

      toast({ title: 'Cargo enquiry created' });
      clearForm();
      onCreated();
      onClose();
    } finally { setSubmitting(false); }
  };

  const handleClose = () => {
    const hasData = cargoType || quantity || loadPort || dischPort || laycanFrom || laycanTo || notes || selectedContactId;
    if (hasData && !window.confirm('Discard unsaved changes?')) return;
    clearForm();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Fuel className="h-5 w-5" /> New Cargo Enquiry</DialogTitle>
          <DialogDescription>Create a new cargo enquiry. All required fields are marked with *.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {/* Contact selector */}
          <div className="space-y-1">
            <Label className="text-xs">Contact <span className="text-destructive">*</span></Label>
            <Popover open={contactPopoverOpen} onOpenChange={setContactPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="w-full justify-between font-normal text-xs h-9">
                  {selectedContactName ? (
                    <span className="truncate">
                      {selectedContactName}
                      {selectedCompanyName && (
                        <span className="text-muted-foreground ml-1">({selectedCompanyName})</span>
                      )}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Search contacts...</span>
                  )}
                  <Search className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[--radix-popover-trigger-width] p-0 z-[60] bg-popover pointer-events-auto"
                align="start"
                side="bottom"
                avoidCollisions={false}
              >
                <Command className="flex flex-col" shouldFilter={true}>
                  <CommandInput placeholder="Type to search..." />
                  <CommandList className="max-h-[200px] overflow-y-auto overflow-x-hidden overscroll-contain pointer-events-auto">
                    <CommandEmpty>
                      {contactsLoading ? 'Loading contacts...' : 'No contacts found.'}
                    </CommandEmpty>
                    <CommandGroup>
                      {contacts.map((c) => (
                        <CommandItem
                          key={c.id}
                          value={`${c.full_name} ${c.company_name || ''}`}
                          onSelect={() => handleContactSelect(c)}
                        >
                          <span className="truncate">{c.full_name}</span>
                          {c.company_name && (
                            <span className="ml-2 text-xs text-muted-foreground truncate">{c.company_name}</span>
                          )}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Company auto-populated (read-only) */}
          {selectedCompanyName && (
            <div className="rounded border bg-muted/30 px-3 py-1.5">
              <span className="text-[11px] text-muted-foreground">Company: </span>
              <span className="text-xs font-medium text-foreground">{selectedCompanyName}</span>
            </div>
          )}

          {/* Cargo details */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Product / Cargo <span className="text-destructive">*</span></Label>
              <Input value={cargoType} onChange={e => setCargoType(e.target.value)} placeholder="ULSD, Naphtha, Crude" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Quantity <span className="text-destructive">*</span></Label>
              <div className="flex gap-2">
                <Input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="30000" className="flex-1" />
                <Select value={quantityUnit} onValueChange={setQuantityUnit}>
                  <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                  <SelectContent>{UNIT_OPTIONS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Load Port / Area <span className="text-destructive">*</span></Label>
              <Input value={loadPort} onChange={e => setLoadPort(e.target.value)} placeholder="Ras Tanura, Jubail" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Discharge Port / Area <span className="text-destructive">*</span></Label>
              <Input value={dischPort} onChange={e => setDischPort(e.target.value)} placeholder="Chiba, Rotterdam" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Laycan From <span className="text-destructive">*</span></Label>
              <DatePickerField value={laycanFrom} onChange={setLaycanFrom} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Laycan To <span className="text-destructive">*</span></Label>
              <DatePickerField value={laycanTo} onChange={setLaycanTo} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Preferred Vessel Size</Label>
              <Select value={vesselSize} onValueChange={setVesselSize}>
                <SelectTrigger><SelectValue placeholder="Select size..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">None</SelectItem>
                  {VESSEL_SIZE_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Notes</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Optional notes" className="min-h-[60px]" />
            </div>
          </div>

          {/* Subject preview */}
          <div className="rounded border bg-muted/50 px-3 py-2">
            <span className="text-xs text-muted-foreground font-medium">Subject preview — auto-generated</span>
            <p className="text-xs font-mono text-foreground mt-0.5">{subject}</p>
          </div>

          {/* Created by indicator */}
          {crmUser && (
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <User className="h-3 w-3" />
              <span>Created by: <span className="font-medium text-foreground">{crmUser.full_name}</span></span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={handleClose}>Cancel</Button>
          <Button disabled={submitting} onClick={handleSubmit}>
            {submitting && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
            Create Enquiry
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
