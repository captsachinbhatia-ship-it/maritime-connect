import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabaseClient';
import { getCurrentCrmUserId } from '@/services/profiles';
import { BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StageCounts {
  COLD_CALLING: number;
  ASPIRATION: number;
  ACHIEVEMENT: number;
  INACTIVE: number;
}

const stageConfig = [
  { key: 'COLD_CALLING', label: 'Cold Calling', color: 'bg-blue-500' },
  { key: 'ASPIRATION', label: 'Aspiration', color: 'bg-amber-500' },
  { key: 'ACHIEVEMENT', label: 'Achievement', color: 'bg-emerald-500' },
  { key: 'INACTIVE', label: 'Inactive', color: 'bg-slate-400' },
] as const;

interface StageSnapshotProps {
  /** undefined = logged-in user, null = all users, string = specific user */
  crmUserId?: string | null;
}

export function StageSnapshot({ crmUserId: crmUserIdProp }: StageSnapshotProps = {}) {
  const [counts, setCounts] = useState<StageCounts>({
    COLD_CALLING: 0,
    ASPIRATION: 0,
    ACHIEVEMENT: 0,
    INACTIVE: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStageCounts = async () => {
      setIsLoading(true);
      try {
        let userId: string | null = null;

        if (crmUserIdProp === undefined) {
          const { data: currentCrmUserId, error: crmError } = await getCurrentCrmUserId();
          if (crmError || !currentCrmUserId) {
            setIsLoading(false);
            return;
          }
          userId = currentCrmUserId;
        } else {
          userId = crmUserIdProp;
        }

        let assignQuery = supabase
          .from('contact_assignments')
          .select('contact_id, stage')
          .eq('status', 'ACTIVE')
          .in('assignment_role', ['PRIMARY', 'SECONDARY']);

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

        const stageCounts: StageCounts = {
          COLD_CALLING: 0,
          ASPIRATION: 0,
          ACHIEVEMENT: 0,
          INACTIVE: 0,
        };

        latestByContact.forEach(stage => {
          if (stage in stageCounts) {
            stageCounts[stage as keyof StageCounts]++;
          }
        });

        setCounts(stageCounts);
      } catch (error) {
        console.error('Failed to fetch stage counts:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStageCounts();
  }, [crmUserIdProp]);

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent">
            <BarChart3 className="h-4.5 w-4.5 text-accent-foreground" />
          </div>
          <CardTitle className="text-base">Stage Snapshot</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-3 w-full rounded-full" />
            <div className="grid grid-cols-2 gap-2">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Progress bar */}
            {total > 0 && (
              <div className="flex h-2.5 overflow-hidden rounded-full bg-muted">
                {stageConfig.map(({ key, color }) => {
                  const count = counts[key];
                  const percentage = (count / total) * 100;
                  if (percentage === 0) return null;
                  return (
                    <div
                      key={key}
                      className={cn('transition-all', color)}
                      style={{ width: `${percentage}%` }}
                    />
                  );
                })}
              </div>
            )}

            {/* Stage list */}
            <div className="grid grid-cols-2 gap-2">
              {stageConfig.map(({ key, label, color }) => (
                <div
                  key={key}
                  className="flex items-center gap-2 rounded-lg border px-3 py-2"
                >
                  <div className={cn('h-2.5 w-2.5 rounded-full shrink-0', color)} />
                  <span className="flex-1 text-xs text-muted-foreground">{label}</span>
                  <span className="font-semibold tabular-nums text-sm">{counts[key]}</span>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="border-t pt-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Total Contacts</span>
                <span className="text-lg font-bold tabular-nums">{total}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
