import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import {
  Loader2, Filter, Ship, Package, MapPin, Calendar, User, Building2, ChevronDown, Copy,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';
import {
  TANKER_STATUSES, STATUS_COLORS, PRIORITY_COLORS, MODE_COLORS, MODE_LABELS,
  deriveDisplayMode, formatLaycan,
} from '@/lib/enquiryConstants';
import { buildWhatsAppText } from '@/lib/enquirySubject';

const PAGE_SIZE = 20;

interface FeedRow {
  enquiry_id: string;
  enquiry_number: string;
  subject: string | null;
  status: string;
  priority: string | null;
  enquiry_mode: string | null;
  cargo_type: string | null;
  quantity: number | null;
  quantity_unit: string | null;
  loading_port: string | null;
  discharge_port: string | null;
  laycan_from: string | null;
  laycan_to: string | null;
  vessel_name: string | null;
  vessel_type: string | null;
  contact_display_name: string | null;
  company_name: string | null;
  created_by_name: string | null;
  created_at: string | null;
  [key: string]: unknown;
}

interface Props {
  tab: 'ALL' | 'MY_ENQS' | 'HOT';
}

export function EnquiryGlobalFeed({ tab }: Props) {
  const navigate = useNavigate();
  const [rows, setRows] = useState<FeedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [modeFilter, setModeFilter] = useState<string>('all');

  const fetchPage = useCallback(async (offset: number, append: boolean) => {
    if (!append) setLoading(true);
    else setLoadingMore(true);

    try {
      const { data, error } = await supabase.rpc('rpc_enquiry_feed_page', {
        p_limit: PAGE_SIZE,
        p_offset: offset,
        p_tab: tab,
        p_status: statusFilter !== 'all' ? statusFilter : null,
        p_mode: modeFilter !== 'all' ? modeFilter : null,
      });

      if (error) {
        toast({ title: 'Error loading enquiries', description: error.message, variant: 'destructive' });
        if (!append) setRows([]);
      } else {
        const fetched = (data || []) as FeedRow[];
        if (append) {
          setRows((prev) => [...prev, ...fetched]);
        } else {
          setRows(fetched);
        }
        setHasMore(fetched.length >= PAGE_SIZE);
      }
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [tab, statusFilter, modeFilter]);

  // Reset and load first page on filter/tab change
  useEffect(() => {
    setPage(0);
    fetchPage(0, false);
  }, [fetchPage]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchPage(nextPage * PAGE_SIZE, true);
  };

  // Filters bar
  const filtersBar = (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="w-[150px]">
          <Filter className="h-3.5 w-3.5 mr-1.5" />
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          {TANKER_STATUSES.map((s) => (
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
          <SelectItem value="GENERAL">General</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  if (loading) {
    return (
      <>
        {filtersBar}
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </>
    );
  }

  if (rows.length === 0) {
    return (
      <>
        {filtersBar}
        <div className="text-center py-16 text-muted-foreground">No enquiries found.</div>
      </>
    );
  }

  return (
    <>
      {filtersBar}
      <div className="grid gap-3">
        {rows.map((row) => {
          const mode = deriveDisplayMode(row);
          const contactName = row.contact_display_name ?? 'Confidential Contact';
          return (
            <Card
              key={row.enquiry_id}
              className="cursor-pointer hover:border-primary/40 transition-colors"
              onClick={() => navigate(`/enquiries/${row.enquiry_id}`)}
            >
              <CardContent className="p-4">
                {/* Row 1: Number, mode, status, priority, copy */}
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="font-mono text-sm font-semibold">{row.enquiry_number}</span>
                  <Badge variant="outline" className={MODE_COLORS[mode]}>
                    {MODE_LABELS[mode]}
                  </Badge>
                  <Badge variant="outline" className={STATUS_COLORS[row.status] || ''}>
                    {row.status?.replace(/_/g, ' ')}
                  </Badge>
                  {row.priority && (
                    <Badge variant="outline" className={PRIORITY_COLORS[row.priority] || ''}>
                      {row.priority}
                    </Badge>
                  )}
                  <button
                    className="ml-auto p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    title="Copy WhatsApp text"
                    onClick={async (e) => {
                      e.stopPropagation();
                      await navigator.clipboard.writeText(buildWhatsAppText({
                        enquiry_number: row.enquiry_number,
                        subject: row.subject,
                        vessel_type: row.vessel_type,
                        notes: null,
                      }));
                      toast({ title: 'Copied to clipboard ✓' });
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Row 2: Subject */}
                {row.subject && (
                  <p className="text-sm text-foreground mb-2 line-clamp-1">{row.subject}</p>
                )}

                {/* Row 3: Key details */}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mb-2">
                  {(row.loading_port || row.discharge_port) && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {row.loading_port || '?'} → {row.discharge_port || '?'}
                    </span>
                  )}
                  {(row.laycan_from || row.laycan_to) && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatLaycan(row.laycan_from, row.laycan_to)}
                    </span>
                  )}
                  {row.quantity != null && (
                    <span className="flex items-center gap-1">
                      <Package className="h-3 w-3" />
                      {row.quantity.toLocaleString()} {row.quantity_unit || ''}
                    </span>
                  )}
                  {row.vessel_type && (
                    <span className="flex items-center gap-1">
                      <Ship className="h-3 w-3" />
                      {row.vessel_type}
                    </span>
                  )}
                </div>

                {/* Row 4: Contact, company, creator */}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {contactName}
                  </span>
                  {row.company_name && (
                    <span className="flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {row.company_name}
                    </span>
                  )}
                  <span>
                    Created by: {row.created_by_name || '—'} ·{' '}
                    {row.created_at
                      ? formatDistanceToNow(new Date(row.created_at), { addSuffix: true })
                      : '—'}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Load more */}
      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button variant="outline" onClick={handleLoadMore} disabled={loadingMore} className="gap-2">
            {loadingMore ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
            Load more
          </Button>
        </div>
      )}
    </>
  );
}
