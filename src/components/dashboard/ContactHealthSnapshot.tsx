import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { HeartPulse, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { getCurrentCrmUserId } from '@/services/profiles';
import { cn } from '@/lib/utils';

interface StageCounts {
  COLD_CALLING: number;
  ASPIRATION: number;
  ACHIEVEMENT: number;
  INACTIVE: number;
}

const stageConfig = [
  { key: 'COLD_CALLING', label: 'Cold Calling', color: 'bg-blue-500', tab: 'my-contacts' },
  { key: 'ASPIRATION', label: 'Aspiration', color: 'bg-amber-500', tab: 'my-contacts' },
  { key: 'ACHIEVEMENT', label: 'Achievement', color: 'bg-emerald-500', tab: 'my-contacts' },
  { key: 'INACTIVE', label: 'Inactive', color: 'bg-slate-400', tab: 'my-contacts' },
] as const;

interface ContactHealthSnapshotProps {
  /** undefined = logged-in user, null = all users, string = specific user */
  crmUserId?: string | null;
}

export function ContactHealthSnapshot({ crmUserId: crmUserIdProp }: ContactHealthSnapshotProps = {}) {
  const navigate = useNavigate();
  const [counts, setCounts] = useState<StageCounts>({
    COLD_CALLING: 0, ASPIRATION: 0, ACHIEVEMENT: 0, INACTIVE: 0,
  });
  const [totalActive, setTotalActive] = useState(0);
  const [staleCount, setStaleCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      let userId: string | null = null;

      if (crmUserIdProp === undefined) {
        const { data: currentCrmUserId, error: crmError } = await getCurrentCrmUserId();
        if (crmError || !currentCrmUserId) { setIsLoading(false); return; }
        userId = currentCrmUserId;
      } else {
        userId = crmUserIdProp;
      }

      let assignQuery = supabase
        .from('contact_assignments')
        .select('contact_id, stage')
        .eq('status', 'ACTIVE')
        .eq('assignment_role', 'PRIMARY');

      if (userId) {
        assignQuery = assignQuery.eq('assigned_to_crm_user_id', userId);
      }

      const { data: assignments } = await assignQuery;

      const latestByContact = new Map<string, string>();
      (assignments || []).forEach(a => {
        if (!latestByContact.has(a.contact_id)) {
          latestByContact.set(a.contact_id, a.stage);
        }
      });

      const sc: StageCounts = { COLD_CALLING: 0, ASPIRATION: 0, ACHIEVEMENT: 0, INACTIVE: 0 };
      latestByContact.forEach(stage => {
        if (stage in sc) sc[stage as keyof StageCounts]++;
      });
      setCounts(sc);

      const contactIds = [...latestByContact.keys()];
      setTotalActive(contactIds.length);

      // Stale contacts (no interaction > 14 days)
      if (contactIds.length > 0) {
        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

        const { data: lastInteractions } = await supabase
          .from('v_contacts_last_interaction')
          .select('contact_id, last_interaction_at')
          .in('contact_id', contactIds);

        const interactionMap = new Map(
          (lastInteractions || []).map(li => [li.contact_id, li.last_interaction_at])
        );

        const stale = contactIds.filter(id => {
          const lastAt = interactionMap.get(id);
          if (!lastAt) return true;
          return new Date(lastAt) < fourteenDaysAgo;
        }).length;
        setStaleCount(stale);
      } else {
        setStaleCount(0);
      }
    } catch (err) {
      console.error('ContactHealthSnapshot error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [crmUserIdProp]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <HeartPulse className="h-4.5 w-4.5 text-primary" />
          </div>
          <CardTitle className="text-base">Contact Health</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-14" />)}
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12" />)}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Top summary */}
            <div className="grid grid-cols-2 gap-2">
              <div
                className="rounded-lg border p-3 cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => navigate('/contacts?tab=my-contacts')}
              >
                <p className="text-[11px] text-muted-foreground">Total Active</p>
                <p className="text-2xl font-bold tabular-nums text-foreground">{totalActive}</p>
              </div>
              <div
                className={cn(
                  'rounded-lg border p-3 cursor-pointer hover:bg-accent/50 transition-colors',
                  staleCount > 0 && 'border-destructive/50 bg-destructive/5'
                )}
                onClick={() => navigate('/contacts?tab=my-contacts')}
              >
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  {staleCount > 0 && <AlertTriangle className="h-3 w-3 text-destructive" />}
                  Stale (&gt;14d)
                </p>
                <p className={cn(
                  'text-2xl font-bold tabular-nums',
                  staleCount > 0 ? 'text-destructive' : 'text-foreground'
                )}>
                  {staleCount}
                </p>
              </div>
            </div>

            {/* Stage counts */}
            <div className="grid grid-cols-4 gap-2">
              {stageConfig.map(({ key, label, color, tab }) => (
                <div
                  key={key}
                  className="flex items-center gap-2 rounded-lg border px-2 py-2 cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => navigate(`/contacts?tab=${tab}`)}
                >
                  <div className={cn('h-2.5 w-2.5 rounded-full shrink-0', color)} />
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground leading-tight truncate">{label}</p>
                    <p className="text-sm font-bold tabular-nums">{counts[key]}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
