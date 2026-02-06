import { useMemo } from 'react';
import { format, isToday, isYesterday, differenceInDays } from 'date-fns';
import {
  PhoneCall,
  Mail,
  MessageSquare,
  Video,
  FileEdit,
  Clock,
  User,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ContactInteraction } from '@/services/interactions';

const INTERACTION_ICONS: Record<string, React.ReactNode> = {
  CALL: <PhoneCall className="h-4 w-4" />,
  EMAIL: <Mail className="h-4 w-4" />,
  WHATSAPP: <MessageSquare className="h-4 w-4" />,
  MEETING: <Video className="h-4 w-4" />,
  NOTE: <FileEdit className="h-4 w-4" />,
};

const INTERACTION_COLORS: Record<string, string> = {
  CALL: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  WHATSAPP: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  EMAIL: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  MEETING: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  NOTE: 'bg-muted text-muted-foreground',
};

const OUTCOME_STYLES: Record<string, string> = {
  INTERESTED: 'text-green-700 dark:text-green-400',
  DEAL_PROGRESS: 'text-green-700 dark:text-green-400',
  CLOSED_WON: 'text-green-700 dark:text-green-400',
  NOT_INTERESTED: 'text-red-600 dark:text-red-400',
  CLOSED_LOST: 'text-red-600 dark:text-red-400',
  NO_RESPONSE: 'text-amber-600 dark:text-amber-400',
  FOLLOW_UP: 'text-blue-600 dark:text-blue-400',
  MEETING_SCHEDULED: 'text-blue-600 dark:text-blue-400',
};

const OUTCOME_ICONS: Record<string, string> = {
  INTERESTED: '✅',
  DEAL_PROGRESS: '📈',
  CLOSED_WON: '🎉',
  NOT_INTERESTED: '❌',
  CLOSED_LOST: '📉',
  NO_RESPONSE: '🔇',
  FOLLOW_UP: '🔔',
  MEETING_SCHEDULED: '📅',
};

function getTimeGroupLabel(dateStr: string): string {
  const date = new Date(dateStr);
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  const daysAgo = differenceInDays(new Date(), date);
  if (daysAgo <= 7) return 'This Week';
  if (daysAgo <= 30) return 'This Month';
  if (daysAgo <= 90) return 'Last 3 Months';
  return 'Older';
}

interface InteractionTimelineProps {
  interactions: ContactInteraction[];
}

export function InteractionTimeline({ interactions }: InteractionTimelineProps) {
  // Group interactions by time label
  const groupedInteractions = useMemo(() => {
    const groups: { label: string; items: ContactInteraction[] }[] = [];
    const groupMap = new Map<string, ContactInteraction[]>();

    interactions.forEach((interaction) => {
      const label = getTimeGroupLabel(interaction.interaction_at);
      if (!groupMap.has(label)) {
        groupMap.set(label, []);
      }
      groupMap.get(label)!.push(interaction);
    });

    // Preserve order
    groupMap.forEach((items, label) => {
      groups.push({ label, items });
    });

    return groups;
  }, [interactions]);

  if (interactions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {groupedInteractions.map((group) => (
        <div key={group.label}>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            {group.label}
          </h4>
          <div className="space-y-3">
            {group.items.map((interaction) => (
              <div
                key={interaction.id}
                className="rounded-lg border bg-card p-4 transition-colors hover:bg-accent/30"
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div
                    className={`shrink-0 rounded-full p-2 ${
                      INTERACTION_COLORS[interaction.interaction_type] || INTERACTION_COLORS.NOTE
                    }`}
                  >
                    {INTERACTION_ICONS[interaction.interaction_type] || (
                      <FileEdit className="h-4 w-4" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Title row */}
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-sm font-medium text-foreground truncate">
                        {interaction.interaction_type.replace('_', ' ')}
                        {interaction.summary && ` — ${interaction.summary}`}
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {format(new Date(interaction.interaction_at), 'HH:mm')}
                      </span>
                    </div>

                    {/* Meta badges */}
                    <div className="flex flex-wrap items-center gap-1.5 text-xs mb-2">
                      {interaction.outcome && (
                        <span
                          className={`font-medium ${
                            OUTCOME_STYLES[interaction.outcome] || 'text-muted-foreground'
                          }`}
                        >
                          {OUTCOME_ICONS[interaction.outcome] || '•'}{' '}
                          {interaction.outcome.replace(/_/g, ' ')}
                        </span>
                      )}
                      <span className="text-muted-foreground flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {interaction.creator_full_name ||
                          interaction.creator_email ||
                          'System'}
                      </span>
                    </div>

                    {/* Notes preview - show summary field content */}
                    {interaction.summary && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {interaction.summary}
                      </p>
                    )}

                    {/* Next action */}
                    {interaction.next_action && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2 pt-2 border-t">
                        <Clock className="h-3 w-3 shrink-0" />
                        <span>
                          🔔 Follow-up: {interaction.next_action}
                          {interaction.next_action_date && (
                            <span className="ml-1 font-medium">
                              ({format(new Date(interaction.next_action_date), 'MMM d')})
                            </span>
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
