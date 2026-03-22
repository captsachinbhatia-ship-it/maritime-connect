import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { formatDistanceToNow } from 'date-fns';
import { type ContactV2Row } from '@/hooks/useContactsV2Data';

// ---------------------------------------------------------------------------
// Initials avatar
// ---------------------------------------------------------------------------

function Initials({ name }: { name: string | null }) {
  const initials = (name || '?')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="h-6 w-6 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[10px] font-semibold shrink-0">
      {initials}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

interface ContactKanbanCardProps {
  contact: ContactV2Row;
  onClick: (contact: ContactV2Row) => void;
}

export function ContactKanbanCard({ contact, onClick }: ContactKanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: contact.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const lastInteraction = contact.last_interaction_at
    ? formatDistanceToNow(new Date(contact.last_interaction_at), { addSuffix: true })
    : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onClick(contact)}
      className="rounded-lg border bg-card p-3 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
    >
      <p className="text-sm font-medium text-foreground truncate">
        {contact.full_name}
      </p>
      {contact.company_name && (
        <p className="text-xs text-muted-foreground truncate mt-0.5">
          {contact.company_name}
        </p>
      )}
      <div className="flex items-center justify-between mt-2">
        {contact.primary_owner && (
          <Initials name={contact.primary_owner} />
        )}
        {lastInteraction && (
          <span className="text-[10px] text-muted-foreground ml-auto">
            {lastInteraction}
          </span>
        )}
      </div>
    </div>
  );
}
