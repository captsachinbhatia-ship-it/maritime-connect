import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { History, Loader2, ArrowRight, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getStageEventsByContact, StageEvent } from '@/services/stageRequests';

const STAGE_COLORS: Record<string, string> = {
  COLD_CALLING: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  ASPIRATION: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
  ACHIEVEMENT: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  INACTIVE: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
};

interface StageHistoryPanelProps {
  contactId: string;
  isVisible: boolean;
}

export function StageHistoryPanel({ contactId, isVisible }: StageHistoryPanelProps) {
  const [events, setEvents] = useState<StageEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isVisible && contactId) {
      loadEvents();
    }
  }, [isVisible, contactId]);

  const loadEvents = async () => {
    setIsLoading(true);
    setError(null);

    const result = await getStageEventsByContact(contactId);

    if (result.error) {
      setError(result.error);
    } else {
      setEvents(result.data || []);
    }

    setIsLoading(false);
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'MMM d, yyyy h:mm a');
    } catch {
      return '-';
    }
  };

  const formatStage = (stage: string | null) => {
    if (!stage) return 'None';
    return stage.replace('_', ' ');
  };

  if (!isVisible) return null;

  return (
    <div className="space-y-3">
      <h4 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <History className="h-4 w-4" />
        Stage History
      </h4>

      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading history...
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : events.length === 0 ? (
        <div className="text-sm text-muted-foreground py-4 text-center">
          No stage changes recorded
        </div>
      ) : (
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {events.map((event) => (
            <div
              key={event.id}
              className="rounded-lg border p-3 text-sm"
            >
              <div className="flex items-center gap-2 mb-2">
                {event.from_stage ? (
                  <>
                    <Badge variant="outline" className={STAGE_COLORS[event.from_stage] || ''}>
                      {formatStage(event.from_stage)}
                    </Badge>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground">Assigned to</span>
                )}
                <Badge className={STAGE_COLORS[event.to_stage] || STAGE_COLORS.INACTIVE}>
                  {formatStage(event.to_stage)}
                </Badge>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>By: {event.actor_name || 'Unknown'}</span>
                <span>{formatDate(event.occurred_at)}</span>
              </div>
              {event.note && (
                <p className="mt-2 text-xs text-muted-foreground border-t pt-2">
                  {event.note}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
