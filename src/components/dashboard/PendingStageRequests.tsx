import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { 
  ArrowUpRight, Loader2, AlertCircle, Check, X, RefreshCw, ArrowRight 
} from 'lucide-react';
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
import { 
  getPendingStageRequests, 
  decideStageRequest, 
  StageRequestWithDetails 
} from '@/services/stageRequests';

const STAGE_COLORS: Record<string, string> = {
  COLD_CALLING: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  ASPIRATION: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
  ACHIEVEMENT: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  INACTIVE: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
};

interface DecisionDialogState {
  isOpen: boolean;
  request: StageRequestWithDetails | null;
  decision: 'APPROVED' | 'REJECTED' | null;
}

export function PendingStageRequests() {
  const { toast } = useToast();
  const [requests, setRequests] = useState<StageRequestWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [decisionDialog, setDecisionDialog] = useState<DecisionDialogState>({
    isOpen: false,
    request: null,
    decision: null,
  });
  const [decisionNote, setDecisionNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadRequests = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const result = await getPendingStageRequests();

    if (result.error) {
      setError(result.error);
    } else {
      setRequests(result.data || []);
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleDecision = (request: StageRequestWithDetails, decision: 'APPROVED' | 'REJECTED') => {
    setDecisionDialog({
      isOpen: true,
      request,
      decision,
    });
    setDecisionNote('');
  };

  const submitDecision = async () => {
    if (!decisionDialog.request || !decisionDialog.decision) return;

    setIsSubmitting(true);

    const result = await decideStageRequest(
      decisionDialog.request.id,
      decisionDialog.decision,
      decisionNote.trim() || undefined
    );

    if (result.success) {
      toast({
        title: `Request ${decisionDialog.decision.toLowerCase()}`,
        description: decisionDialog.decision === 'APPROVED' 
          ? 'The contact stage has been updated.'
          : 'The request has been rejected.',
      });

      setDecisionDialog({ isOpen: false, request: null, decision: null });
      loadRequests();
    } else {
      toast({
        variant: 'destructive',
        title: 'Action failed',
        description: result.error || 'Unknown error',
      });
    }

    setIsSubmitting(false);
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'MMM d, h:mm a');
    } catch {
      return '-';
    }
  };

  const formatStage = (stage: string) => {
    return stage.replace('_', ' ');
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ArrowUpRight className="h-5 w-5" />
            Pending Stage Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <ArrowUpRight className="h-5 w-5" />
              Pending Stage Requests
            </CardTitle>
            <CardDescription>
              {requests.length} request{requests.length !== 1 ? 's' : ''} awaiting decision
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={loadRequests}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : requests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No pending requests
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contact</TableHead>
                    <TableHead>Stage Change</TableHead>
                    <TableHead>Requested By</TableHead>
                    <TableHead>Requested At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">
                        {request.contact_name}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={STAGE_COLORS[request.current_stage || ''] || ''}>
                            {formatStage(request.current_stage || 'Unknown')}
                          </Badge>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          <Badge className={STAGE_COLORS[request.requested_stage] || STAGE_COLORS.INACTIVE}>
                            {formatStage(request.requested_stage)}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>{request.requester_name}</TableCell>
                      <TableCell>{formatDate(request.requested_at)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={() => handleDecision(request, 'APPROVED')}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDecision(request, 'REJECTED')}
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
        open={decisionDialog.isOpen} 
        onOpenChange={(open) => {
          if (!open && !isSubmitting) {
            setDecisionDialog({ isOpen: false, request: null, decision: null });
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {decisionDialog.decision === 'APPROVED' ? 'Approve' : 'Reject'} Stage Request
            </DialogTitle>
            <DialogDescription>
              {decisionDialog.decision === 'APPROVED' 
                ? `This will move ${decisionDialog.request?.contact_name} to ${formatStage(decisionDialog.request?.requested_stage || '')}.`
                : `This will reject the request from ${decisionDialog.request?.requester_name}.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {decisionDialog.request?.note && (
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground mb-1">Requester's note:</p>
                <p className="text-sm">{decisionDialog.request.note}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="decision-note">Note (optional)</Label>
              <Textarea
                id="decision-note"
                placeholder="Add a note for this decision..."
                value={decisionNote}
                onChange={(e) => setDecisionNote(e.target.value)}
                rows={2}
                maxLength={500}
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setDecisionDialog({ isOpen: false, request: null, decision: null })}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant={decisionDialog.decision === 'APPROVED' ? 'default' : 'destructive'}
              onClick={submitDecision}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {decisionDialog.decision === 'APPROVED' ? (
                    <Check className="mr-2 h-4 w-4" />
                  ) : (
                    <X className="mr-2 h-4 w-4" />
                  )}
                  {decisionDialog.decision === 'APPROVED' ? 'Approve' : 'Reject'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
