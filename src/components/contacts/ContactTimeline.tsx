import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  PhoneCall, Mail, MessageSquare, Video, FileEdit, CalendarClock,
  ArrowUpRight, FileText, Loader2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  useContactTimeline,
  TimelineItem,
  TimelineItemType,
} from '@/hooks/useContactTimeline';
import { getOutcomeBadgeColor, OUTCOME_BADGE_STYLES } from '@/lib/interactionConstants';

// ---------------------------------------------------------------------------
// Visual config per timeline item type
// ---------------------------------------------------------------------------

const TYPE_CONFIG: Record<
  TimelineItemType,
  { color: string; dotColor: string; icon: React.ReactNode; label: string }
> = {
  interaction: {
    color: 'text-blue-600 dark:text-blue-400',
    dotColor: 'bg-blue-500',
    icon: <PhoneCall className="h-3.5 w-3.5" />,
    label: 'Interactions',
  },
  followup: {
    color: 'text-amber-600 dark:text-amber-400',
    dotColor: 'bg-amber-500',
    icon: <CalendarClock className="h-3.5 w-3.5" />,
    label: 'Follow-ups',
  },
  stage_change: {
    color: 'text-green-600 dark:text-green-400',
    dotColor: 'bg-green-500',
    icon: <ArrowUpRight className="h-3.5 w-3.5" />,
    label: 'Stage Changes',
  },
  enquiry: {
    color: 'text-purple-600 dark:text-purple-400',
    dotColor: 'bg-purple-500',
    icon: <FileText className="h-3.5 w-3.5" />,
    label: 'Enquiries',
  },
};

const INTERACTION_ICON_MAP: Record<string, React.ReactNode> = {
  CALL: <PhoneCall className="h-3.5 w-3.5" />,
  COLD_CALL: <PhoneCall className="h-3.5 w-3.5" />,
  EMAIL_SENT: <Mail className="h-3.5 w-3.5" />,
  WHATSAPP_SENT: <MessageSquare className="h-3.5 w-3.5" />,
  WHATSAPP_REPLY: <MessageSquare className="h-3.5 w-3.5" />,
  MEETING: <Video className="h-3.5 w-3.5" />,
  NOTE: <FileEdit className="h-3.5 w-3.5" />,
};

// ---------------------------------------------------------------------------
// Filter pills
// ---------------------------------------------------------------------------

const FILTER_OPTIONS: { value: TimelineItemType | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'interaction', label: 'Interactions' },
  { value: 'followup', label: 'Follow-ups' },
  { value: 'stage_change', label: 'Stage Changes' },
  { value: 'enquiry', label: 'Enquiries' },
];

// ---------------------------------------------------------------------------
// Single timeline card
// ---------------------------------------------------------------------------

function TimelineCard({ item }: { item: TimelineItem }) {
  const config = TYPE_CONFIG[item.type];

  // For interactions, try to resolve a more specific icon
  const icon =
    item.type === 'interaction'
      ? INTERACTION_ICON_MAP[item.title.replace(/ /g, '_').toUpperCase()] ?? config.icon
      : config.icon;

  const relativeTime = (() => {
    try {
      return formatDistanceToNow(new Date(item.date), { addSuffix: true });
    } catch {
      return '';
    }
  })();

  return (
    <div className="relative flex gap-3 pb-6 last:pb-0">
      {/* Vertical line */}
      <div className="absolute left-[9px] top-5 bottom-0 w-px bg-border last:hidden" />

      {/* Dot */}
      <div
        className={`relative z-10 mt-1.5 h-[18px] w-[18px] shrink-0 rounded-full flex items-center justify-center ${config.dotColor} text-white`}
      >
        {icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground leading-tight">
              {item.title}
            </p>
            {item.subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                {item.subtitle}
              </p>
            )}
          </div>
          <div className="shrink-0 text-right">
            <span className="text-[11px] text-muted-foreground whitespace-nowrap">
              {relativeTime}
            </span>
            {item.actor && (
              <p className="text-[11px] text-muted-foreground truncate max-w-[100px]">
                {item.actor}
              </p>
            )}
          </div>
        </div>

        {/* Badges row */}
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {/* Outcome badge (interactions) */}
          {item.outcome && (
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                OUTCOME_BADGE_STYLES[getOutcomeBadgeColor(item.outcome)]
              }`}
            >
              {item.outcome.replace(/_/g, ' ')}
            </span>
          )}

          {/* Status / stage badge */}
          {item.badge && !item.outcome && (
            <Badge variant="outline" className="text-[10px] py-0 h-4">
              {item.badge.replace(/_/g, ' ')}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface ContactTimelineProps {
  contactId: string;
  enabled: boolean;
}

export function ContactTimeline({ contactId, enabled }: ContactTimelineProps) {
  const [filter, setFilter] = useState<TimelineItemType | 'all'>('all');
  const { items, totalCount, isLoading, error, hasMore, loadMore } =
    useContactTimeline(contactId, enabled);

  const filteredItems =
    filter === 'all' ? items : items.filter((i) => i.type === filter);

  return (
    <div className="space-y-4">
      {/* Filter row */}
      <div className="flex flex-wrap gap-1.5">
        {FILTER_OPTIONS.map((opt) => (
          <Button
            key={opt.value}
            variant={filter === opt.value ? 'default' : 'outline'}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setFilter(opt.value)}
          >
            {opt.label}
          </Button>
        ))}
        <span className="ml-auto text-xs text-muted-foreground self-center">
          {totalCount} events
        </span>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Error state */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Empty state */}
      {!isLoading && filteredItems.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No activity recorded yet</p>
        </div>
      )}

      {/* Timeline */}
      {!isLoading && filteredItems.length > 0 && (
        <div>
          {filteredItems.map((item) => (
            <TimelineCard key={item.id} item={item} />
          ))}

          {hasMore && (
            <div className="pt-2 text-center">
              <Button variant="outline" size="sm" onClick={loadMore}>
                Load more
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
