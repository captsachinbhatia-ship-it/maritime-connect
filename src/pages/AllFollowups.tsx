import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  CalendarClock, Check, ExternalLink, Plus, MoreHorizontal, X, User,
  PhoneCall, Mail, Video, MessageSquare, Loader2,
} from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';
import { supabase } from '@/lib/supabaseClient';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { LogInteractionModal } from '@/components/contacts/LogInteractionModal';
import {
  markFollowupComplete, cancelFollowup, getFollowupStatusLabel,
} from '@/services/followups';

interface FollowupRow {
  id: string;
  contact_id: string;
  contact_name: string;
  company_name: string | null;
  next_follow_up_at: string;
  due_at: string;
  notes: string | null;
  interaction_type: string | null;
  outcome: string | null;
  user_id: string | null;
  owner_name: string | null;
  created_at: string | null;
}

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

type MainTab = 'mine' | 'team' | 'completed';
type DueFilter = 'overdue' | 'today' | 'next7days';

export default function AllFollowups() {
  const { crmUser } = useAuth();
  const [allItems, setAllItems] = useState<FollowupRow[]>([]);
  const [completedItems, setCompletedItems] = useState<FollowupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [mainTab, setMainTab] = useState<MainTab>('mine');
  const [dueFilter, setDueFilter] = useState<DueFilter>('overdue');
  const [logOpen, setLogOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'complete' | 'cancel';
    followupId: string;
  } | null>(null);
  const [isActioning, setIsActioning] = useState(false);

  const fetchActive = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('v_followup_queue_all_v2')
        .select('*')
        .order('next_follow_up_at', { ascending: true })
        .limit(500);

      if (error) {
        console.error(error.message);
        setAllItems([]);
        return;
      }
      setAllItems((data || []).map(mapRow));
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCompleted = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('contact_interactions')
        .select(`
          id,
          contact_id,
          notes,
          interaction_type,
          outcome,
          next_follow_up_at,
          interaction_at,
          created_at,
          user_id,
          contacts!inner(full_name, company_name)
        `)
        .is('next_follow_up_at', null)
        .not('notes', 'is', null)
        .order('interaction_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Completed fetch error:', error.message);
        setCompletedItems([]);
        return;
      }

      setCompletedItems((data || []).map((r: any) => ({
        id: r.id,
        contact_id: r.contact_id,
        contact_name: r.contacts?.full_name || 'Unknown',
        company_name: r.contacts?.company_name || null,
        next_follow_up_at: r.interaction_at || '',
        due_at: r.interaction_at || '',
        notes: r.notes || null,
        interaction_type: r.interaction_type || null,
        outcome: r.outcome || null,
        user_id: r.user_id || null,
        owner_name: null,
        created_at: r.created_at || null,
      })));
    } catch {
      setCompletedItems([]);
    }
  }, []);

  useEffect(() => {
    fetchActive();
  }, [fetchActive]);

  useEffect(() => {
    if (mainTab === 'completed') {
      fetchCompleted();
    }
  }, [mainTab, fetchCompleted]);

  useEffect(() => {
    const h = () => fetchActive();
    window.addEventListener('dashboard:refresh', h);
    return () => window.removeEventListener('dashboard:refresh', h);
  }, [fetchActive]);

  function mapRow(r: any): FollowupRow {
    return {
      id: r.id,
      contact_id: r.contact_id,
      contact_name: r.contact_name || 'Unknown',
      company_name: r.company_name || null,
      next_follow_up_at: r.next_follow_up_at || r.due_at || '',
      due_at: r.due_at || r.next_follow_up_at || '',
      notes: r.notes || null,
      interaction_type: r.interaction_type || null,
      outcome: r.outcome || null,
      user_id: r.user_id || null,
      owner_name: r.owner_name || null,
      created_at: r.created_at || null,
    };
  }

  // Bucket active items
  const todayStr = new Date().toISOString().slice(0, 10);
  const next7 = new Date();
  next7.setDate(next7.getDate() + 7);
  const next7Str = next7.toISOString().slice(0, 10);

  const filterByUser = (items: FollowupRow[]) => {
    if (mainTab === 'mine' && crmUser?.id) {
      return items.filter(f => f.user_id === crmUser.id);
    }
    return items;
  };

  const filtered = filterByUser(allItems);

  const buckets = {
    overdue: filtered.filter(f => f.due_at && f.due_at.slice(0, 10) < todayStr),
    today: filtered.filter(f => f.due_at && f.due_at.slice(0, 10) === todayStr),
    next7days: filtered.filter(f => {
      const d = f.due_at?.slice(0, 10);
      return d && d > todayStr && d <= next7Str;
    }),
  };

  const currentBucket = buckets[dueFilter] || [];

  const handleComplete = async () => {
    if (!confirmAction || confirmAction.type !== 'complete') return;
    setIsActioning(true);
    const result = await markFollowupComplete(confirmAction.followupId);
    setIsActioning(false);
    setConfirmAction(null);
    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
      return;
    }
    toast({ title: 'Done', description: 'Follow-up marked complete' });
    fetchActive();
  };

  const handleCancel = async () => {
    if (!confirmAction || confirmAction.type !== 'cancel') return;
    setIsActioning(true);
    const result = await cancelFollowup(confirmAction.followupId);
    setIsActioning(false);
    setConfirmAction(null);
    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
      return;
    }
    toast({ title: 'Cancelled', description: 'Follow-up cancelled' });
    fetchActive();
  };

  const handleMarkDone = async (id: string) => {
    const { error } = await supabase
      .from('contact_interactions')
      .update({ next_follow_up_at: null })
      .eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Done', description: 'Follow-up marked complete' });
      fetchActive();
    }
  };

  const openContact = (contactId: string) => {
    window.open(`/contacts?contact=${contactId}&tab=followups`, '_blank', 'noopener,noreferrer');
  };

  const formatShortDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'MMM d, h:mm a');
    } catch {
      return '-';
    }
  };

  const renderActiveTable = (items: FollowupRow[]) => {
    if (loading) {
      return (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      );
    }

    if (items.length === 0) {
      return (
        <div className="py-12 text-center">
          <CalendarClock className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-muted-foreground">
            {dueFilter === 'overdue' ? 'No overdue follow-ups 🎉' : 'Nothing due'}
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
              {mainTab === 'team' && <TableHead>Owner</TableHead>}
              <TableHead>Type</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="w-[60px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((f) => {
              const dueStatus = getFollowupStatusLabel(f.due_at);
              return (
                <TableRow key={f.id}>
                  <TableCell className="whitespace-nowrap">
                    <div className="space-y-1">
                      <div className="text-sm">{formatShortDate(f.due_at)}</div>
                      {dueStatus && (
                        <Badge className={`text-xs ${DUE_STATUS_STYLES[dueStatus]}`}>
                          {dueStatus.replace('_', ' ')}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => openContact(f.contact_id)}
                      className="flex items-center gap-1.5 text-primary hover:underline"
                    >
                      <User className="h-3 w-3" />
                      {f.contact_name}
                    </button>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{f.company_name || '—'}</TableCell>
                  {mainTab === 'team' && (
                    <TableCell className="text-muted-foreground">{f.owner_name || '—'}</TableCell>
                  )}
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      {TYPE_ICONS[f.interaction_type || 'OTHER']}
                      <span className="text-sm">{f.interaction_type || '—'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm max-w-[200px] truncate" title={f.notes || ''}>
                      {f.notes || '—'}
                    </p>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openContact(f.contact_id)}>
                          <User className="mr-2 h-4 w-4" /> Open Contact
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setConfirmAction({ type: 'complete', followupId: f.id })}>
                          <Check className="mr-2 h-4 w-4" /> Mark Completed
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setConfirmAction({ type: 'cancel', followupId: f.id })}
                          className="text-destructive"
                        >
                          <X className="mr-2 h-4 w-4" /> Cancel
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

  const renderCompletedTable = () => {
    if (completedItems.length === 0) {
      return (
        <div className="py-12 text-center">
          <CalendarClock className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-muted-foreground">No completed follow-ups found</p>
        </div>
      );
    }

    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Completed</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="w-[40px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {completedItems.map((f) => (
              <TableRow key={f.id}>
                <TableCell className="text-sm whitespace-nowrap">
                  {formatShortDate(f.next_follow_up_at)}
                </TableCell>
                <TableCell>
                  <button
                    onClick={() => openContact(f.contact_id)}
                    className="flex items-center gap-1.5 text-primary hover:underline"
                  >
                    <User className="h-3 w-3" />
                    {f.contact_name}
                  </button>
                </TableCell>
                <TableCell className="text-muted-foreground">{f.company_name || '—'}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    {TYPE_ICONS[f.interaction_type || 'OTHER']}
                    <span className="text-sm">{f.interaction_type || '—'}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <p className="text-sm max-w-[200px] truncate" title={f.notes || ''}>
                    {f.notes || '—'}
                  </p>
                </TableCell>
                <TableCell>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openContact(f.contact_id)} title="Open contact">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Follow-ups</h1>
          <p className="text-sm text-muted-foreground">Manage and track all follow-up tasks</p>
        </div>
        <Button onClick={() => setLogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Log Interaction
        </Button>
      </div>

      <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as MainTab)}>
        <TabsList>
          <TabsTrigger value="mine">My Follow-ups</TabsTrigger>
          <TabsTrigger value="team">Team Follow-ups</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        {/* My Follow-ups & Team Follow-ups share the same sub-filter layout */}
        {(['mine', 'team'] as const).map((tab) => (
          <TabsContent key={tab} value={tab} className="mt-4 space-y-4">
            <Tabs value={dueFilter} onValueChange={(v) => setDueFilter(v as DueFilter)}>
              <TabsList variant="outline">
                <TabsTrigger value="overdue">
                  Overdue
                  {buckets.overdue.length > 0 && (
                    <Badge variant="destructive" className="ml-1.5 h-4 text-[10px] px-1">
                      {buckets.overdue.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="today">
                  Today
                  {buckets.today.length > 0 && (
                    <Badge variant="secondary" className="ml-1.5 h-4 text-[10px] px-1">
                      {buckets.today.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="next7days">
                  Next 7 Days
                  {buckets.next7days.length > 0 && (
                    <Badge variant="outline" className="ml-1.5 h-4 text-[10px] px-1">
                      {buckets.next7days.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <Card>
              <CardContent className="p-4">
                {renderActiveTable(currentBucket)}
              </CardContent>
            </Card>
          </TabsContent>
        ))}

        <TabsContent value="completed" className="mt-4">
          <Card>
            <CardContent className="p-4">
              {renderCompletedTable()}
            </CardContent>
          </Card>
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

      <LogInteractionModal isOpen={logOpen} onClose={() => setLogOpen(false)} onSuccess={() => { setLogOpen(false); fetchActive(); }} />
    </div>
  );
}
