import { useCallback, useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { ContactKanbanCard } from './ContactKanbanCard';
import { type ContactV2Row, type StageFilter } from '@/hooks/useContactsV2Data';
import { type ContactWithCompany } from '@/types';

// ---------------------------------------------------------------------------
// Column config
// ---------------------------------------------------------------------------

interface ColumnDef {
  stage: StageFilter;
  label: string;
  accent: string;
  dotColor: string;
}

const COLUMNS: ColumnDef[] = [
  { stage: 'COLD_CALLING', label: 'Cold Calling', accent: 'border-t-blue-500', dotColor: 'bg-blue-500' },
  { stage: 'TARGETING', label: 'Targeting', accent: 'border-t-orange-500', dotColor: 'bg-orange-500' },
  { stage: 'ASPIRATION', label: 'Aspiration', accent: 'border-t-amber-500', dotColor: 'bg-amber-500' },
  { stage: 'ACHIEVEMENT', label: 'Achievement', accent: 'border-t-green-500', dotColor: 'bg-green-500' },
];

// ---------------------------------------------------------------------------
// Droppable column wrapper
// ---------------------------------------------------------------------------

function KanbanColumn({
  column,
  contacts,
  onCardClick,
}: {
  column: ColumnDef;
  contacts: ContactV2Row[];
  onCardClick: (c: ContactV2Row) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.stage });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col min-w-[260px] w-[260px] shrink-0 rounded-lg border border-t-4 ${column.accent} bg-muted/30 ${
        isOver ? 'ring-2 ring-primary/40' : ''
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b">
        <div className={`h-2.5 w-2.5 rounded-full ${column.dotColor}`} />
        <span className="text-sm font-medium text-foreground">{column.label}</span>
        <Badge variant="secondary" className="ml-auto text-[10px] h-5">
          {contacts.length}
        </Badge>
      </div>

      {/* Cards */}
      <SortableContext
        items={contacts.map((c) => c.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex-1 overflow-y-auto p-2 space-y-2 max-h-[calc(100vh-280px)]">
          {contacts.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-6">
              No contacts
            </p>
          )}
          {contacts.map((c) => (
            <ContactKanbanCard key={c.id} contact={c} onClick={onCardClick} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

interface ContactKanbanViewProps {
  rows: ContactV2Row[];
  isLoading: boolean;
  onRefresh: () => void;
  onOpenContact: (contact: ContactWithCompany, stage: string | null) => void;
}

export function ContactKanbanView({
  rows,
  isLoading,
  onRefresh,
  onOpenContact,
}: ContactKanbanViewProps) {
  const { toast } = useToast();
  const [activeCard, setActiveCard] = useState<ContactV2Row | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  // Group rows by stage
  const columnData = useMemo(() => {
    const map: Record<string, ContactV2Row[]> = {};
    for (const col of COLUMNS) map[col.stage] = [];
    for (const row of rows) {
      const stage = row.stage || 'COLD_CALLING';
      if (map[stage]) map[stage].push(row);
    }
    return map;
  }, [rows]);

  const handleCardClick = useCallback(
    (c: ContactV2Row) => {
      const contact: ContactWithCompany = {
        id: c.id,
        full_name: c.full_name,
        email: c.email,
        phone: c.phone,
        company_name: c.company_name,
        is_active: c.is_active ?? true,
        updated_at: c.updated_at || '',
      } as ContactWithCompany;
      onOpenContact(contact, c.stage);
    },
    [onOpenContact],
  );

  const handleDragStart = (event: DragStartEvent) => {
    const row = rows.find((r) => r.id === event.active.id);
    setActiveCard(row || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveCard(null);
    const { active, over } = event;
    if (!over) return;

    // Determine target column (over.id is the column stage)
    const targetStage = COLUMNS.find((c) => c.stage === over.id)?.stage;
    if (!targetStage) return;

    const contact = rows.find((r) => r.id === active.id);
    if (!contact || contact.stage === targetStage) return;

    // Update stage on the active primary assignment
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('contact_assignments')
      .update({ stage: targetStage, stage_changed_at: now })
      .eq('contact_id', contact.id)
      .eq('status', 'ACTIVE')
      .is('ended_at', null)
      .ilike('assignment_role', 'primary');

    if (error) {
      toast({
        title: 'Stage update failed',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Stage updated',
      description: `${contact.full_name} moved to ${targetStage.replace(/_/g, ' ')}`,
    });
    onRefresh();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 overflow-x-auto pb-4">
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.stage}
            column={col}
            contacts={columnData[col.stage] || []}
            onCardClick={handleCardClick}
          />
        ))}
      </div>

      {/* Drag overlay — shows card while dragging */}
      <DragOverlay>
        {activeCard ? (
          <div className="rounded-lg border bg-card p-3 shadow-lg w-[244px] opacity-90">
            <p className="text-sm font-medium truncate">{activeCard.full_name}</p>
            {activeCard.company_name && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {activeCard.company_name}
              </p>
            )}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
