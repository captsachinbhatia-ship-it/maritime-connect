import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KPICardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  variant?: 'default' | 'warning' | 'success' | 'muted';
  isLoading?: boolean;
}

export function KPICard({ title, value, icon: Icon, variant = 'default', isLoading }: KPICardProps) {
  const variantStyles = {
    default: 'bg-primary/10 text-primary',
    warning: 'bg-orange-500/10 text-orange-600',
    success: 'bg-emerald-500/10 text-emerald-600',
    muted: 'bg-muted text-muted-foreground',
  };

  return (
    <Card className="flex-1">
      <CardContent className="flex items-center gap-4 p-4">
        <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-lg', variantStyles[variant])}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-muted-foreground">{title}</p>
          {isLoading ? (
            <div className="mt-1 h-7 w-12 animate-pulse rounded bg-muted" />
          ) : (
            <p className="text-2xl font-bold text-foreground">{value}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
