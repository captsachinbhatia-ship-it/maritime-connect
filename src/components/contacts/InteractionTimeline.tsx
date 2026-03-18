import { useMemo, useState } from 'react';
import { format, isToday, isYesterday, differenceInDays } from 'date-fns';
import {
  PhoneCall,
  Mail,
  MessageSquare,
  Video,
  FileEdit,
  Clock,
  User,
  ChevronDown,
  ChevronUp,
  Pencil,
  MessageCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ContactInteraction } from '@/services/interactions';
import { extractKeywordChips } from '@/lib/interactionKeywords';
import { InteractionComments } from './InteractionComments';
import { LogInteractionModal, EditInteractionData } from './LogInteractionModal';
import { useCrmUser } from '@/hooks/useCrmUser';
import { useAuth } from '@/contexts/AuthContext';

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
  onRefresh?: () => void;
}

function InteractionCard({
  interaction,
  onRefresh,
}: {
  interaction: ContactInteraction;
  onRefresh?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [commentCount, setCommentCount] = useState(interaction.comment_count || 0);
  const { crmUserId } = useCrmUser();
  const { isAdmin } = useAuth();

  const canEdit = crmUserId === interaction.user_id || isAdmin;

  const subject = interaction.subject || interaction.summary || null;
  const notes = interaction.notes || null;
  const combinedText = `${subject || ''} ${notes || ''}`;
  const chips = extractKeywordChips(combinedText);

  const hasExpandableContent = (notes && notes.length > 100) || (subject && notes);

  const editData: EditInteractionData = {
    id: interaction.id,
    contact_id: interaction.contact_id,
    interaction_type: interaction.interaction_type,
    subject: interaction.subject,
    notes: interaction.notes,
    outcome: interaction.outcome,
  };

  return (
    <>
      <div className="rounded-lg border bg-card p-4 transition-colors hover:bg-accent/30">
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
              </span>
              <div className="flex items-center gap-1 shrink-0">
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => setEditModalOpen(true)}
                    title="Edit interaction"
                  >
                    <Pencil className="h-3 w-3 text-muted-foreground" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 p-0 px-1 gap-0.5"
                  onClick={() => setShowComments(!showComments)}
                  title="Comments"
                >
                  <MessageCircle className="h-3 w-3 text-muted-foreground" />
                  {commentCount > 0 && (
                    <span className="text-[10px] text-muted-foreground">{commentCount}</span>
                  )}
                </Button>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(interaction.interaction_at), 'HH:mm')}
                </span>
                {hasExpandableContent && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => setExpanded(!expanded)}
                  >
                    {expanded ? (
                      <ChevronUp className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                  </Button>
                )}
              </div>
            </div>

            {/* Subject line */}
            {subject && (
              <p className={`text-sm text-foreground/90 ${expanded ? '' : 'line-clamp-1'}`}>
                {subject}
              </p>
            )}

            {/* Notes preview */}
            {notes && (
              <p
                className={`text-sm text-muted-foreground mt-1 ${
                  expanded ? 'whitespace-pre-wrap' : 'line-clamp-2'
                }`}
              >
                {notes}
              </p>
            )}

            {/* Expand/collapse text link */}
            {hasExpandableContent && !expanded && (
              <button
                onClick={() => setExpanded(true)}
                className="text-xs text-primary hover:underline mt-0.5"
              >
                View more
              </button>
            )}

            {/* Meta badges row */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs mt-2">
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

            {/* Keyword chips */}
            {chips.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
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

            {/* Next action */}
            {interaction.next_action && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2 pt-2 border-t">
                <Clock className="h-3 w-3 shrink-0" />
                <span>
                  Follow-up: {interaction.next_action}
                  {interaction.next_action_date && (
                    <span className="ml-1 font-medium">
                      ({format(new Date(interaction.next_action_date), 'MMM d')})
                    </span>
                  )}
                </span>
              </div>
            )}

            {/* Comments section */}
            {showComments && (
              <InteractionComments
                interactionId={interaction.id}
                contactId={interaction.contact_id}
                onCommentCountChange={setCommentCount}
              />
            )}
          </div>
        </div>
      </div>

      {/* Edit modal */}
      <LogInteractionModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSuccess={() => {
          setEditModalOpen(false);
          onRefresh?.();
        }}
        contactId={interaction.contact_id}
        editData={editData}
      />
    </>
  );
}

export function InteractionTimeline({ interactions, onRefresh }: InteractionTimelineProps) {
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
              <InteractionCard key={interaction.id} interaction={interaction} onRefresh={onRefresh} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
