import { useEffect, useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  StickyNote, Plus, Trash2, Bell, BellOff, ChevronDown, ChevronRight, Check, X, Pencil,
} from 'lucide-react';
import { useCrmUser } from '@/hooks/useCrmUser';
import {
  listNotes, createNote, updateNote, deleteNote, type UserNote,
} from '@/services/userNotes';
import { format, isPast, isWithinInterval, addMinutes } from 'date-fns';

// ─── helpers ────────────────────────────────────────────────────────────────

function reminderState(reminder_at: string | null): 'none' | 'upcoming' | 'due' | 'overdue' {
  if (!reminder_at) return 'none';
  const d = new Date(reminder_at);
  if (isPast(d)) return 'overdue';
  if (isWithinInterval(d, { start: new Date(), end: addMinutes(new Date(), 30) })) return 'due';
  return 'upcoming';
}

function defaultReminderValue() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return d.toISOString().slice(0, 16);
}

// ─── Add-note inline form ────────────────────────────────────────────────────

interface AddNoteFormProps {
  onSave: (content: string, reminderAt: string | null) => Promise<void>;
  onCancel: () => void;
}

function AddNoteForm({ onSave, onCancel }: AddNoteFormProps) {
  const [content, setContent] = useState('');
  const [showReminder, setShowReminder] = useState(false);
  const [reminderAt, setReminderAt] = useState(defaultReminderValue());
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { textareaRef.current?.focus(); }, []);

  const handleSave = async () => {
    if (!content.trim()) return;
    setSaving(true);
    await onSave(content.trim(), showReminder ? reminderAt : null);
    setSaving(false);
  };

  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-2.5 space-y-2">
      <Textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Note text..."
        className="min-h-[72px] text-sm resize-none bg-background"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSave();
          if (e.key === 'Escape') onCancel();
        }}
      />
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => setShowReminder((v) => !v)}
          className={`flex items-center gap-1 text-[11px] rounded px-1.5 py-0.5 border transition-colors ${
            showReminder
              ? 'border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
              : 'border-input text-muted-foreground hover:border-primary/40'
          }`}
        >
          {showReminder ? <Bell className="h-3 w-3" /> : <BellOff className="h-3 w-3" />}
          Reminder
        </button>
        {showReminder && (
          <input
            type="datetime-local"
            value={reminderAt}
            onChange={(e) => setReminderAt(e.target.value)}
            className="h-6 rounded border border-input bg-background px-1.5 text-[11px] text-foreground"
          />
        )}
        <div className="ml-auto flex gap-1.5">
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={onCancel}>
            Cancel
          </Button>
          <Button size="sm" className="h-7 px-2.5 text-xs" onClick={handleSave} disabled={saving || !content.trim()}>
            {saving ? 'Saving…' : 'Add'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Single note row ─────────────────────────────────────────────────────────

interface NoteRowProps {
  note: UserNote;
  onToggleComplete: (note: UserNote) => void;
  onUpdate: (id: string, fields: Partial<Pick<UserNote, 'content' | 'reminder_at'>>) => Promise<void>;
  onDelete: (id: string) => void;
}

function NoteRow({ note, onToggleComplete, onUpdate, onDelete }: NoteRowProps) {
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(note.content);
  const [editReminder, setEditReminder] = useState(note.reminder_at?.slice(0, 16) ?? '');
  const [showReminderInput, setShowReminderInput] = useState(Boolean(note.reminder_at));
  const [saving, setSaving] = useState(false);
  const rs = reminderState(note.reminder_at);

  const handleSaveEdit = async () => {
    if (!editContent.trim()) return;
    setSaving(true);
    await onUpdate(note.id, {
      content: editContent.trim(),
      reminder_at: showReminderInput && editReminder ? editReminder : null,
    });
    setSaving(false);
    setEditing(false);
  };

  const handleCancelEdit = () => {
    setEditContent(note.content);
    setEditReminder(note.reminder_at?.slice(0, 16) ?? '');
    setShowReminderInput(Boolean(note.reminder_at));
    setEditing(false);
  };

  const reminderBadge = rs !== 'none' && !note.is_completed && (
    <span className={`inline-flex items-center gap-0.5 rounded px-1 py-0 text-[10px] font-medium ${
      rs === 'overdue'  ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400' :
      rs === 'due'      ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' :
                          'bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400'
    }`}>
      <Bell className="h-2.5 w-2.5" />
      {format(new Date(note.reminder_at!), 'dd MMM HH:mm')}
      {rs === 'overdue' && ' (overdue)'}
    </span>
  );

  if (editing) {
    return (
      <div className="rounded-lg border border-primary/30 bg-primary/5 p-2.5 space-y-2">
        <Textarea
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          className="min-h-[64px] text-sm resize-none bg-background"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSaveEdit();
            if (e.key === 'Escape') handleCancelEdit();
          }}
        />
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setShowReminderInput((v) => !v);
              if (!editReminder) setEditReminder(defaultReminderValue());
            }}
            className={`flex items-center gap-1 text-[11px] rounded px-1.5 py-0.5 border transition-colors ${
              showReminderInput
                ? 'border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                : 'border-input text-muted-foreground hover:border-primary/40'
            }`}
          >
            {showReminderInput ? <Bell className="h-3 w-3" /> : <BellOff className="h-3 w-3" />}
            Reminder
          </button>
          {showReminderInput && (
            <input
              type="datetime-local"
              value={editReminder}
              onChange={(e) => setEditReminder(e.target.value)}
              className="h-6 rounded border border-input bg-background px-1.5 text-[11px] text-foreground"
            />
          )}
          <div className="ml-auto flex gap-1.5">
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={handleCancelEdit}>
              <X className="h-3 w-3" />
            </Button>
            <Button size="sm" className="h-7 px-2 text-xs" onClick={handleSaveEdit} disabled={saving || !editContent.trim()}>
              <Check className="h-3 w-3 mr-1" />{saving ? '…' : 'Save'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`group flex items-start gap-2 rounded-lg border px-2.5 py-2 transition-colors ${
      note.is_completed ? 'border-transparent bg-muted/30 opacity-60' : 'border-border bg-card hover:border-primary/20'
    }`}>
      <Checkbox
        checked={note.is_completed}
        onCheckedChange={() => onToggleComplete(note)}
        className="mt-0.5 shrink-0 h-4 w-4"
      />
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className={`text-sm leading-snug whitespace-pre-wrap break-words ${note.is_completed ? 'line-through text-muted-foreground' : ''}`}>
          {note.content}
        </p>
        {reminderBadge}
      </div>
      <div className="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          size="icon" variant="ghost" className="h-6 w-6"
          onClick={() => setEditing(true)}
          title="Edit note"
        >
          <Pencil className="h-3 w-3" />
        </Button>
        <Button
          size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:text-destructive"
          onClick={() => onDelete(note.id)}
          title="Delete note"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

