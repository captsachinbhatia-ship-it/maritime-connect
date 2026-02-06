import { ReactNode } from 'react';
import { format } from 'date-fns';
import { CalendarClock, MessageSquare } from 'lucide-react';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { extractKeywordChips } from '@/lib/interactionKeywords';
import { Badge } from '@/components/ui/badge';

interface ContactRowHoverCardProps {
  children: ReactNode;
  lastInteractionSubject?: string | null;
  lastInteractionNotes?: string | null;
  nextFollowupDue?: string | null;
}

export function ContactRowHoverCard({
  children,
  lastInteractionSubject,
  lastInteractionNotes,
  nextFollowupDue,
}: ContactRowHoverCardProps) {
  const hasContent = lastInteractionSubject || lastInteractionNotes || nextFollowupDue;

  if (!hasContent) {
    return <>{children}</>;
  }

  const previewText = lastInteractionSubject || lastInteractionNotes || '';
  const chips = extractKeywordChips(`${lastInteractionSubject || ''} ${lastInteractionNotes || ''}`);

  return (
    <HoverCard openDelay={400} closeDelay={100}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent
        side="bottom"
        align="start"
        className="w-72 p-3 text-sm"
      >
        <div className="space-y-2">
          {(lastInteractionSubject || lastInteractionNotes) && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1">
                <MessageSquare className="h-3 w-3" />
                Last Interaction
              </div>
              {lastInteractionSubject && (
                <p className="text-sm font-medium text-foreground line-clamp-1">
                  {lastInteractionSubject}
                </p>
              )}
              {lastInteractionNotes && (
                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                  {lastInteractionNotes}
                </p>
              )}
              {chips.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {chips.map((chip) => (
                    <Badge
                      key={chip}
                      variant="outline"
                      className="h-5 px-1.5 text-[10px] font-semibold border-amber-500 text-amber-600 dark:text-amber-400"
                    >
                      {chip}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}
          {nextFollowupDue && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1">
                <CalendarClock className="h-3 w-3" />
                Next Follow-up
              </div>
              <p className="text-xs text-foreground">
                {format(new Date(nextFollowupDue), 'MMM d, yyyy h:mm a')}
              </p>
            </div>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
