import { AlertTriangle, Calendar, CalendarClock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { OversightKPIs } from '@/services/followupsOversight';

interface OversightKPITilesProps {
  kpis: OversightKPIs | null;
  isLoading: boolean;
}

export function OversightKPITiles({ kpis, isLoading }: OversightKPITilesProps) {
  const tiles = [
    {
      label: 'Overdue',
      value: kpis?.overdue ?? 0,
      icon: AlertTriangle,
      colorClass: 'text-red-600 dark:text-red-400',
      bgClass: 'bg-red-100 dark:bg-red-900/30',
    },
    {
      label: 'Due Today',
      value: kpis?.dueToday ?? 0,
      icon: Calendar,
      colorClass: 'text-amber-600 dark:text-amber-400',
      bgClass: 'bg-amber-100 dark:bg-amber-900/30',
    },
    {
      label: 'Next 7 Days',
      value: kpis?.next7Days ?? 0,
      icon: CalendarClock,
      colorClass: 'text-blue-600 dark:text-blue-400',
      bgClass: 'bg-blue-100 dark:bg-blue-900/30',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {tiles.map((tile) => (
        <Card key={tile.label}>
          <CardContent className="flex items-center gap-4 p-6">
            <div className={`rounded-full p-3 ${tile.bgClass}`}>
              <tile.icon className={`h-6 w-6 ${tile.colorClass}`} />
            </div>
            <div>
              {isLoading ? (
                <>
                  <Skeleton className="h-8 w-16 mb-1" />
                  <Skeleton className="h-4 w-20" />
                </>
              ) : (
                <>
                  <p className={`text-3xl font-bold ${tile.colorClass}`}>
                    {tile.value}
                  </p>
                  <p className="text-sm text-muted-foreground">{tile.label}</p>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