// ─── Main widget ─────────────────────────────────────────────────────────────

export function NotepadCard() {
  const { crmUserId } = useCrmUser();
  const [notes, setNotes] = useState<UserNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  const fetchNotes = useCallback(async () => {
    if (!crmUserId) return;
    const { data } = await listNotes(crmUserId);
    setNotes(data ?? []);
    setLoading(false);
  }, [crmUserId]);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  const handleAdd = async (content: string, reminderAt: string | null) => {
    if (!crmUserId) return;
    await createNote(crmUserId, content, reminderAt);
    setAdding(false);
    fetchNotes();
  };

  const handleToggleComplete = async (note: UserNote) => {
    await updateNote(note.id, { is_completed: !note.is_completed });
    fetchNotes();
  };

  const handleUpdate = async (id: string, fields: Partial<Pick<UserNote, 'content' | 'reminder_at'>>) => {
    await updateNote(id, fields);
    fetchNotes();
  };

  const handleDelete = async (id: string) => {
    await deleteNote(id);
    fetchNotes();
  };

  const openNotes = notes.filter((n) => !n.is_completed);
  const completedNotes = notes.filter((n) => n.is_completed);

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <StickyNote className="h-4.5 w-4.5 text-primary" />
            </div>
            <CardTitle className="text-base">
              Notes
              {openNotes.length > 0 && (
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {openNotes.length} open
                </span>
              )}
            </CardTitle>
          </div>
          {!adding && (
            <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => setAdding(true)}>
              <Plus className="h-3.5 w-3.5" /> Add
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-2">
        {loading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : (
          <>
            {adding && (
              <AddNoteForm
                onSave={handleAdd}
                onCancel={() => setAdding(false)}
              />
            )}

            {/* Open notes */}
            <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-0.5">
              {openNotes.length === 0 && !adding && (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No notes yet — click Add to start
                </p>
              )}
              {openNotes.map((note) => (
                <NoteRow
                  key={note.id}
                  note={note}
                  onToggleComplete={handleToggleComplete}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                />
              ))}
            </div>

            {/* Completed section */}
            {completedNotes.length > 0 && (
              <div>
                <button
                  onClick={() => setShowCompleted((v) => !v)}
                  className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors py-1"
                >
                  {showCompleted ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                  Completed ({completedNotes.length})
                </button>
                {showCompleted && (
                  <div className="space-y-1.5 mt-1 max-h-[160px] overflow-y-auto pr-0.5">
                    {completedNotes.map((note) => (
                      <NoteRow
                        key={note.id}
                        note={note}
                        onToggleComplete={handleToggleComplete}
                        onUpdate={handleUpdate}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
