import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Loader2, ExternalLink, Send, ChevronLeft, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import {
  fetchEnquiryFeed,
  EnquiryFeedRow,
  deriveEnquiryMode,
} from '@/services/enquiries';
import { CreateQuoteModal } from './CreateQuoteModal';

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

const MODE_COLORS: Record<string, string> = {
  CARGO_OPEN: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300',
  VESSEL_OPEN: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
  GENERAL: 'bg-muted text-muted-foreground',
};

const PRIORITY_COLORS: Record<string, string> = {
  URGENT: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  HIGH: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  MEDIUM: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
  LOW: 'bg-muted text-muted-foreground',
};

export function EnquiryFeedTab() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<EnquiryFeedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  // Quote modal
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const [selectedEnquiryForQuote, setSelectedEnquiryForQuote] = useState<EnquiryFeedRow | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const result = await fetchEnquiryFeed(page);
    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    } else {
      setRows(result.data || []);
      setHasMore(result.hasMore);
    }
    setLoading(false);
  }, [page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpen = (row: EnquiryFeedRow) => {
    navigate(`/enquiries/${row.id}`);
  };

  const handleAddQuote = (row: EnquiryFeedRow) => {
    setSelectedEnquiryForQuote(row);
    setQuoteModalOpen(true);
  };

  const handleQuoteSuccess = (enquiryId: string) => {
    setQuoteModalOpen(false);
    setSelectedEnquiryForQuote(null);
    navigate(`/enquiries/${enquiryId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        No enquiries found.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">Enquiry #</TableHead>
              <TableHead className="w-[100px]">Mode</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="w-[80px]">Priority</TableHead>
              <TableHead className="w-[140px]">Updated</TableHead>
              <TableHead className="w-[140px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const mode = deriveEnquiryMode(row);
              return (
                <TableRow key={row.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell className="font-mono text-xs">{row.enquiry_number}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={MODE_COLORS[mode]}>
                      {mode.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[300px] truncate">
                    {row.subject || '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={STATUS_COLORS[row.status] || ''}>
                      {row.status?.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {row.priority && (
                      <Badge variant="outline" className={PRIORITY_COLORS[row.priority] || ''}>
                        {row.priority}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {row.updated_at ? format(new Date(row.updated_at), 'MMM d, yyyy') : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={(e) => { e.stopPropagation(); handleOpen(row); }}
                      >
                        <ExternalLink className="h-3.5 w-3.5 mr-1" />
                        Open
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={(e) => { e.stopPropagation(); handleAddQuote(row); }}
                      >
                        <Send className="h-3.5 w-3.5 mr-1" />
                        Quote
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Page {page + 1}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage(p => p - 1)}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!hasMore}
            onClick={() => setPage(p => p + 1)}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>

      {/* Quote Modal */}
      {selectedEnquiryForQuote && (
        <CreateQuoteModal
          open={quoteModalOpen}
          onOpenChange={setQuoteModalOpen}
          enquiryId={selectedEnquiryForQuote.id}
          contactId={selectedEnquiryForQuote.contact_id}
          onSuccess={handleQuoteSuccess}
        />
      )}
    </div>
  );
}
