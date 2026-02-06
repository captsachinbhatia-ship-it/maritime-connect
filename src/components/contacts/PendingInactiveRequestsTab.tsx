import { useState, useEffect, useCallback } from 'react';
import { Loader2, Check, X, RefreshCw, Clock, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';

interface PendingInactiveRequest {
  request_id: string;
  contact_id: string;
  contact_name: string;
  requested_by_name: string;
  reason: string;
  hours_pending: number;
  current_stage: string;
  requested_at: string;
}

const STAGE_COLORS: Record<string, string> = {
  COLD_CALLING: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  ASPIRATION: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
  ACHIEVEMENT: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  INACTIVE: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
};

export function PendingInactiveRequestsTab() {
  const { toast } = useToast();
  const [requests, setRequests] = useState<PendingInactiveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Decision dialog
  const [selectedRequest, setSelectedRequest] = useState<PendingInactiveRequest | null>(null);
  const [decision, setDecision] = useState<boolean | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadRequests = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('v_pending_inactive_requests')
        .select('*')
        .order('hours_pending', { ascending: false });

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setRequests(data || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load requests');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleProcess = async () => {
    if (!selectedRequest || decision === null) return;

    setIsSubmitting(true);

    try {
      const { error: rpcError } = await supabase.rpc('process_inactive_request', {
        p_request_id: selectedRequest.request_id,
        p_approve: decision,
        p_admin_notes: adminNotes.trim() || null,
      });

      if (rpcError) throw rpcError;

      toast({
        title: decision ? 'Request Approved' : 'Request Rejected',
        description: decision
          ? 'Contact has been marked as inactive and unassigned'
          : 'Request rejected, contact remains assigned',
      });

      setSelectedRequest(null);
      setDecision(null);
      setAdminNotes('');
      loadRequests();
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Processing Failed',
        description: err.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatHoursPending = (hours: number) => {
    if (hours == null) return '—';
    if (hours < 1) return 'Less than 1 hour';
    if (hours < 24) return `${Math.round(hours)} hour${Math.round(hours) !== 1 ? 's' : ''}`;
    const days = Math.floor(hours / 24);
    return `${days} day${days !== 1 ? 's' : ''}`;
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Pending Inactive Requests</CardTitle>
                <CardDescription>
                  {isLoading ? 'Loading...' : `${requests.length} request${requests.length !== 1 ? 's' : ''} awaiting decision`}
                </CardDescription>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={loadRequests} disabled={isLoading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <Check className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="mt-2 text-sm text-muted-foreground">No pending requests</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contact</TableHead>
                    <TableHead>Requested By</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Current Stage</TableHead>
                    <TableHead>Waiting</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((request) => (
                    <TableRow key={request.request_id}>
                      <TableCell className="font-medium">
                        {request.contact_name || '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {request.requested_by_name || 'Unknown'}
                      </TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">
                        {request.reason || '—'}
                      </TableCell>
                      <TableCell>
                        {request.current_stage ? (
                          <Badge className={STAGE_COLORS[request.current_stage] || ''}>
                            {request.current_stage.replace(/_/g, ' ')}
                          </Badge>
                        ) : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs text-orange-600">
                          {formatHoursPending(request.hours_pending)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={() => {
                              setSelectedRequest(request);
                              setDecision(true);
                            }}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              setSelectedRequest(request);
                              setDecision(false);
                            }}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Decision Dialog */}
      <Dialog
        open={!!selectedRequest && decision !== null}
        onOpenChange={(open) => {
          if (!open && !isSubmitting) {
            setSelectedRequest(null);
            setDecision(null);
            setAdminNotes('');
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {decision ? 'Approve' : 'Reject'} Inactive Request
            </DialogTitle>
            <DialogDescription>
              {decision
                ? `This will mark ${selectedRequest?.contact_name} as inactive and remove their assignment.`
                : `This will reject the request. ${selectedRequest?.contact_name} remains assigned.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="rounded-lg bg-muted/50 p-3 space-y-1">
              <p className="text-sm">
                <span className="font-medium">Contact:</span> {selectedRequest?.contact_name}
              </p>
              <p className="text-sm">
                <span className="font-medium">Requested By:</span> {selectedRequest?.requested_by_name}
              </p>
              <p className="text-sm">
                <span className="font-medium">Reason:</span> {selectedRequest?.reason}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-notes">Notes (Optional)</Label>
              <Textarea
                id="admin-notes"
                placeholder="Add notes about your decision..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedRequest(null);
                setDecision(null);
                setAdminNotes('');
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant={decision ? 'default' : 'destructive'}
              onClick={handleProcess}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {decision ? <Check className="mr-2 h-4 w-4" /> : <X className="mr-2 h-4 w-4" />}
                  {decision ? 'Approve' : 'Reject'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
