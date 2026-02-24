import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { CalendarClock, Check, ExternalLink, Plus } from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';
import { supabase } from '@/lib/supabaseClient';
import { toast } from '@/hooks/use-toast';
import { DashboardLogInteractionModal } from '@/components/dashboard/DashboardLogInteractionModal';

interface FollowupRow {
  id: string;
  contact_id: string;
  contact_name: string;
  company_name: string | null;
  next_follow_up_at: string;
  notes: string | null;
  interaction_type: string | null;
  outcome: string | null;
}

export default function AllFollowups() {
  const [items, setItems] = useState<FollowupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'overdue' | 'today' | 'next7days'>('overdue');
  const [logOpen, setLogOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('v_followup_queue_all_v2')
        .select('*')
        .order('next_follow_up_at', { ascending: true })
        .limit(200);

      if (error) { console.error(error.message); setItems([]); return; }
      setItems((data || []).map((r: any) => ({
        id: r.id,
        contact_id: r.contact_id,
        contact_name: r.contact_name || 'Unknown',
        company_name: r.company_name || null,
        next_follow_up_at: r.next_follow_up_at || '',
        notes: r.notes || null,
        interaction_type: r.interaction_type || null,
        outcome: r.outcome || null,
      })));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const h = () => fetchData();
    window.addEventListener('dashboard:refresh', h);
    return () => window.removeEventListener('dashboard:refresh', h);
  }, [fetchData]);

  const todayStr = new Date().toISOString().slice(0, 10);
  const next7 = new Date();
  next7.setDate(next7.getDate() + 7);
  const next7Str = next7.toISOString().slice(0, 10);

  const buckets = {
    overdue: items.filter(f => f.next_follow_up_at && f.next_follow_up_at.slice(0, 10) < todayStr),
    today: items.filter(f => f.next_follow_up_at && f.next_follow_up_at.slice(0, 10) === todayStr),
    next7days: items.filter(f => {
      const d = f.next_follow_up_at?.slice(0, 10);
      return d && d > todayStr && d <= next7Str;
    }),
  };
  const current = buckets[tab] || [];

  const handleMarkDone = async (id: string) => {
    // Clear next_follow_up_at on the interaction record
    const { error } = await supabase
      .from('contact_interactions')
      .update({ next_follow_up_at: null })
      .eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Done', description: 'Follow-up marked complete' });
      fetchData();
    }
  };

  const openContact = (contactId: string) => {
    window.open(`/contacts?contact=${contactId}&tab=followups`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">All Follow-ups</h1>
          <p className="text-sm text-muted-foreground">V2 follow-up queue across all contacts</p>
        </div>
        <Button onClick={() => setLogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Log Interaction
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="overdue">
            Overdue {buckets.overdue.length > 0 && <Badge variant="destructive" className="ml-1 h-4 text-[10px] px-1">{buckets.overdue.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="today">
            Today {buckets.today.length > 0 && <Badge variant="secondary" className="ml-1 h-4 text-[10px] px-1">{buckets.today.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="next7days">
            Next 7 Days {buckets.next7days.length > 0 && <Badge variant="outline" className="ml-1 h-4 text-[10px] px-1">{buckets.next7days.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        {['overdue', 'today', 'next7days'].map((t) => (
          <TabsContent key={t} value={t} className="mt-4">
            <Card>
              <CardContent className="p-4">
                {loading ? (
                  <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
                ) : current.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    {t === 'overdue' ? 'No overdue follow-ups 🎉' : 'Nothing due'}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {current.map((f) => (
                      <div key={f.id} className="flex items-center gap-3 rounded-lg border p-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
                          <CalendarClock className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{f.contact_name}</p>
                            {f.company_name && <span className="text-xs text-muted-foreground">({f.company_name})</span>}
                          </div>
                          {f.notes && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{f.notes}</p>}
                          <div className="flex items-center gap-1.5 mt-1">
                            <Badge variant={isPast(new Date(f.next_follow_up_at)) && !isToday(new Date(f.next_follow_up_at)) ? 'destructive' : 'outline'} className="text-[10px] py-0 h-4">
                              {format(new Date(f.next_follow_up_at), 'dd MMM yyyy')}
                            </Badge>
                            {f.interaction_type && <Badge variant="secondary" className="text-[10px] py-0 h-4">{f.interaction_type}</Badge>}
                            {f.outcome && <Badge variant="outline" className="text-[10px] py-0 h-4">{f.outcome}</Badge>}
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleMarkDone(f.id)} title="Mark done">
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openContact(f.contact_id)} title="Open contact">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      <DashboardLogInteractionModal open={logOpen} onOpenChange={setLogOpen} onSuccess={fetchData} />
    </div>
  );
}
