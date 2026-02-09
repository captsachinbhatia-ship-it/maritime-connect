import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Loader2, ExternalLink, Send, ChevronLeft, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { fetchEnquiryFeed, EnquiryFeedRow } from '@/services/enquiries';
import {
  STATUS_COLORS, PRIORITY_COLORS, MODE_COLORS, MODE_LABELS,
  deriveDisplayMode,
} from '@/lib/enquiryConstants';
import { CreateQuoteModal } from './CreateQuoteModal';

export function EnquiryFeedTab() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<EnquiryFeedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<EnquiryFeedRow | null>(null);

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

  useEffect(() => { loadData(); }, [loadData]);

  const handleQuoteSuccess = () => {
    setQuoteModalOpen(false);
    setSelectedRow(null);
    toast({ title: 'Offer sent and logged' });
    loadData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (rows.length === 0) {
    return <div className="text-center py-16 text-muted-foreground">No enquiries in the market feed.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">Enquiry #</TableHead>
              <TableHead className="w-[90px]">Mode</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead className="w-[110px]">Status</TableHead>
              <TableHead className="w-[80px]">Priority</TableHead>
              <TableHead className="w-[120px]">Updated</TableHead>
              <TableHead className="w-[150px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const mode = deriveDisplayMode(row);
              return (
                <TableRow
                  key={row.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/enquiries/${row.id}`)}
                >
                  <TableCell className="font-mono text-xs">{row.enquiry_number}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={MODE_COLORS[mode]}>
                      {MODE_LABELS[mode]}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[300px] truncate">{row.subject || '—'}</TableCell>
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
                  <TableCell className="text-sm text-muted-foreground">
                    {row.updated_at ? format(new Date(row.updated_at), 'dd MMM yyyy') : '—'}
                  </TableCell>
                  <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => navigate(`/enquiries/${row.id}`)}>
                        <ExternalLink className="h-3.5 w-3.5 mr-1" /> Open
                      </Button>
                      <Button
                        variant="ghost" size="sm" className="h-7 px-2 text-xs"
                        onClick={() => { setSelectedRow(row); setQuoteModalOpen(true); }}
                      >
                        <Send className="h-3.5 w-3.5 mr-1" /> Offer
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
        <p className="text-sm text-muted-foreground">Page {page + 1}</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Previous
          </Button>
          <Button variant="outline" size="sm" disabled={!hasMore} onClick={() => setPage(p => p + 1)}>
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>

      {/* Offer Modal */}
      {selectedRow && (
        <CreateQuoteModal
          open={quoteModalOpen}
          onOpenChange={setQuoteModalOpen}
          enquiryId={selectedRow.id}
          contactId={selectedRow.contact_id}
          onSuccess={handleQuoteSuccess}
        />
      )}
    </div>
  );
}
