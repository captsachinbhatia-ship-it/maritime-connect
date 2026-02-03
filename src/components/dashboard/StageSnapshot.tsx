import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, BarChart3 } from 'lucide-react';
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

export function StageSnapshot() {
  const { user } = useAuth();
  const [counts, setCounts] = useState<StageCounts>({
    COLD_CALLING: 0,
    ASPIRATION: 0,
    ACHIEVEMENT: 0,
    INACTIVE: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStageCounts = async () => {
      if (!user?.id) return;

      setIsLoading(true);

      try {
        // First get the current user's CRM ID
        const { data: crmUser } = await supabase
          .from('crm_users')
          .select('id')
          .eq('auth_user_id', user.id)
          .maybeSingle();

        if (!crmUser) {
          setIsLoading(false);
          return;
        }

        const { data: assignments } = await supabase
          .from('contact_assignments')
          .select('contact_id, stage')
          .eq('assigned_to_crm_user_id', crmUser.id)
          .eq('status', 'ACTIVE');

        // Get unique contact per stage (latest assignment)
        const latestByContact = new Map<string, string>();
        (assignments || []).forEach(a => {
          // Since we're filtering by user, each contact should only have one active assignment
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
  }, [user?.id]);

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
            <BarChart3 className="h-5 w-5 text-accent-foreground" />
          </div>
          <div>
            <CardTitle className="text-lg">Stage Snapshot</CardTitle>
            <CardDescription>Contacts by pipeline stage</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Progress bar */}
            {total > 0 && (
              <div className="flex h-3 overflow-hidden rounded-full bg-muted">
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
            <div className="grid grid-cols-2 gap-3">
              {stageConfig.map(({ key, label, color }) => (
                <div
                  key={key}
                  className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2"
                >
                  <div className={cn('h-3 w-3 rounded-full', color)} />
                  <span className="flex-1 text-sm text-muted-foreground">{label}</span>
                  <span className="font-semibold">{counts[key]}</span>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="border-t pt-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Total Contacts</span>
                <span className="text-lg font-bold">{total}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
