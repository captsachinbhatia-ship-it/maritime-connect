import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { CalendarClock, Check, Clock, ExternalLink } from 'lucide-react';
import { formatDistanceToNow, format, isToday, isPast } from 'date-fns';
import { markFollowupComplete, type FollowupWithContact, type FollowupDueFilter } from '@/services/followups';
import { supabase } from '@/lib/supabaseClient';
import { useCrmUser } from '@/hooks/useCrmUser';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export function FollowupsDueWidget() {
  const { crmUserId } = useCrmUser();
  const { isAdmin } = useAuth();
  const [tab, setTab] = useState<FollowupDueFilter>('overdue');
  const [allItems, setAllItems] = useState<FollowupWithContact[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('v_followup_queue_all_v2')
        .select('*')
        .order('next_follow_up_at', { ascending: true })
        .limit(10);

      if (error) {
        console.error('v_followup_queue_all_v2 error:', error.message);
        setAllItems([]);
        setLoading(false);
        return;
      }

      setAllItems((data || []).map((r: any) => ({
        id: r.id,
        contact_id: r.contact_id,
        assignment_id: r.assignment_id || null,
        interaction_id: null,
        followup_type: r.followup_type || 'OTHER',
        followup_reason: r.followup_reason || r.reason || '',
        notes: r.notes || null,
        due_at: r.next_follow_up_at || '',
        status: r.status || 'OPEN',
        completed_at: null,
        created_at: r.created_at || '',
        created_by: null,
        recurrence_enabled: null,
        recurrence_frequency: null,
        recurrence_interval: null,
        recurrence_end_date: null,
        recurrence_count: null,
        contact_name: r.contact_name || 'Unknown',
        company_name: r.company_name || null,
      })));
    } catch (err) {
      console.error('Failed to fetch followups:', err);
      setAllItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Listen for dashboard refresh events (fired after logging an interaction)
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

  const handleComplete = async (id: string) => {
    const { error } = await markFollowupComplete(id);
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

  const handleRowOpen = (contactId: string) => {
    window.open(`/contacts?contact=${contactId}&tab=followups`, '_blank', 'noopener,noreferrer');
  };

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

          {['overdue', 'today', 'next7days'].map((t) => (
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
                <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
                  {data.slice(0, 10).map((f) => (
                    <div key={f.id} className="flex items-center gap-2 rounded-lg border p-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{f.contact_name || 'Unknown'}</p>
                        <p className="truncate text-[11px] text-muted-foreground">{f.followup_reason}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Badge variant={isPast(new Date(f.due_at)) && !isToday(new Date(f.due_at)) ? 'destructive' : 'outline'} className="text-[10px] py-0 h-4">
                            {format(new Date(f.due_at), 'dd MMM')}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px] py-0 h-4">{f.followup_type}</Badge>
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleComplete(f.id)} title="Mark done">
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleRowOpen(f.contact_id)} title="Open contact follow-ups">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
