import { useState, useEffect, useMemo, useCallback } from 'react';
import { CargoEnquiryModal } from '@/components/enquiries/CargoEnquiryModal';
import { useNavigate } from 'react-router-dom';
import { format, addDays } from 'date-fns';
import {
  Loader2, Anchor, Copy, Trash2, RotateCcw, ArrowUpDown, ExternalLink,
  CalendarIcon, Fuel, Ship, Plus,
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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { generateCargoSubject, generateVesselSubject, buildWhatsAppText } from '@/lib/enquirySubject';

// ─── Constants ────────────────────────────────────────────────────────
const UNIT_OPTIONS = ['MT', 'CBM', 'BBLS', 'LOTS'];
import { VESSEL_SIZE_OPTIONS } from '@/lib/vesselSizes';
const STATUS_OPTIONS = ['RECEIVED', 'SCREENING', 'IN_MARKET', 'OFFER_OUT', 'COUNTERING', 'SUBJECTS', 'FIXED', 'FAILED', 'CANCELLED', 'WITHDRAWN'];

const STATUS_COLORS: Record<string, string> = {
  RECEIVED: 'bg-muted text-muted-foreground',
  SCREENING: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  IN_MARKET: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
  OFFER_OUT: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
  COUNTERING: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  SUBJECTS: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  FIXED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  FAILED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  CANCELLED: 'bg-red-200 text-red-900 dark:bg-red-950 dark:text-red-400',
  WITHDRAWN: 'bg-muted text-muted-foreground',
  DELETED: 'bg-muted text-muted-foreground',
};

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
  crm_users?: { full_name: string } | null;
}

// ─── Main Page ────────────────────────────────────────────────────────
export default function Enquiries() {
  const [cargoModalOpen, setCargoModalOpen] = useState(false);
  const [vesselModalOpen, setVesselModalOpen] = useState(false);
  const [cargoRefresh, setCargoRefresh] = useState(0);
  const [vesselRefresh, setVesselRefresh] = useState(0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Anchor className="h-6 w-6" />
        <h1 className="text-2xl font-bold text-foreground">Enquiries</h1>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
        <div className="pr-3 flex flex-col gap-4">
          <Button onClick={() => setCargoModalOpen(true)} className="w-fit">
            <Plus className="h-4 w-4 mr-1" /> New Cargo Enquiry
          </Button>
          <CargoTable key={`cargo-${cargoRefresh}`} refreshKey={cargoRefresh} />
        </div>
        <div className="pl-3 border-l border-border flex flex-col gap-4">
          <Button onClick={() => setVesselModalOpen(true)} className="w-fit">
            <Plus className="h-4 w-4 mr-1" /> New Vessel Open
          </Button>
          <VesselTable key={`vessel-${vesselRefresh}`} refreshKey={vesselRefresh} />
        </div>
      </div>

      {/* Modals */}
      <CargoEnquiryModal open={cargoModalOpen} onClose={() => setCargoModalOpen(false)} onCreated={() => setCargoRefresh(p => p + 1)} />
      <VesselModal open={vesselModalOpen} onClose={() => setVesselModalOpen(false)} onCreated={() => setVesselRefresh(p => p + 1)} />
    </div>
  );
}



