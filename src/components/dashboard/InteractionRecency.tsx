import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { getCurrentCrmUserId } from '@/services/profiles';

interface Bucket {
  label: string;
  count: number;
}

export function InteractionRecency() {
  const navigate = useNavigate();
  const [buckets, setBuckets] = useState<Bucket[]>([
    { label: 'Today', count: 0 },
    { label: 'Last 3 Days', count: 0 },
    { label: 'Last 7 Days', count: 0 },
    { label: 'Last 14 Days', count: 0 },
    { label: 'Older than 14 Days', count: 0 },
  ]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: currentCrmUserId, error: crmError } = await getCurrentCrmUserId();
      if (crmError || !currentCrmUserId) {
        setIsLoading(false);
        return;
      }

      const { data: assignments } = await supabase
        .from('contact_assignments')
        .select('contact_id')
        .eq('status', 'ACTIVE')
        .eq('assigned_to_crm_user_id', currentCrmUserId)
        .in('assignment_role', ['primary', 'secondary']);

      const contactIds = [...new Set(assignments?.map(a => a.contact_id) || [])];

      if (contactIds.length === 0) {
        setIsLoading(false);
        return;
      }

      const { data: interactions } = await supabase
        .from('v_contacts_last_interaction')
        .select('contact_id, last_interaction_at')
        .in('contact_id', contactIds);

      const interactionMap = new Map(
        interactions?.map(i => [i.contact_id, i.last_interaction_at]) || []
      );

      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const threeDaysAgo = new Date(startOfToday);
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      const sevenDaysAgo = new Date(startOfToday);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const fourteenDaysAgo = new Date(startOfToday);
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

      const counts = [0, 0, 0, 0, 0];

      contactIds.forEach(id => {
        const lastAt = interactionMap.get(id);
        if (!lastAt) {
          counts[4]++;
          return;
        }
        const d = new Date(lastAt);
        if (d >= startOfToday) counts[0]++;
        else if (d >= threeDaysAgo) counts[1]++;
        else if (d >= sevenDaysAgo) counts[2]++;
        else if (d >= fourteenDaysAgo) counts[3]++;
        else counts[4]++;
      });

      setBuckets([
        { label: 'Today', count: counts[0] },
        { label: 'Last 3 Days', count: counts[1] },
        { label: 'Last 7 Days', count: counts[2] },
        { label: 'Last 14 Days', count: counts[3] },
        { label: 'Older than 14 Days', count: counts[4] },
      ]);
    } catch (err) {
      console.error('InteractionRecency error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCountClick = () => {
    navigate('/contacts?tab=my-contacts');
  };

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <Clock className="h-4.5 w-4.5 text-primary" />
          </div>
          <CardTitle className="text-base">Interaction Recency</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : (
          <>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Period</TableHead>
                    <TableHead className="text-xs text-right">Contacts</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {buckets.map((bucket) => (
                    <TableRow key={bucket.label}>
                      <TableCell className="text-sm py-2">{bucket.label}</TableCell>
                      <TableCell className="text-right py-2">
                        <span
                          className="cursor-pointer text-sm font-medium tabular-nums text-primary hover:underline"
                          onClick={handleCountClick}
                        >
                          {bucket.count}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="text-[11px] text-muted-foreground text-center mt-2">
              Click counts to open filtered list
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
