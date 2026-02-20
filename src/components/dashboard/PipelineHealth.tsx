import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchDashboardMetrics } from '@/services/dashboardMetrics';
import { AssignmentStage } from '@/types/directory';

const stageConfig = [
  { key: 'COLD_CALLING' as AssignmentStage, label: 'Cold Calling', color: 'bg-blue-500' },
  { key: 'ASPIRATION' as AssignmentStage, label: 'Aspiration', color: 'bg-amber-500' },
  { key: 'ACHIEVEMENT' as AssignmentStage, label: 'Achievement', color: 'bg-emerald-500' },
] as const;

export function PipelineHealth() {
  const [counts, setCounts] = useState<Record<AssignmentStage, number>>({
    COLD_CALLING: 0,
    ASPIRATION: 0,
    ACHIEVEMENT: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPipelineHealth = async () => {
      setIsLoading(true);
      try {
        const { data: metrics } = await fetchDashboardMetrics();
        if (metrics) {
          setCounts(metrics.byStage);
        }
      } catch (error) {
        console.error('Failed to fetch pipeline health:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPipelineHealth();
  }, []);

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Activity className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">Pipeline Health</CardTitle>
            <CardDescription>Global contact distribution by stage</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Large progress bar */}
            {total > 0 && (
              <div className="flex h-4 overflow-hidden rounded-full bg-muted">
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

            {/* Stage grid */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {stageConfig.map(({ key, label, color }) => {
                const count = counts[key];
                const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : '0';
                return (
                  <div
                    key={key}
                    className="rounded-lg border bg-muted/30 p-4 text-center"
                  >
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <div className={cn('h-3 w-3 rounded-full', color)} />
                      <span className="text-sm font-medium text-muted-foreground">{label}</span>
                    </div>
                    <p className="text-3xl font-bold">{count}</p>
                    <p className="text-xs text-muted-foreground">{percentage}%</p>
                  </div>
                );
              })}
            </div>

            {/* Total */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Total Pipeline Contacts</span>
                <span className="text-2xl font-bold">{total}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
