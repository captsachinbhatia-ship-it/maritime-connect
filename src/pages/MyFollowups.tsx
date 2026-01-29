import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { 
  CalendarClock, PhoneCall, Mail, Video, MessageSquare, 
  MoreHorizontal, Check, X, Loader2, AlertCircle, User
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import {
  getMyFollowupsDue,
  markFollowupComplete,
  cancelFollowup,
  FollowupWithContact,
  FollowupDueFilter,
  getFollowupStatusLabel,
} from '@/services/followups';

type TabType = 'overdue' | 'today' | 'next7days';

const TYPE_ICONS: Record<string, React.ReactNode> = {
  CALL: <PhoneCall className="h-3 w-3" />,
  EMAIL: <Mail className="h-3 w-3" />,
  MEETING: <Video className="h-3 w-3" />,
  WHATSAPP: <MessageSquare className="h-3 w-3" />,
  OTHER: <CalendarClock className="h-3 w-3" />,
};

const DUE_STATUS_STYLES: Record<string, string> = {
  OVERDUE: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  DUE_TODAY: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
  UPCOMING: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
};

export default function MyFollowups() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('overdue');
  const [followups, setFollowups] = useState<FollowupWithContact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'complete' | 'cancel';
    followupId: string;
  } | null>(null);
  const [isActioning, setIsActioning] = useState(false);

  const loadFollowups = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const filterMap: Record<TabType, FollowupDueFilter> = {
      overdue: 'overdue',
      today: 'today',
      next7days: 'next7days',
    };

    const result = await getMyFollowupsDue(filterMap[activeTab]);

    if (result.error) {
      setError(result.error);
      setFollowups([]);
    } else {
      setFollowups(result.data || []);
    }

    setIsLoading(false);
  }, [activeTab]);

  useEffect(() => {
    loadFollowups();
  }, [loadFollowups]);

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
    loadFollowups();
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
    loadFollowups();
  };

  const openContact = (contactId: string) => {
    navigate(`/contacts?open=${contactId}`);
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

  const renderTable = () => {
    if (isLoading) {
      return (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Due</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      );
    }

    if (followups.length === 0) {
      return (
        <div className="rounded-md border p-12 text-center">
          <CalendarClock className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-muted-foreground">
            {activeTab === 'overdue' && 'No overdue follow-ups'}
            {activeTab === 'today' && 'No follow-ups due today'}
            {activeTab === 'next7days' && 'No follow-ups in the next 7 days'}
          </p>
        </div>
      );
    }

    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Due</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {followups.map((followup) => {
              const dueStatus = getFollowupStatusLabel(followup.due_at);

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
                    <button
                      onClick={() => openContact(followup.contact_id)}
                      className="flex items-center gap-1.5 text-primary hover:underline"
                    >
                      <User className="h-3 w-3" />
                      {followup.contact_name || 'Unknown'}
                    </button>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {followup.company_name || '-'}
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
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDate(followup.created_at)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openContact(followup.contact_id)}>
                          <User className="mr-2 h-4 w-4" />
                          Open Contact
                        </DropdownMenuItem>
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
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">My Follow-ups</h1>
        <p className="mt-1 text-muted-foreground">
          Manage your scheduled follow-ups
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)}>
        <TabsList>
          <TabsTrigger value="overdue" className="gap-2">
            Overdue
          </TabsTrigger>
          <TabsTrigger value="today" className="gap-2">
            Due Today
          </TabsTrigger>
          <TabsTrigger value="next7days" className="gap-2">
            Next 7 Days
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overdue" className="mt-4">
          {renderTable()}
        </TabsContent>
        <TabsContent value="today" className="mt-4">
          {renderTable()}
        </TabsContent>
        <TabsContent value="next7days" className="mt-4">
          {renderTable()}
        </TabsContent>
      </Tabs>

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
