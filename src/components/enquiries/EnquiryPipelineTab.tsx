import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Loader2, Search, Filter, MessageSquarePlus, Send, ArrowUpDown,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/hooks/use-toast';
import {
  updateEnquiryStatus, addEnquiryNote,
  EnquiryStatus,
} from '@/services/enquiries';
import { supabase } from '@/lib/supabaseClient';
import { getCurrentCrmUserId } from '@/services/profiles';
import { CreateQuoteModal } from './CreateQuoteModal';
import {
  TANKER_STATUSES, STATUS_COLORS, PRIORITY_COLORS, MODE_COLORS, MODE_LABELS,
  deriveDisplayMode, formatLaycan, formatBudget, computeDaysOpen,
} from '@/lib/enquiryConstants';

interface PipelineRow {
  id: string;
  enquiry_number: string;
  subject: string | null;
  status: string;
  priority: string | null;
  contact_name: string | null;
  company_name: string | null;
  assigned_to: string | null;
  assigned_to_name: string | null;
  cargo_type: string | null;
  quantity: number | null;
  quantity_unit: string | null;
  loading_port: string | null;
  discharge_port: string | null;
  laycan_from: string | null;
  laycan_to: string | null;
  vessel_name: string | null;
  vessel_type: string | null;
  budget_min: number | null;
  budget_max: number | null;
  currency: string | null;
  quote_count: number | null;
  last_quote_sent: string | null;
  contact_id: string | null;
  created_at: string | null;
  enquiry_mode?: string | null;
}

