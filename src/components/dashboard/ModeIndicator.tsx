import { Badge } from '@/components/ui/badge';
import { Crown, Phone } from 'lucide-react';

interface ModeIndicatorProps {
  isCEO: boolean;
}

export function ModeIndicator({ isCEO }: ModeIndicatorProps) {
  return (
    <Badge 
      variant="outline" 
      className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-muted-foreground border-muted"
    >
      {isCEO ? (
        <>
          <Crown className="h-3 w-3" />
          CEO Mode
        </>
      ) : (
        <>
          <Phone className="h-3 w-3" />
          Caller Mode
        </>
      )}
    </Badge>
  );
}