// ═══════════════════════════════════════════════════════════════════════
// VESSEL MODAL
// ═══════════════════════════════════════════════════════════════════════
function VesselModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [vesselSizeClass, setVesselSizeClass] = useState('');
  const [dwt, setDwt] = useState('');
  const [vesselName, setVesselName] = useState('');
  const [openPort, setOpenPort] = useState('');
  const [openFrom, setOpenFrom] = useState('');
  const [openTo, setOpenTo] = useState('');
  const [tradingArea, setTradingArea] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Auto-set openTo when openFrom changes
  useEffect(() => {
    if (openFrom && !openTo) setOpenTo(fmtDate(addDays(new Date(openFrom), 7)));
  }, [openFrom]); // eslint-disable-line react-hooks/exhaustive-deps

  const subject = useMemo(() => generateVesselSubject({
    vesselName, vesselType: vesselSizeClass, openPort, laycanFrom: openFrom,
  }), [vesselName, vesselSizeClass, openPort, openFrom]);

  const clearForm = () => {
    setVesselSizeClass(''); setDwt(''); setVesselName('');
    setOpenPort(''); setOpenFrom(''); setOpenTo('');
    setTradingArea(''); setNotes('');
  };

  const handleSubmit = async () => {
    const missing: string[] = [];
    if (!vesselSizeClass) missing.push('Vessel Size Class');
    if (!openPort.trim()) missing.push('Open Port');
    if (!openFrom) missing.push('Open Date From');
    if (missing.length) {
      toast({ title: 'Required fields missing', description: missing.join(', '), variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const subj = generateVesselSubject({ vesselName, vesselType: vesselSizeClass, openPort, laycanFrom: openFrom });
      const { error } = await supabase.rpc('rpc_create_enquiry_fast', {
        p_mode: 'TC', p_subject: subj,
        p_vessel_name: vesselName.trim() || null,
        p_vessel_type: vesselSizeClass,
        p_lp: openPort.trim(),
        p_dp: tradingArea.trim() || 'WORLDWIDE',
        p_laycan_from: openFrom,
        p_laycan_to: openTo || null,
        p_notes: notes.trim() || null,
        p_other_requirements: dwt ? { dwt: Number(dwt) } : null,
        p_is_draft: false,
      });
      if (error) {
        const msg = error.message.includes('CRM user mapping missing')
          ? 'Your account is not linked to a CRM profile. Contact your admin.'
          : error.message;
        toast({ title: 'Error', description: msg, variant: 'destructive' });
        return;
      }
      toast({ title: 'Vessel open created' });
      clearForm();
      onCreated();
      onClose();
    } finally { setSubmitting(false); }
  };

  const handleClose = () => {
    const hasData = vesselSizeClass || vesselName || openPort || openFrom || notes;
    if (hasData && !window.confirm('Discard unsaved changes?')) return;
    clearForm();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Ship className="h-5 w-5" /> New Vessel Open</DialogTitle>
          <DialogDescription>Create a new vessel open position. Required fields marked with *.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {/* Size + DWT */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Vessel Size Class <span className="text-destructive">*</span></Label>
              <Select value={vesselSizeClass} onValueChange={setVesselSizeClass}>
                <SelectTrigger><SelectValue placeholder="Select size..." /></SelectTrigger>
                <SelectContent>{VESSEL_SIZE_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">DWT / Capacity</Label>
              <Input type="number" value={dwt} onChange={e => setDwt(e.target.value)} placeholder="47000" />
            </div>
          </div>

          {/* Name + Port */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Vessel Name</Label>
              <Input value={vesselName} onChange={e => setVesselName(e.target.value)} placeholder="MV PACIFIC STAR (optional)" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Open Port / Area <span className="text-destructive">*</span></Label>
              <Input value={openPort} onChange={e => setOpenPort(e.target.value)} placeholder="Fujairah, Singapore" />
            </div>
          </div>

          {/* Dates */}
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

          {/* Trading area + Notes */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Trading Area / Limits</Label>
              <Input value={tradingArea} onChange={e => setTradingArea(e.target.value)} placeholder="WORLDWIDE, EAST OF SUEZ" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Notes</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Optional" className="min-h-[60px]" />
            </div>
          </div>

          {/* Subject preview */}
          <div className="rounded border bg-muted/50 px-3 py-2">
            <span className="text-xs text-muted-foreground font-medium">Subject preview — auto-generated</span>
            <p className="text-xs font-mono text-foreground mt-0.5">{subject}</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={handleClose}>Cancel</Button>
          <Button disabled={submitting} onClick={handleSubmit}>
            {submitting && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
            Create Vessel Open
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// CARGO TABLE
// ═══════════════════════════════════════════════════════════════════════
function CargoTable({ refreshKey }: { refreshKey: number }) {
  const navigate = useNavigate();
  const [rows, setRows] = useState<EnquiryRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [fProduct, setFProduct] = useState('');
  const [fLoadArea, setFLoadArea] = useState('');
  const [fDischArea, setFDischArea] = useState('');
  const [fStatuses, setFStatuses] = useState<string[]>([]);
  const [showArchived, setShowArchived] = useState(false);

  // Sort
  const [sortCol, setSortCol] = useState<string>('laycan_from');
  const [sortAsc, setSortAsc] = useState(true);

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('enquiries')
      .select(`
        id, enquiry_number, cargo_type, quantity, quantity_unit,
        loading_port, discharge_port, laycan_from, laycan_to,
        vessel_type, vessel_name, status, subject, notes, created_by, created_at, deleted_at, enquiry_mode, other_requirements,
        crm_users!created_by (full_name)
      `)
      .in('enquiry_mode', ['SPOT', 'VOY', 'CVC', 'BB'])
      .eq('is_draft', false)
      .order('created_at', { ascending: false });
    if (!error && data) setRows(data as unknown as EnquiryRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData, refreshKey]);

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
      const { data } = await supabase.from('enquiries').select('subject, vessel_type, notes').eq('id', row.id).single();
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

  const filtered = useMemo(() => {
    let result = rows.filter(r => {
      if (!showArchived && r.deleted_at) return false;
      if (fProduct && !r.cargo_type?.toLowerCase().includes(fProduct.toLowerCase())) return false;
      if (fLoadArea && !r.loading_port?.toLowerCase().includes(fLoadArea.toLowerCase())) return false;
      if (fDischArea && !r.discharge_port?.toLowerCase().includes(fDischArea.toLowerCase())) return false;
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
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
      return sortAsc ? cmp : -cmp;
    });
    return result;
  }, [rows, showArchived, fProduct, fLoadArea, fDischArea, fStatuses, sortCol, sortAsc]);

  const toggleSort = (col: string) => {
    if (sortCol === col) setSortAsc(!sortAsc);
    else { setSortCol(col); setSortAsc(true); }
  };

  const SortHeader = ({ col, children }: { col: string; children: React.ReactNode }) => (
    <TableHead className="cursor-pointer select-none whitespace-nowrap text-xs" onClick={() => toggleSort(col)}>
      <span className="inline-flex items-center gap-1">{children} <ArrowUpDown className="h-3 w-3 text-muted-foreground" /></span>
    </TableHead>
  );

  const isDeleted = (r: EnquiryRow) => !!r.deleted_at;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold flex items-center gap-1.5"><Fuel className="h-4 w-4" /> Cargo Enquiries</h2>
        <Badge variant="secondary" className="text-xs">{filtered.length}</Badge>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Input value={fProduct} onChange={e => setFProduct(e.target.value)} placeholder="Product" className="w-24 h-7 text-xs" />
        <Input value={fLoadArea} onChange={e => setFLoadArea(e.target.value)} placeholder="Load" className="w-20 h-7 text-xs" />
        <Input value={fDischArea} onChange={e => setFDischArea(e.target.value)} placeholder="Disch" className="w-20 h-7 text-xs" />
        <Select value={fStatuses.length === 1 ? fStatuses[0] : 'all'} onValueChange={v => setFStatuses(v === 'all' ? [] : [v])}>
          <SelectTrigger className="w-24 h-7 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <label className="flex items-center gap-1 text-xs text-muted-foreground">
          <Checkbox checked={showArchived} onCheckedChange={v => setShowArchived(!!v)} className="h-3.5 w-3.5" />
          Archived
        </label>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="rounded-lg border overflow-auto max-h-[65vh]">
          <Table>
            <TableHeader>
              <TableRow>
                <SortHeader col="enquiry_number">ENQ #</SortHeader>
                <SortHeader col="cargo_type">Product</SortHeader>
                <SortHeader col="quantity">Qty</SortHeader>
                <SortHeader col="loading_port">Load</SortHeader>
                <SortHeader col="discharge_port">Disch</SortHeader>
                <SortHeader col="laycan_from">Laycan</SortHeader>
                <SortHeader col="vessel_type">Vsl Size</SortHeader>
                <SortHeader col="status">Status</SortHeader>
                <SortHeader col="created_at">Date</SortHeader>
                <TableHead className="w-24 text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8 text-xs">No cargo enquiries</TableCell></TableRow>
              )}
              {filtered.map(row => (
                <TableRow
                  key={row.id}
                  className={cn(isDeleted(row) && 'bg-destructive/5')}
                >
                  <TableCell className={cn('text-xs', isDeleted(row) && 'line-through opacity-45')}>
                    <button className="text-primary hover:underline font-mono" onClick={() => navigate(`/enquiries/${row.id}`)}>
                      {row.enquiry_number || '—'}
                    </button>
                  </TableCell>
                  <TableCell className={cn('text-xs uppercase', isDeleted(row) && 'line-through opacity-45')}>{row.cargo_type || '—'}</TableCell>
                  <TableCell className={cn('text-xs whitespace-nowrap', isDeleted(row) && 'line-through opacity-45')}>{formatQty(row.quantity, row.quantity_unit)}</TableCell>
                  <TableCell className={cn('text-xs uppercase', isDeleted(row) && 'line-through opacity-45')}>{row.loading_port || '—'}</TableCell>
                  <TableCell className={cn('text-xs uppercase', isDeleted(row) && 'line-through opacity-45')}>{row.discharge_port || '—'}</TableCell>
                  <TableCell className={cn('text-xs whitespace-nowrap', isDeleted(row) && 'line-through opacity-45')}>{formatLaycanShort(row.laycan_from, row.laycan_to)}</TableCell>
                  <TableCell className={cn('text-xs', isDeleted(row) && 'line-through opacity-45')}>{row.vessel_type || '—'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn('text-[10px]', isDeleted(row) ? STATUS_COLORS.DELETED : (STATUS_COLORS[row.status] || ''))}>
                      {isDeleted(row) ? 'DELETED' : row.status}
                    </Badge>
                  </TableCell>
                  <TableCell className={cn('text-xs whitespace-nowrap', isDeleted(row) && 'line-through opacity-45')}>
                    {row.created_at ? format(new Date(row.created_at), 'dd MMM') : '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-0.5">
                      <button className="p-1 rounded hover:bg-muted" title="Copy WhatsApp" onClick={() => copyWA(row)}><Copy className="h-3.5 w-3.5" /></button>
                      <button className="p-1 rounded hover:bg-muted" title="Open" onClick={() => navigate(`/enquiries/${row.id}`)}><ExternalLink className="h-3.5 w-3.5" /></button>
                      {isDeleted(row) ? (
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
            <AlertDialogDescription>It will move to the bottom of the list and can be restored later.</AlertDialogDescription>
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
// VESSEL TABLE
// ═══════════════════════════════════════════════════════════════════════
function VesselTable({ refreshKey }: { refreshKey: number }) {
  const navigate = useNavigate();
  const [rows, setRows] = useState<EnquiryRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [fVesselType, setFVesselType] = useState('all');
  const [fOpenPort, setFOpenPort] = useState('');
  const [fStatuses, setFStatuses] = useState<string[]>([]);
  const [showArchived, setShowArchived] = useState(false);

  // Sort
  const [sortCol, setSortCol] = useState<string>('laycan_from');
  const [sortAsc, setSortAsc] = useState(true);

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('enquiries')
      .select(`
        id, enquiry_number, vessel_name, vessel_type,
        loading_port, discharge_port, laycan_from, laycan_to,
        other_requirements, status, subject, notes, cargo_type, quantity, quantity_unit,
        created_by, created_at, deleted_at, enquiry_mode,
        crm_users!created_by (full_name)
      `)
      .in('enquiry_mode', ['TC', 'SNP'])
      .eq('is_draft', false)
      .order('created_at', { ascending: false });
    if (!error && data) setRows(data as unknown as EnquiryRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData, refreshKey]);

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
      const { data } = await supabase.from('enquiries').select('subject, notes').eq('id', row.id).single();
      subjectText = data?.subject || row.vessel_name || '';
    }
    const lines = [row.enquiry_number];
    if (subjectText) lines.push(subjectText);
    if (row.vessel_type) lines.push(row.vessel_type.toUpperCase());
    lines.push('PLS REVERT');
    await navigator.clipboard.writeText(lines.join('\n'));
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
    <TableHead className="cursor-pointer select-none whitespace-nowrap text-xs" onClick={() => toggleSort(col)}>
      <span className="inline-flex items-center gap-1">{children} <ArrowUpDown className="h-3 w-3 text-muted-foreground" /></span>
    </TableHead>
  );

  const isDeleted = (r: EnquiryRow) => !!r.deleted_at;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold flex items-center gap-1.5"><Ship className="h-4 w-4" /> Vessel Opens</h2>
        <Badge variant="secondary" className="text-xs">{filtered.length}</Badge>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={fVesselType} onValueChange={setFVesselType}>
          <SelectTrigger className="w-24 h-7 text-xs"><SelectValue placeholder="Size" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sizes</SelectItem>
            {VESSEL_SIZE_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input value={fOpenPort} onChange={e => setFOpenPort(e.target.value)} placeholder="Open Port" className="w-24 h-7 text-xs" />
        <Select value={fStatuses.length === 1 ? fStatuses[0] : 'all'} onValueChange={v => setFStatuses(v === 'all' ? [] : [v])}>
          <SelectTrigger className="w-24 h-7 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <label className="flex items-center gap-1 text-xs text-muted-foreground">
          <Checkbox checked={showArchived} onCheckedChange={v => setShowArchived(!!v)} className="h-3.5 w-3.5" />
          Archived
        </label>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="rounded-lg border overflow-auto max-h-[65vh]">
          <Table>
            <TableHeader>
              <TableRow>
                <SortHeader col="enquiry_number">ENQ #</SortHeader>
                <SortHeader col="vessel_name">Vessel</SortHeader>
                <SortHeader col="vessel_type">Size</SortHeader>
                <TableHead className="text-xs">DWT</TableHead>
                <SortHeader col="loading_port">Open Port</SortHeader>
                <SortHeader col="laycan_from">Open Date</SortHeader>
                <SortHeader col="discharge_port">Trading</SortHeader>
                <SortHeader col="status">Status</SortHeader>
                <SortHeader col="created_at">Date</SortHeader>
                <TableHead className="w-24 text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8 text-xs">No vessel opens</TableCell></TableRow>
              )}
              {filtered.map(row => {
                const dwtVal = (row.other_requirements as Record<string, unknown>)?.dwt;
                return (
                  <TableRow key={row.id} className={cn(isDeleted(row) && 'bg-destructive/5')}>
                    <TableCell className={cn('text-xs', isDeleted(row) && 'line-through opacity-45')}>
                      <button className="text-primary hover:underline font-mono" onClick={() => navigate(`/enquiries/${row.id}`)}>
                        {row.enquiry_number || '—'}
                      </button>
                    </TableCell>
                    <TableCell className={cn('text-xs', isDeleted(row) && 'line-through opacity-45')}>{row.vessel_name || 'TBN'}</TableCell>
                    <TableCell className={cn('text-xs', isDeleted(row) && 'line-through opacity-45')}>{row.vessel_type || '—'}</TableCell>
                    <TableCell className={cn('text-xs', isDeleted(row) && 'line-through opacity-45')}>{dwtVal != null ? String(dwtVal) : '—'}</TableCell>
                    <TableCell className={cn('text-xs uppercase', isDeleted(row) && 'line-through opacity-45')}>{row.loading_port || '—'}</TableCell>
                    <TableCell className={cn('text-xs whitespace-nowrap', isDeleted(row) && 'line-through opacity-45')}>{formatLaycanShort(row.laycan_from, null)}</TableCell>
                    <TableCell className={cn('text-xs uppercase', isDeleted(row) && 'line-through opacity-45')}>{row.discharge_port || '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn('text-[10px]', isDeleted(row) ? STATUS_COLORS.DELETED : (STATUS_COLORS[row.status] || ''))}>
                        {isDeleted(row) ? 'DELETED' : row.status}
                      </Badge>
                    </TableCell>
                    <TableCell className={cn('text-xs whitespace-nowrap', isDeleted(row) && 'line-through opacity-45')}>
                      {row.created_at ? format(new Date(row.created_at), 'dd MMM') : '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-0.5">
                        <button className="p-1 rounded hover:bg-muted" title="Copy WhatsApp" onClick={() => copyWA(row)}><Copy className="h-3.5 w-3.5" /></button>
                        <button className="p-1 rounded hover:bg-muted" title="Open" onClick={() => navigate(`/enquiries/${row.id}`)}><ExternalLink className="h-3.5 w-3.5" /></button>
                        {isDeleted(row) ? (
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
            <AlertDialogTitle>Archive this vessel open?</AlertDialogTitle>
            <AlertDialogDescription>It will move to the bottom and can be restored later.</AlertDialogDescription>
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