export function EnquiryPipelineTab() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<PipelineRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [crmUserId, setCrmUserId] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [modeFilter, setModeFilter] = useState<string>('all');
  const [assignedFilter, setAssignedFilter] = useState<string>('me');

  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<PipelineRow | null>(null);
  const [addingNoteFor, setAddingNoteFor] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');

  useEffect(() => { getCurrentCrmUserId().then(r => setCrmUserId(r.data)); }, []);

  const loadData = useCallback(async () => {
    if (!crmUserId && assignedFilter === 'me') return;
    setLoading(true);

    // Try v_enquiry_pipeline first, fall back to enquiries
    let query = supabase.from('enquiries').select('*').order('created_at', { ascending: false });

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }
    if (assignedFilter === 'me' && crmUserId) {
      query = query.eq('assigned_to', crmUserId);
    }
    if (search) {
      const term = `%${search}%`;
      query = query.or(
        `enquiry_number.ilike.${term},subject.ilike.${term},vessel_name.ilike.${term},cargo_type.ilike.${term},loading_port.ilike.${term},discharge_port.ilike.${term}`
      );
    }

    const { data, error } = await query;

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      setLoading(false);
      return;
    }

    let filtered = (data || []) as PipelineRow[];

    // Client-side mode filter
    if (modeFilter !== 'all') {
      filtered = filtered.filter(row => {
        const mode = deriveDisplayMode(row);
        return mode === modeFilter;
      });
    }

    setRows(filtered);
    setLoading(false);
  }, [crmUserId, statusFilter, modeFilter, assignedFilter, search]);

  useEffect(() => {
    if (crmUserId !== null) loadData();
  }, [loadData, crmUserId]);

  const handleChangeStatus = async (id: string, newStatus: EnquiryStatus) => {
    const result = await updateEnquiryStatus(id, newStatus);
    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    } else {
      toast({ title: 'Status Updated' });
      loadData();
    }
  };

  const handleAddNote = async (enquiryId: string) => {
    if (!noteText.trim() || !crmUserId) return;
    const result = await addEnquiryNote(enquiryId, noteText.trim(), crmUserId);
    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    } else {
      toast({ title: 'Note Added' });
      setAddingNoteFor(null);
      setNoteText('');
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search enquiries..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <Filter className="h-3.5 w-3.5 mr-1.5" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {TANKER_STATUSES.map(s => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={modeFilter} onValueChange={setModeFilter}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Mode" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Modes</SelectItem>
            <SelectItem value="CARGO">Cargo</SelectItem>
            <SelectItem value="VESSEL">Vessel</SelectItem>
          </SelectContent>
        </Select>

        <Select value={assignedFilter} onValueChange={setAssignedFilter}>
          <SelectTrigger className="w-[100px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="me">Me</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          No enquiries match your filters.
        </div>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[110px]">Enquiry #</TableHead>
                <TableHead className="w-[80px]">Mode</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
                <TableHead className="w-[70px]">Priority</TableHead>
                <TableHead>Laycan</TableHead>
                <TableHead>Load → Disch</TableHead>
                <TableHead>Cargo / Vessel</TableHead>
                <TableHead>Budget / Idea</TableHead>
                <TableHead className="w-[100px]">Assigned</TableHead>
                <TableHead className="w-[50px] text-center">Days</TableHead>
                <TableHead className="w-[160px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const mode = deriveDisplayMode(row);
                const daysOpen = computeDaysOpen(row.created_at);
                return (
                  <TableRow
                    key={row.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/enquiries/${row.id}`)}
                  >
                    <TableCell className="font-mono text-xs">{row.enquiry_number}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={MODE_COLORS[mode]}>{MODE_LABELS[mode]}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={STATUS_COLORS[row.status] || ''}>
                        {row.status?.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {row.priority && (
                        <Badge variant="outline" className={PRIORITY_COLORS[row.priority] || ''}>
                          {row.priority}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      {formatLaycan(row.laycan_from, row.laycan_to)}
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      {row.loading_port || row.discharge_port
                        ? `${row.loading_port || '?'} → ${row.discharge_port || '?'}`
                        : '—'}
                    </TableCell>
                    <TableCell className="text-xs">
                      {mode === 'CARGO' ? (
                        <div>
                          <div className="truncate">{row.cargo_type || '—'}</div>
                          {row.quantity && (
                            <div className="text-muted-foreground">{row.quantity.toLocaleString()} {row.quantity_unit || ''}</div>
                          )}
                        </div>
                      ) : mode === 'VESSEL' ? (
                        <div>
                          <div className="truncate font-medium">{row.vessel_name || '—'}</div>
                          <div className="text-muted-foreground">{row.vessel_type || ''}</div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      {formatBudget(row.budget_min, row.budget_max, row.currency)}
                    </TableCell>
                    <TableCell className="text-sm truncate">{row.assigned_to_name || '—'}</TableCell>
                    <TableCell className="text-center text-sm">{daysOpen ?? '—'}</TableCell>
                    <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                              <ArrowUpDown className="h-3.5 w-3.5 mr-1" /> Status
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {TANKER_STATUSES.slice(0, 10).map(s => (
                              <DropdownMenuItem
                                key={s.value}
                                onClick={() => handleChangeStatus(row.id, s.value as EnquiryStatus)}
                                disabled={row.status === s.value}
                              >
                                {s.label}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>

                        <Button
                          variant="ghost" size="sm" className="h-7 px-2 text-xs"
                          onClick={() => { setSelectedRow(row); setQuoteModalOpen(true); }}
                        >
                          <Send className="h-3.5 w-3.5" />
                        </Button>

                        <Button
                          variant="ghost" size="sm" className="h-7 px-2 text-xs"
                          onClick={() => setAddingNoteFor(row.id)}
                        >
                          <MessageSquarePlus className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      {addingNoteFor === row.id && (
                        <div className="mt-2 flex gap-1" onClick={e => e.stopPropagation()}>
                          <Input
                            placeholder="Add note..."
                            value={noteText}
                            onChange={e => setNoteText(e.target.value)}
                            className="h-7 text-xs"
                            onKeyDown={e => e.key === 'Enter' && handleAddNote(row.id)}
                            autoFocus
                          />
                          <Button size="sm" className="h-7 text-xs px-2" onClick={() => handleAddNote(row.id)}>Add</Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {selectedRow && (
        <CreateQuoteModal
          open={quoteModalOpen}
          onOpenChange={setQuoteModalOpen}
          enquiryId={selectedRow.id}
          contactId={selectedRow.contact_id}
          allowDraft
          onSuccess={() => { setQuoteModalOpen(false); loadData(); }}
        />
      )}
    </div>
  );
}
