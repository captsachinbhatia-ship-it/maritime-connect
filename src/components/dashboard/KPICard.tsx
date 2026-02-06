import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KPICardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  variant?: 'default' | 'warning' | 'success' | 'muted';
  isLoading?: boolean;
  onClick?: () => void;
}

export function KPICard({ title, value, icon: Icon, variant = 'default', isLoading, onClick }: KPICardProps) {
  const variantStyles = {
    default: 'bg-primary/10 text-primary',
    warning: 'bg-orange-500/10 text-orange-600',
    success: 'bg-emerald-500/10 text-emerald-600',
    muted: 'bg-muted text-muted-foreground',
  };

  return (
    <Card
      className={cn(
        'flex-1 transition-all',
        onClick && 'cursor-pointer hover:shadow-md hover:border-primary/30 active:scale-[0.99]'
      )}
      onClick={onClick}
    >
      <CardContent className="flex items-center gap-3 p-4">
        <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', variantStyles[variant])}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-muted-foreground">{title}</p>
          {isLoading ? (
            <div className="mt-1 h-6 w-10 animate-pulse rounded bg-muted" />
          ) : (
            <p className="text-xl font-bold tabular-nums text-foreground">{value}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
