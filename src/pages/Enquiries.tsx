import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, addDays } from 'date-fns';
import {
  Loader2, Anchor, Copy, Trash2, RotateCcw, ArrowUpDown, ExternalLink,
  CalendarIcon, Fuel, Ship,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { generateCargoSubject, generateVesselSubject, buildWhatsAppText } from '@/lib/enquirySubject';
import { STATUS_COLORS } from '@/lib/enquiryConstants';

const UNIT_OPTIONS = ['MT', 'CBM', 'BBLS', 'LOTS', 'UNITS'];
const VESSEL_TYPES = ['VLCC', 'SUEZMAX', 'AFRAMAX', 'PANAMAX', 'SUPRAMAX', 'HANDYSIZE', 'HANDYMAX', 'MR TANKER', 'OTHER'];
const STATUS_OPTIONS = ['RECEIVED', 'SCREENING', 'IN_MARKET', 'OFFER_OUT', 'COUNTERING', 'SUBJECTS', 'FIXED', 'FAILED', 'CANCELLED', 'WITHDRAWN'];

function fmtDate(d: Date) { return format(d, 'yyyy-MM-dd'); }

function formatLaycanShort(from?: string | null, to?: string | null): string {
  if (!from) return '—';
  const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  const f = new Date(from);
  const fDay = f.getDate(), fMon = MONTHS[f.getMonth()];
  if (!to) return `${fDay} ${fMon}`;
  const t = new Date(to);
  const tDay = t.getDate(), tMon = MONTHS[t.getMonth()];
  return fMon === tMon ? `${fDay}-${tDay} ${fMon}` : `${fDay} ${fMon}-${tDay} ${tMon}`;
}

function formatQty(qty?: number | null, unit?: string | null): string {
  if (qty == null) return '—';
  const display = qty >= 1000 ? `${Math.round(qty / 1000)}K` : String(qty);
  return unit ? `${display} ${unit}` : display;
}

// ─── Types ────────────────────────────────────────────────────────────
interface EnquiryRow {
  id: string;
  enquiry_number: string;
  cargo_type: string | null;
  loading_port: string | null;
  discharge_port: string | null;
  laycan_from: string | null;
  laycan_to: string | null;
  quantity: number | null;
  quantity_unit: string | null;
  vessel_type: string | null;
  vessel_name: string | null;
  status: string;
  subject: string | null;
  created_by: string | null;
  created_at: string;
  deleted_at: string | null;
  enquiry_mode: string | null;
  other_requirements: Record<string, unknown> | null;
  notes: string | null;
}

// ─── Main Page ────────────────────────────────────────────────────────
export default function Enquiries() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Anchor className="h-6 w-6" />
        <h1 className="text-2xl font-bold text-foreground">Enquiries</h1>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CargoColumn />
        <VesselColumn />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// CARGO COLUMN
// ═══════════════════════════════════════════════════════════════════════
function CargoColumn() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<EnquiryRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [cargoType, setCargoType] = useState('');
  const [quantity, setQuantity] = useState('');
  const [quantityUnit, setQuantityUnit] = useState('MT');
  const [loadingPort, setLoadingPort] = useState('');
  const [dischargePort, setDischargePort] = useState('');
  const [laycanFrom, setLaycanFrom] = useState('');
  const [laycanTo, setLaycanTo] = useState('');
  const [vesselSize, setVesselSize] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [fCommodity, setFCommodity] = useState('');
  const [fLoadArea, setFLoadArea] = useState('');
  const [fDischargeArea, setFDischargeArea] = useState('');
  const [fStatuses, setFStatuses] = useState<string[]>([]);
  const [showArchived, setShowArchived] = useState(false);

  // Sort
  const [sortCol, setSortCol] = useState<string>('created_at');
  const [sortAsc, setSortAsc] = useState(false);

  // Delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('enquiries')
      .select('id, enquiry_number, cargo_type, loading_port, discharge_port, laycan_from, laycan_to, quantity, quantity_unit, vessel_type, vessel_name, status, subject, notes, created_by, created_at, deleted_at, enquiry_mode, other_requirements')
      .in('enquiry_mode', ['SPOT', 'VOY', 'CVC', 'BB', 'CARGO_OPEN'])
      .eq('is_draft', false)
      .order('created_at', { ascending: false });
    if (!error) setRows((data || []) as EnquiryRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const subject = useMemo(() => generateCargoSubject({
    quantity, quantityUnit, cargoType, loadingPort, dischargePort, laycanFrom, laycanTo,
  }), [cargoType, quantity, quantityUnit, loadingPort, dischargePort, laycanFrom, laycanTo]);

  const clearForm = () => {
    setCargoType(''); setQuantity(''); setQuantityUnit('MT');
    setLoadingPort(''); setDischargePort('');
    setLaycanFrom(''); setLaycanTo('');
    setVesselSize(''); setNotes('');
  };

  const handleSubmit = async () => {
    const missing: string[] = [];
    if (!cargoType.trim()) missing.push('Cargo');
    if (!quantity.trim()) missing.push('Quantity');
    if (!loadingPort.trim()) missing.push('Load Port');
    if (!dischargePort.trim()) missing.push('Discharge Port');
    if (!laycanFrom) missing.push('Laycan From');
    if (!laycanTo) missing.push('Laycan To');
    if (missing.length) {
      toast({ title: 'Required fields missing', description: missing.join(', '), variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const subj = generateCargoSubject({ quantity, quantityUnit, cargoType, loadingPort, dischargePort, laycanFrom, laycanTo });
      const { error } = await supabase.rpc('rpc_create_enquiry_fast', {
        p_mode: 'SPOT', p_subject: subj,
        p_cargo_type: cargoType.trim(), p_quantity: Number(quantity), p_quantity_unit: quantityUnit,
        p_lp: loadingPort.trim(), p_dp: dischargePort.trim(),
        p_laycan_from: laycanFrom, p_laycan_to: laycanTo,
        p_vessel_type: vesselSize.trim() || null, p_notes: notes.trim() || null,
        p_is_draft: false,
      });
      if (error) {
        const msg = error.message.includes('CRM user mapping missing')
          ? 'Your account is not linked to a CRM user. Please contact your admin.'
          : error.message;
        toast({ title: 'Error', description: msg, variant: 'destructive' });
        return;
      }
      toast({ title: 'Cargo enquiry created' });
      clearForm();
      fetchData();
    } finally { setSubmitting(false); }
  };

  const softDelete = async (id: string) => {
    await supabase.from('enquiries').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    setDeleteId(null);
    fetchData();
  };

  const restore = async (id: string) => {
    await supabase.from('enquiries').update({ deleted_at: null }).eq('id', id);
    fetchData();
  };

  const copyWA = async (row: EnquiryRow) => {
    let subjectText = row.subject;
    if (!subjectText) {
      const { data } = await supabase.from('enquiries').select('subject').eq('id', row.id).single();
      subjectText = data?.subject || row.cargo_type || '';
    }
    await navigator.clipboard.writeText(buildWhatsAppText({
      enquiry_number: row.enquiry_number,
      subject: subjectText,
      vessel_type: row.vessel_type,
      notes: row.notes,
    }));
    toast({ title: 'Copied ✓' });
  };

  // Filter + sort
  const filtered = useMemo(() => {
    let result = rows.filter(r => {
      if (!showArchived && r.deleted_at) return false;
      if (fCommodity && !r.cargo_type?.toLowerCase().includes(fCommodity.toLowerCase())) return false;
      if (fLoadArea && !r.loading_port?.toLowerCase().includes(fLoadArea.toLowerCase())) return false;
      if (fDischargeArea && !r.discharge_port?.toLowerCase().includes(fDischargeArea.toLowerCase())) return false;
      if (fStatuses.length && !fStatuses.includes(r.status)) return false;
      return true;
    });
    // Sort: deleted_at rows last, then by chosen column
    result.sort((a, b) => {
      if (a.deleted_at && !b.deleted_at) return 1;
      if (!a.deleted_at && b.deleted_at) return -1;
      const av = (a as unknown as Record<string, unknown>)[sortCol];
      const bv = (b as unknown as Record<string, unknown>)[sortCol];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
      return sortAsc ? cmp : -cmp;
    });
    return result;
  }, [rows, showArchived, fCommodity, fLoadArea, fDischargeArea, fStatuses, sortCol, sortAsc]);

  const toggleSort = (col: string) => {
    if (sortCol === col) setSortAsc(!sortAsc);
    else { setSortCol(col); setSortAsc(true); }
  };

  const SortHeader = ({ col, children }: { col: string; children: React.ReactNode }) => (
    <TableHead className="cursor-pointer select-none whitespace-nowrap" onClick={() => toggleSort(col)}>
      <span className="inline-flex items-center gap-1">{children} <ArrowUpDown className="h-3 w-3 text-muted-foreground" /></span>
    </TableHead>
  );

  return (
    <div className="space-y-4">
      {/* ── Form ── */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <h2 className="text-base font-semibold flex items-center gap-2"><Fuel className="h-4 w-4" /> New Cargo Enquiry</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Cargo / Commodity <span className="text-destructive">*</span></Label>
            <Input value={cargoType} onChange={e => setCargoType(e.target.value)} placeholder="COAL, IRON ORE" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Quantity <span className="text-destructive">*</span></Label>
            <div className="flex gap-2">
              <Input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="80000" className="flex-1" />
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
            <Input value={loadingPort} onChange={e => setLoadingPort(e.target.value)} placeholder="RBCT, RICHARDS BAY" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Discharge Port / Area <span className="text-destructive">*</span></Label>
            <Input value={dischargePort} onChange={e => setDischargePort(e.target.value)} placeholder="KRISHNAPATNAM" />
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
            <Label className="text-xs">Vessel Size</Label>
            <Input value={vesselSize} onChange={e => setVesselSize(e.target.value)} placeholder="PANAMAX, SUPRAMAX" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Notes</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={1} placeholder="Optional" className="min-h-[36px]" />
          </div>
        </div>

        {/* Subject preview */}
        <div className="rounded border bg-sky-50 dark:bg-sky-950/30 px-3 py-2">
          <span className="text-xs text-sky-700 dark:text-sky-300 font-medium">Subject preview</span>
          <p className="text-xs font-mono text-foreground mt-0.5">{subject}</p>
        </div>

        <div className="flex gap-2">
          <Button size="sm" disabled={submitting} onClick={handleSubmit}>
            {submitting && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
            Create Enquiry
          </Button>
          <Button size="sm" variant="ghost" onClick={clearForm}>Clear</Button>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap items-center gap-2">
        <Input value={fCommodity} onChange={e => setFCommodity(e.target.value)} placeholder="Commodity" className="w-28 h-8 text-xs" />
        <Input value={fLoadArea} onChange={e => setFLoadArea(e.target.value)} placeholder="Load Area" className="w-28 h-8 text-xs" />
        <Input value={fDischargeArea} onChange={e => setFDischargeArea(e.target.value)} placeholder="Discharge" className="w-28 h-8 text-xs" />
        <Select value={fStatuses.length === 1 ? fStatuses[0] : 'all'} onValueChange={v => setFStatuses(v === 'all' ? [] : [v])}>
          <SelectTrigger className="w-28 h-8 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Checkbox checked={showArchived} onCheckedChange={v => setShowArchived(!!v)} />
          Archived
        </label>
      </div>

      {/* ── Table ── */}
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="rounded-lg border overflow-auto max-h-[60vh]">
          <Table>
            <TableHeader>
              <TableRow>
                <SortHeader col="enquiry_number">ENQ #</SortHeader>
                <SortHeader col="cargo_type">Commodity</SortHeader>
                <SortHeader col="loading_port">Load</SortHeader>
                <SortHeader col="discharge_port">Discharge</SortHeader>
                <SortHeader col="laycan_from">Laycan</SortHeader>
                <SortHeader col="quantity">Qty</SortHeader>
                <SortHeader col="vessel_type">Vessel Req</SortHeader>
                <SortHeader col="status">Status</SortHeader>
                <SortHeader col="created_at">Date</SortHeader>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">No cargo enquiries</TableCell></TableRow>
              )}
              {filtered.map(row => (
                <TableRow key={row.id} className={cn(row.deleted_at && 'opacity-40')}>
                  <TableCell>
                    <button className="text-primary hover:underline font-mono text-xs" onClick={() => navigate(`/enquiries/${row.id}`)}>
                      {row.enquiry_number || '—'}
                    </button>
                  </TableCell>
                  <TableCell className="text-xs">{row.cargo_type || '—'}</TableCell>
                  <TableCell className="text-xs">{row.loading_port || '—'}</TableCell>
                  <TableCell className="text-xs">{row.discharge_port || '—'}</TableCell>
                  <TableCell className="text-xs whitespace-nowrap">{formatLaycanShort(row.laycan_from, row.laycan_to)}</TableCell>
                  <TableCell className="text-xs whitespace-nowrap">{formatQty(row.quantity, row.quantity_unit)}</TableCell>
                  <TableCell className="text-xs">{row.vessel_type || '—'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn('text-[10px]', STATUS_COLORS[row.status] || '')}>{row.status}</Badge>
                  </TableCell>
                  <TableCell className="text-xs whitespace-nowrap">
                    {row.created_at ? format(new Date(row.created_at), 'dd MMM') : '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <button className="p-1 rounded hover:bg-muted" title="Copy WhatsApp" onClick={() => copyWA(row)}><Copy className="h-3.5 w-3.5" /></button>
                      <button className="p-1 rounded hover:bg-muted" title="Open" onClick={() => navigate(`/enquiries/${row.id}`)}><ExternalLink className="h-3.5 w-3.5" /></button>
                      {row.deleted_at ? (
                        <button className="p-1 rounded hover:bg-muted text-green-600" title="Restore" onClick={() => restore(row.id)}><RotateCcw className="h-3.5 w-3.5" /></button>
                      ) : (
                        <button className="p-1 rounded hover:bg-muted text-destructive" title="Archive" onClick={() => setDeleteId(row.id)}><Trash2 className="h-3.5 w-3.5" /></button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this enquiry?</AlertDialogTitle>
            <AlertDialogDescription>The enquiry will be soft-deleted and can be restored later.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && softDelete(deleteId)}>Archive</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// VESSEL COLUMN
// ═══════════════════════════════════════════════════════════════════════
function VesselColumn() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<EnquiryRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Form
  const [vesselName, setVesselName] = useState('');
  const [vesselType, setVesselType] = useState('');
  const [dwt, setDwt] = useState('');
  const [openPort, setOpenPort] = useState('');
  const [openFrom, setOpenFrom] = useState('');
  const [openTo, setOpenTo] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [fVesselType, setFVesselType] = useState('all');
  const [fOpenPort, setFOpenPort] = useState('');
  const [fStatuses, setFStatuses] = useState<string[]>([]);
  const [showArchived, setShowArchived] = useState(false);

  // Sort
  const [sortCol, setSortCol] = useState<string>('created_at');
  const [sortAsc, setSortAsc] = useState(false);

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('enquiries')
      .select('id, enquiry_number, vessel_name, vessel_type, loading_port, discharge_port, laycan_from, laycan_to, other_requirements, status, subject, notes, cargo_type, quantity, quantity_unit, created_by, created_at, deleted_at, enquiry_mode')
      .in('enquiry_mode', ['TC', 'SNP', 'VESSEL_OPEN'])
      .eq('is_draft', false)
      .order('created_at', { ascending: false });
    if (!error) setRows((data || []) as EnquiryRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto-set openTo
  useEffect(() => {
    if (openFrom && !openTo) setOpenTo(fmtDate(addDays(new Date(openFrom), 7)));
  }, [openFrom]); // eslint-disable-line react-hooks/exhaustive-deps

  const subject = useMemo(() => generateVesselSubject({
    vesselName, vesselType, openPort, laycanFrom: openFrom,
  }), [vesselName, vesselType, openPort, openFrom]);

  const clearForm = () => {
    setVesselName(''); setVesselType(''); setDwt('');
    setOpenPort(''); setOpenFrom(''); setOpenTo(''); setNotes('');
  };

  const handleSubmit = async () => {
    const missing: string[] = [];
    if (!vesselType) missing.push('Vessel Type');
    if (!openPort.trim()) missing.push('Open Port');
    if (!openFrom) missing.push('Open Date From');
    if (missing.length) {
      toast({ title: 'Required fields missing', description: missing.join(', '), variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const subj = generateVesselSubject({ vesselName, vesselType, openPort, laycanFrom: openFrom });
      const { error } = await supabase.rpc('rpc_create_enquiry_fast', {
        p_mode: 'TC', p_subject: subj,
        p_vessel_name: vesselName.trim() || null, p_vessel_type: vesselType,
        p_lp: openPort.trim(), p_dp: 'WORLDWIDE',
        p_laycan_from: openFrom, p_laycan_to: openTo || null,
        p_notes: notes.trim() || null,
        p_other_requirements: dwt ? { dwt: Number(dwt) } : null,
        p_is_draft: false,
      });
      if (error) {
        const msg = error.message.includes('CRM user mapping missing')
          ? 'Your account is not linked to a CRM user. Please contact your admin.'
          : error.message;
        toast({ title: 'Error', description: msg, variant: 'destructive' });
        return;
      }
      toast({ title: 'Vessel open created' });
      clearForm();
      fetchData();
    } finally { setSubmitting(false); }
  };

  const softDelete = async (id: string) => {
    await supabase.from('enquiries').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    setDeleteId(null);
    fetchData();
  };

  const restore = async (id: string) => {
    await supabase.from('enquiries').update({ deleted_at: null }).eq('id', id);
    fetchData();
  };

  const copyWA = async (row: EnquiryRow) => {
    let subjectText = row.subject;
    if (!subjectText) {
      const { data } = await supabase.from('enquiries').select('subject').eq('id', row.id).single();
      subjectText = data?.subject || row.vessel_name || '';
    }
    await navigator.clipboard.writeText(buildWhatsAppText({
      enquiry_number: row.enquiry_number,
      subject: subjectText,
      vessel_type: row.vessel_type,
      notes: row.notes,
    }));
    toast({ title: 'Copied ✓' });
  };

  const filtered = useMemo(() => {
    let result = rows.filter(r => {
      if (!showArchived && r.deleted_at) return false;
      if (fVesselType !== 'all' && r.vessel_type !== fVesselType) return false;
      if (fOpenPort && !r.loading_port?.toLowerCase().includes(fOpenPort.toLowerCase())) return false;
      if (fStatuses.length && !fStatuses.includes(r.status)) return false;
      return true;
    });
    result.sort((a, b) => {
      if (a.deleted_at && !b.deleted_at) return 1;
      if (!a.deleted_at && b.deleted_at) return -1;
      const av = (a as unknown as Record<string, unknown>)[sortCol];
      const bv = (b as unknown as Record<string, unknown>)[sortCol];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return sortAsc ? String(av).localeCompare(String(bv), undefined, { numeric: true }) : String(bv).localeCompare(String(av), undefined, { numeric: true });
    });
    return result;
  }, [rows, showArchived, fVesselType, fOpenPort, fStatuses, sortCol, sortAsc]);

  const toggleSort = (col: string) => {
    if (sortCol === col) setSortAsc(!sortAsc);
    else { setSortCol(col); setSortAsc(true); }
  };

  const SortHeader = ({ col, children }: { col: string; children: React.ReactNode }) => (
    <TableHead className="cursor-pointer select-none whitespace-nowrap" onClick={() => toggleSort(col)}>
      <span className="inline-flex items-center gap-1">{children} <ArrowUpDown className="h-3 w-3 text-muted-foreground" /></span>
    </TableHead>
  );

  return (
    <div className="space-y-4">
      {/* ── Form ── */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <h2 className="text-base font-semibold flex items-center gap-2"><Ship className="h-4 w-4" /> New Vessel Open</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Vessel Name</Label>
            <Input value={vesselName} onChange={e => setVesselName(e.target.value)} placeholder="MV PACIFIC STAR" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Vessel Type <span className="text-destructive">*</span></Label>
            <Select value={vesselType} onValueChange={setVesselType}>
              <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
              <SelectContent>{VESSEL_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">DWT</Label>
            <Input type="number" value={dwt} onChange={e => setDwt(e.target.value)} placeholder="47000" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Open Port / Area <span className="text-destructive">*</span></Label>
            <Input value={openPort} onChange={e => setOpenPort(e.target.value)} placeholder="SINGAPORE" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Open Date From <span className="text-destructive">*</span></Label>
            <DatePickerField value={openFrom} onChange={setOpenFrom} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Open Date To</Label>
            <DatePickerField value={openTo} onChange={setOpenTo} />
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Notes / Trading Limits</Label>
          <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={1} placeholder="Optional" className="min-h-[36px]" />
        </div>

        <div className="rounded border bg-indigo-50 dark:bg-indigo-950/30 px-3 py-2">
          <span className="text-xs text-indigo-700 dark:text-indigo-300 font-medium">Subject preview</span>
          <p className="text-xs font-mono text-foreground mt-0.5">{subject}</p>
        </div>

        <div className="flex gap-2">
          <Button size="sm" disabled={submitting} onClick={handleSubmit}>
            {submitting && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
            Create Vessel Open
          </Button>
          <Button size="sm" variant="ghost" onClick={clearForm}>Clear</Button>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={fVesselType} onValueChange={setFVesselType}>
          <SelectTrigger className="w-28 h-8 text-xs"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {VESSEL_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input value={fOpenPort} onChange={e => setFOpenPort(e.target.value)} placeholder="Open Port" className="w-28 h-8 text-xs" />
        <Select value={fStatuses.length === 1 ? fStatuses[0] : 'all'} onValueChange={v => setFStatuses(v === 'all' ? [] : [v])}>
          <SelectTrigger className="w-28 h-8 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Checkbox checked={showArchived} onCheckedChange={v => setShowArchived(!!v)} />
          Archived
        </label>
      </div>

      {/* ── Table ── */}
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="rounded-lg border overflow-auto max-h-[60vh]">
          <Table>
            <TableHeader>
              <TableRow>
                <SortHeader col="enquiry_number">ENQ #</SortHeader>
                <SortHeader col="vessel_name">Vessel</SortHeader>
                <SortHeader col="vessel_type">Type</SortHeader>
                <TableHead>DWT</TableHead>
                <SortHeader col="loading_port">Open Port</SortHeader>
                <SortHeader col="laycan_from">Open Date</SortHeader>
                <SortHeader col="status">Status</SortHeader>
                <SortHeader col="created_at">Date</SortHeader>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No vessel opens</TableCell></TableRow>
              )}
              {filtered.map(row => {
                const dwtVal = (row.other_requirements as Record<string, unknown>)?.dwt;
                return (
                  <TableRow key={row.id} className={cn(row.deleted_at && 'opacity-40')}>
                    <TableCell>
                      <button className="text-primary hover:underline font-mono text-xs" onClick={() => navigate(`/enquiries/${row.id}`)}>
                        {row.enquiry_number || '—'}
                      </button>
                    </TableCell>
                    <TableCell className="text-xs">{row.vessel_name || 'TBN'}</TableCell>
                    <TableCell className="text-xs">{row.vessel_type || '—'}</TableCell>
                    <TableCell className="text-xs">{dwtVal != null ? String(dwtVal) : '—'}</TableCell>
                    <TableCell className="text-xs">{row.loading_port || '—'}</TableCell>
                    <TableCell className="text-xs whitespace-nowrap">{formatLaycanShort(row.laycan_from, row.laycan_to)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn('text-[10px]', STATUS_COLORS[row.status] || '')}>{row.status}</Badge>
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      {row.created_at ? format(new Date(row.created_at), 'dd MMM') : '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <button className="p-1 rounded hover:bg-muted" title="Copy WhatsApp" onClick={() => copyWA(row)}><Copy className="h-3.5 w-3.5" /></button>
                        <button className="p-1 rounded hover:bg-muted" title="Open" onClick={() => navigate(`/enquiries/${row.id}`)}><ExternalLink className="h-3.5 w-3.5" /></button>
                        {row.deleted_at ? (
                          <button className="p-1 rounded hover:bg-muted text-green-600" title="Restore" onClick={() => restore(row.id)}><RotateCcw className="h-3.5 w-3.5" /></button>
                        ) : (
                          <button className="p-1 rounded hover:bg-muted text-destructive" title="Archive" onClick={() => setDeleteId(row.id)}><Trash2 className="h-3.5 w-3.5" /></button>
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

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this enquiry?</AlertDialogTitle>
            <AlertDialogDescription>The enquiry will be soft-deleted and can be restored later.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && softDelete(deleteId)}>Archive</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// SHARED: DatePickerField
// ═══════════════════════════════════════════════════════════════════════
function DatePickerField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const dateVal = value ? new Date(value + 'T00:00:00') : undefined;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" type="button" className={cn('w-full justify-start text-left font-normal h-9 text-xs', !value && 'text-muted-foreground')}>
          <CalendarIcon className="mr-2 h-3.5 w-3.5" />
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
