import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  Loader2,
  Search,
  Filter,
  MessageSquarePlus,
  Send,
  ArrowUpDown,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/hooks/use-toast';
import {
  fetchEnquiryPipeline,
  EnquiryPipelineRow,
  EnquiryMode,
  EnquiryStatus,
  deriveEnquiryMode,
  updateEnquiryStatus,
  addEnquiryNote,
} from '@/services/enquiries';
import { getCurrentCrmUserId } from '@/services/profiles';
import { CreateQuoteModal } from './CreateQuoteModal';

const STATUS_OPTIONS: { value: EnquiryStatus; label: string }[] = [
  { value: 'NEW', label: 'New' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'QUOTED', label: 'Quoted' },
  { value: 'NEGOTIATING', label: 'Negotiating' },
  { value: 'WON', label: 'Won' },
  { value: 'LOST', label: 'Lost' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'ON_HOLD', label: 'On Hold' },
];

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

const PRIORITY_COLORS: Record<string, string> = {
  URGENT: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  HIGH: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  MEDIUM: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
  LOW: 'bg-muted text-muted-foreground',
};

const MODE_COLORS: Record<string, string> = {
  CARGO_OPEN: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300',
  VESSEL_OPEN: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
  GENERAL: 'bg-muted text-muted-foreground',
};

export function EnquiryPipelineTab() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<EnquiryPipelineRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [crmUserId, setCrmUserId] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [modeFilter, setModeFilter] = useState<string>('all');
  const [assignedFilter, setAssignedFilter] = useState<string>('me');

  // Quote modal
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<EnquiryPipelineRow | null>(null);

  // Note adding
  const [addingNoteFor, setAddingNoteFor] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');

  useEffect(() => {
    getCurrentCrmUserId().then(r => setCrmUserId(r.data));
  }, []);

  const loadData = useCallback(async () => {
    if (!crmUserId && assignedFilter === 'me') return;
    setLoading(true);

    const result = await fetchEnquiryPipeline({
      statuses: statusFilter !== 'all' ? [statusFilter] : undefined,
      mode: modeFilter !== 'all' ? (modeFilter as EnquiryMode) : null,
      assignedToMe: assignedFilter === 'me',
      crmUserId: crmUserId || undefined,
      search: search || undefined,
    });

    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    } else {
      setRows(result.data || []);
    }
    setLoading(false);
  }, [crmUserId, statusFilter, modeFilter, assignedFilter, search]);

  useEffect(() => {
    if (crmUserId !== null) {
      loadData();
    }
  }, [loadData, crmUserId]);

  const handleChangeStatus = async (enquiryId: string, newStatus: EnquiryStatus) => {
    const result = await updateEnquiryStatus(enquiryId, newStatus);
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
            onChange={(e) => setSearch(e.target.value)}
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
            {STATUS_OPTIONS.map(s => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={modeFilter} onValueChange={setModeFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Mode" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Modes</SelectItem>
            <SelectItem value="CARGO_OPEN">Cargo Open</SelectItem>
            <SelectItem value="VESSEL_OPEN">Vessel Open</SelectItem>
            <SelectItem value="GENERAL">General</SelectItem>
          </SelectContent>
        </Select>

        <Select value={assignedFilter} onValueChange={setAssignedFilter}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Assigned" />
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
                <TableHead>Subject</TableHead>
                <TableHead className="w-[90px]">Mode</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
                <TableHead className="w-[80px]">Priority</TableHead>
                <TableHead>Company / Contact</TableHead>
                <TableHead className="w-[120px]">Assigned</TableHead>
                <TableHead className="w-[60px] text-center">Days</TableHead>
                <TableHead className="w-[60px] text-center">Quotes</TableHead>
                <TableHead className="w-[160px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const mode = deriveEnquiryMode(row);
                return (
                  <TableRow
                    key={row.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/enquiries/${row.id}`)}
                  >
                    <TableCell className="font-mono text-xs">{row.enquiry_number}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{row.subject || '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={MODE_COLORS[mode]}>{mode.replace('_', ' ')}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={STATUS_COLORS[row.status] || ''}>{row.status?.replace('_', ' ')}</Badge>
                    </TableCell>
                    <TableCell>
                      {row.priority && <Badge variant="outline" className={PRIORITY_COLORS[row.priority] || ''}>{row.priority}</Badge>}
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="truncate">{row.company_name || ''}</div>
                      <div className="text-xs text-muted-foreground truncate">{row.contact_name || ''}</div>
                    </TableCell>
                    <TableCell className="text-sm truncate">{row.assigned_to_name || '—'}</TableCell>
                    <TableCell className="text-center text-sm">{row.days_open ?? '—'}</TableCell>
                    <TableCell className="text-center text-sm">{row.quote_count ?? 0}</TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                              <ArrowUpDown className="h-3.5 w-3.5 mr-1" />
                              Status
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {STATUS_OPTIONS.map(s => (
                              <DropdownMenuItem
                                key={s.value}
                                onClick={() => handleChangeStatus(row.id, s.value)}
                                disabled={row.status === s.value}
                              >
                                {s.label}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => { setSelectedRow(row); setQuoteModalOpen(true); }}
                        >
                          <Send className="h-3.5 w-3.5" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => setAddingNoteFor(row.id)}
                        >
                          <MessageSquarePlus className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      {/* Inline note input */}
                      {addingNoteFor === row.id && (
                        <div className="mt-2 flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <Input
                            placeholder="Add note..."
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            className="h-7 text-xs"
                            onKeyDown={(e) => e.key === 'Enter' && handleAddNote(row.id)}
                            autoFocus
                          />
                          <Button size="sm" className="h-7 text-xs px-2" onClick={() => handleAddNote(row.id)}>
                            Add
                          </Button>
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

      {/* Quote Modal */}
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
