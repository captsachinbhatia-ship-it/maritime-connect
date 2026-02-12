import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { HeartPulse, AlertTriangle, AlertCircle, Building2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { fetchDashboardMetrics } from '@/services/dashboardMetrics';
import { AssignmentStage } from '@/types/directory';

const ACTIVE_STAGES: AssignmentStage[] = ['COLD_CALLING', 'ASPIRATION', 'ACHIEVEMENT'];

const stageConfig = [
  { key: 'COLD_CALLING' as AssignmentStage, label: 'Cold Calling', color: 'bg-blue-500', tab: 'my-contacts' },
  { key: 'ASPIRATION' as AssignmentStage, label: 'Aspiration', color: 'bg-amber-500', tab: 'my-contacts' },
  { key: 'ACHIEVEMENT' as AssignmentStage, label: 'Achievement', color: 'bg-emerald-500', tab: 'my-contacts' },
];

interface ContactHealthSnapshotProps {
  /** undefined = logged-in user, null = all users, string = specific user */
  crmUserId?: string | null;
}

export function ContactHealthSnapshot({ crmUserId: crmUserIdProp }: ContactHealthSnapshotProps = {}) {
  const navigate = useNavigate();
  const { crmUser } = useAuth();
  const [counts, setCounts] = useState<Record<string, number>>({
    COLD_CALLING: 0, ASPIRATION: 0, ACHIEVEMENT: 0,
  });
  const [totalActive, setTotalActive] = useState(0);
  const [staleCount, setStaleCount] = useState(0);
  const [newCompanies7d, setNewCompanies7d] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      let userId: string | null = null;

      if (crmUserIdProp === undefined) {
        if (!crmUser?.id) { setIsLoading(false); return; }
        userId = crmUser.id;
      } else {
        userId = crmUserIdProp;
      }

      // Fetch from unified view + companies count in parallel
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // For user-specific filtering, query view directly with filter
      let viewQuery = supabase
        .from('v_directory_contacts')
        .select('id, primary_owner_id, primary_stage');

      if (userId) {
        viewQuery = viewQuery.eq('primary_owner_id', userId);
      }

      const [viewResult, companiesResult] = await Promise.all([
        viewQuery,
        supabase
          .from('companies')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', sevenDaysAgo.toISOString()),
      ]);

      if (viewResult.error) {
        setError(`View: ${viewResult.error.message}`);
        return;
      }
      if (companiesResult.error) {
        setError(`Companies: ${companiesResult.error.message}`);
        return;
      }

      setNewCompanies7d(companiesResult.count ?? 0);

      const rows = viewResult.data || [];
      const sc: Record<string, number> = { COLD_CALLING: 0, ASPIRATION: 0, ACHIEVEMENT: 0 };

      // Only count active stages
      const activeRows = rows.filter(r => r.primary_stage && ACTIVE_STAGES.includes(r.primary_stage as AssignmentStage));

      activeRows.forEach(r => {
        if (r.primary_stage && r.primary_stage in sc) {
          sc[r.primary_stage]++;
        }
      });

      setCounts(sc);
      setTotalActive(activeRows.length);

      // Stale contacts (no interaction > 14 days)
      const contactIds = activeRows.map(r => r.id);
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
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error('ContactHealthSnapshot error:', msg);
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [crmUserIdProp, crmUser?.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (error) {
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
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

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
            <div className="grid grid-cols-3 gap-2">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14" />)}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12" />)}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Top summary */}
            <div className="grid grid-cols-3 gap-2">
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
              <div
                className="rounded-lg border p-3 cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => navigate('/companies')}
              >
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  New Companies (7d)
                </p>
                <p className="text-2xl font-bold tabular-nums text-foreground">{newCompanies7d}</p>
              </div>
            </div>

            {/* Stage counts */}
            <div className="grid grid-cols-3 gap-2">
              {stageConfig.map(({ key, label, color, tab }) => (
                <div
                  key={key}
                  className="flex items-center gap-2 rounded-lg border px-2 py-2 cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => navigate(`/contacts?tab=${tab}`)}
                >
                  <div className={cn('h-2.5 w-2.5 rounded-full shrink-0', color)} />
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground leading-tight truncate">{label}</p>
                    <p className="text-sm font-bold tabular-nums">{counts[key] || 0}</p>
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
