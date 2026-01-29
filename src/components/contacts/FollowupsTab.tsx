import { useState } from 'react';
import { format } from 'date-fns';
import { 
  PhoneCall, Mail, Video, MessageSquare, MoreHorizontal, 
  Check, X, Loader2, AlertCircle, CalendarClock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import {
  ContactFollowup,
  markFollowupComplete,
  cancelFollowup,
  getFollowupStatusLabel,
} from '@/services/followups';

interface FollowupsTabProps {
  followups: ContactFollowup[];
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
  onAddFollowup: () => void;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  CALL: <PhoneCall className="h-3 w-3" />,
  EMAIL: <Mail className="h-3 w-3" />,
  MEETING: <Video className="h-3 w-3" />,
  WHATSAPP: <MessageSquare className="h-3 w-3" />,
  OTHER: <CalendarClock className="h-3 w-3" />,
};

const STATUS_STYLES: Record<string, string> = {
  OPEN: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  COMPLETED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  CANCELLED: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
};

const DUE_STATUS_STYLES: Record<string, string> = {
  OVERDUE: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  DUE_TODAY: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
  UPCOMING: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
};

export function FollowupsTab({
  followups,
  isLoading,
  error,
  onRefresh,
  onAddFollowup,
}: FollowupsTabProps) {
  const [confirmAction, setConfirmAction] = useState<{
    type: 'complete' | 'cancel';
    followupId: string;
  } | null>(null);
  const [isActioning, setIsActioning] = useState(false);

  const handleComplete = async () => {
    if (!confirmAction || confirmAction.type !== 'complete') return;
    
    setIsActioning(true);
    const result = await markFollowupComplete(confirmAction.followupId);
    setIsActioning(false);
    setConfirmAction(null);

    if (result.error) {
      toast({
        title: 'Error',
        description: result.error,
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Follow-up completed',
      description: 'The follow-up has been marked as completed.',
    });
    onRefresh();
  };

  const handleCancel = async () => {
    if (!confirmAction || confirmAction.type !== 'cancel') return;
    
    setIsActioning(true);
    const result = await cancelFollowup(confirmAction.followupId);
    setIsActioning(false);
    setConfirmAction(null);

    if (result.error) {
      toast({
        title: 'Error',
        description: result.error,
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Follow-up cancelled',
      description: 'The follow-up has been cancelled.',
    });
    onRefresh();
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'MMM d, yyyy h:mm a');
    } catch {
      return '-';
    }
  };

  const formatShortDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'MMM d, h:mm a');
    } catch {
      return '-';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {/* Add Follow-up Button */}
      <Button onClick={onAddFollowup} className="w-full">
        <CalendarClock className="mr-2 h-4 w-4" />
        Add Follow-up
      </Button>

      {followups.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <CalendarClock className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No follow-ups scheduled</p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Due</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {followups.map((followup) => {
                const dueStatus = followup.status === 'OPEN' 
                  ? getFollowupStatusLabel(followup.due_at)
                  : null;

                return (
                  <TableRow key={followup.id}>
                    <TableCell className="whitespace-nowrap">
                      <div className="space-y-1">
                        <div className="text-sm">{formatShortDate(followup.due_at)}</div>
                        {dueStatus && (
                          <Badge className={`text-xs ${DUE_STATUS_STYLES[dueStatus]}`}>
                            {dueStatus.replace('_', ' ')}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {TYPE_ICONS[followup.followup_type]}
                        <span className="text-sm">{followup.followup_type}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[200px]">
                        <p className="text-sm truncate" title={followup.followup_reason}>
                          {followup.followup_reason}
                        </p>
                        {followup.notes && (
                          <p className="text-xs text-muted-foreground truncate" title={followup.notes}>
                            {followup.notes}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_STYLES[followup.status]}>
                        {followup.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {followup.status === 'OPEN' && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => setConfirmAction({ type: 'complete', followupId: followup.id })}
                            >
                              <Check className="mr-2 h-4 w-4" />
                              Mark Completed
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setConfirmAction({ type: 'cancel', followupId: followup.id })}
                              className="text-destructive"
                            >
                              <X className="mr-2 h-4 w-4" />
                              Cancel
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Confirm Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === 'complete' ? 'Complete Follow-up?' : 'Cancel Follow-up?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === 'complete'
                ? 'This will mark the follow-up as completed.'
                : 'This will cancel the follow-up. This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isActioning}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmAction?.type === 'complete' ? handleComplete : handleCancel}
              disabled={isActioning}
              className={confirmAction?.type === 'cancel' ? 'bg-destructive hover:bg-destructive/90' : ''}
            >
              {isActioning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {confirmAction?.type === 'complete' ? 'Complete' : 'Cancel Follow-up'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
