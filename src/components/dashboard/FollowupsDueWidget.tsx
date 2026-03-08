import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { CalendarClock, Check, ExternalLink, User, Unlink } from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';
import { supabase } from '@/lib/supabaseClient';
import { useCrmUser } from '@/hooks/useCrmUser';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { upsertTaskUserState } from '@/services/teamTasks';

type FollowupDueFilter = 'overdue' | 'today' | 'next7days';

interface TaskFollowup {
  id: string;
  title: string;
  notes: string | null;
  due_at: string;
  related_contact_id: string | null;
  related_enquiry_id: string | null;
  contact_name: string | null;
  company_name: string | null;
}

export function FollowupsDueWidget() {
  const navigate = useNavigate();
  const { crmUserId } = useCrmUser();
  const { isAdmin } = useAuth();
  const [tab, setTab] = useState<FollowupDueFilter>('overdue');
  const [allItems, setAllItems] = useState<TaskFollowup[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!isAdmin && !crmUserId) {
      setAllItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // Query tasks table for follow-ups (tasks with due_at set)
      let query = supabase
        .from('tasks')
        .select('id, title, notes, due_at, related_contact_id, related_enquiry_id, assigned_to_crm_user_id')
        .not('due_at', 'is', null)
        .order('due_at', { ascending: true });

      // Scope to current user (non-admin)
      if (!isAdmin && crmUserId) {
        query = query.eq('assigned_to_crm_user_id', crmUserId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Tasks follow-up fetch error:', error.message);
        setAllItems([]);
        setLoading(false);
        return;
      }

      // Filter out completed tasks client-side (exclude DONE/CLOSED statuses via task_user_state)
      // For now, all tasks from tasks table without a completed marker are shown
      const taskRows = data || [];

      // Fetch contact names for linked tasks
      const contactIds = [...new Set(taskRows.map((t: any) => t.related_contact_id).filter(Boolean))];
      let contactMap: Record<string, { name: string; company: string | null }> = {};

      if (contactIds.length > 0) {
        const { data: contacts } = await supabase
          .from('contacts')
          .select('id, full_name, companies(company_name)')
          .in('id', contactIds);

        (contacts || []).forEach((c: any) => {
          contactMap[c.id] = {
            name: c.full_name || 'Unknown',
            company: c.companies?.company_name || null,
          };
        });
      }

      // Also fetch user's task_user_state to exclude DONE tasks
      let doneTaskIds = new Set<string>();
      if (crmUserId && taskRows.length > 0) {
        const taskIds = taskRows.map((t: any) => t.id);
        const { data: states } = await supabase
          .from('task_user_state')
          .select('task_id, status')
          .eq('crm_user_id', crmUserId)
          .in('task_id', taskIds)
          .eq('status', 'DONE');

        (states || []).forEach((s: any) => {
          doneTaskIds.add(s.task_id);
        });
      }

      const mapped: TaskFollowup[] = taskRows
        .filter((t: any) => !doneTaskIds.has(t.id))
        .map((t: any) => ({
          id: t.id,
          title: t.title,
          notes: t.notes,
          due_at: t.due_at,
          related_contact_id: t.related_contact_id || null,
          related_enquiry_id: t.related_enquiry_id || null,
          contact_name: t.related_contact_id ? contactMap[t.related_contact_id]?.name || 'Unknown' : null,
          company_name: t.related_contact_id ? contactMap[t.related_contact_id]?.company || null : null,
        }));

      setAllItems(mapped);
    } catch (err) {
      console.error('Failed to fetch task follow-ups:', err);
      setAllItems([]);
    } finally {
      setLoading(false);
    }
  }, [crmUserId, isAdmin]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Listen for dashboard refresh events
  useEffect(() => {
    const handler = () => fetchAll();
    window.addEventListener('dashboard:refresh', handler);
    return () => window.removeEventListener('dashboard:refresh', handler);
  }, [fetchAll]);

  // Bucket items client-side using LOCAL timezone calendar-day boundaries
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const startOfDayPlus7 = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7);

  const buckets = {
    overdue: allItems.filter(f => f.due_at && new Date(f.due_at) < startOfToday),
    today: allItems.filter(f => {
      if (!f.due_at) return false;
      const d = new Date(f.due_at);
      return d >= startOfToday && d < startOfTomorrow;
    }),
    next7days: allItems.filter(f => {
      if (!f.due_at) return false;
      const d = new Date(f.due_at);
      return d >= startOfTomorrow && d < startOfDayPlus7;
    }),
  };

  const data = buckets[tab] || [];
  const counts = {
    overdue: buckets.overdue.length,
    today: buckets.today.length,
    next7days: buckets.next7days.length,
  };

  // Separate linked vs unlinked
  const linkedItems = data.filter(f => f.related_contact_id);
  const unlinkedItems = data.filter(f => !f.related_contact_id);

  const handleComplete = async (id: string) => {
    if (!crmUserId) return;
    const { error } = await upsertTaskUserState(id, crmUserId, { status: 'DONE' });
    if (error) {
      toast({ title: 'Error', description: error, variant: 'destructive' });
    } else {
      toast({ title: 'Done', description: 'Follow-up marked complete' });
      fetchAll();
    }
  };

  const handlePopout = () => {
    window.open('/follow-ups', '_blank', 'noopener,noreferrer');
  };

  const handleOpenContact = (contactId: string) => {
    navigate(`/contacts?contact=${contactId}&tab=followups`);
  };

  const handleOpenEnquiry = (enquiryId: string) => {
    navigate(`/enquiries/${enquiryId}`);
  };

  const renderRow = (f: TaskFollowup) => (
    <div key={f.id} className="flex items-center gap-2 rounded-lg border p-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {f.contact_name || f.title}
        </p>
        <p className="truncate text-[11px] text-muted-foreground">{f.title}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <Badge
            variant={isPast(new Date(f.due_at)) && !isToday(new Date(f.due_at)) ? 'destructive' : 'outline'}
            className="text-[10px] py-0 h-4"
          >
            {format(new Date(f.due_at), 'dd MMM')}
          </Badge>
          {f.company_name && (
            <Badge variant="secondary" className="text-[10px] py-0 h-4">{f.company_name}</Badge>
          )}
          {!f.related_contact_id && (
            <Badge variant="outline" className="text-[10px] py-0 h-4 text-muted-foreground">
              <Unlink className="h-2.5 w-2.5 mr-0.5" />
              Unlinked
            </Badge>
          )}
        </div>
      </div>
      <div className="flex gap-1 shrink-0">
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleComplete(f.id)} title="Mark done">
          <Check className="h-3.5 w-3.5" />
        </Button>
        {f.related_contact_id && (
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleOpenContact(f.related_contact_id!)} title="Open contact">
            <User className="h-3.5 w-3.5" />
          </Button>
        )}
        {f.related_enquiry_id && (
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleOpenEnquiry(f.related_enquiry_id!)} title="Open enquiry">
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <CalendarClock className="h-4.5 w-4.5 text-primary" />
          </div>
          <CardTitle className="text-base">Follow-ups Due</CardTitle>
          <Button variant="ghost" size="icon" className="h-7 w-7 ml-auto" onClick={handlePopout} title="Open all follow-ups">
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <Tabs value={tab} onValueChange={(v) => setTab(v as FollowupDueFilter)}>
          <TabsList className="w-full h-8">
            <TabsTrigger value="overdue" className="text-xs flex-1">
              Overdue {counts.overdue > 0 && <Badge variant="destructive" className="ml-1 h-4 text-[10px] px-1">{counts.overdue}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="today" className="text-xs flex-1">
              Today {counts.today > 0 && <Badge variant="secondary" className="ml-1 h-4 text-[10px] px-1">{counts.today}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="next7days" className="text-xs flex-1">
              Next 7d {counts.next7days > 0 && <Badge variant="outline" className="ml-1 h-4 text-[10px] px-1">{counts.next7days}</Badge>}
            </TabsTrigger>
          </TabsList>

          {(['overdue', 'today', 'next7days'] as const).map((t) => (
            <TabsContent key={t} value={t} className="mt-2">
              {loading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : data.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  {t === 'overdue' ? 'No overdue follow-ups 🎉' : 'Nothing due'}
                </p>
              ) : (
                <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1">
                  {linkedItems.map(renderRow)}
                  {unlinkedItems.length > 0 && linkedItems.length > 0 && (
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide pt-2 pb-1 px-1">Unlinked</p>
                  )}
                  {unlinkedItems.map(renderRow)}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
