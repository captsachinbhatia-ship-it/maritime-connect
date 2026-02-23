import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';
import { createTeamTask, type TaskPriority } from '@/services/teamTasks';
import { listCrmUsers, type CrmUser } from '@/services/users';
import { toast } from '@/hooks/use-toast';

interface CreateTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function CreateTaskModal({ open, onOpenChange, onCreated }: CreateTaskModalProps) {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('MED');
  const [isBroadcast, setIsBroadcast] = useState(true);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [users, setUsers] = useState<CrmUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && !isBroadcast && users.length === 0) {
      setLoadingUsers(true);
      listCrmUsers().then(({ data }) => {
        setUsers(data || []);
        setLoadingUsers(false);
      });
    }
  }, [open, isBroadcast, users.length]);

  const resetForm = () => {
    setTitle('');
    setNotes('');
    setDueDate('');
    setPriority('MED');
    setIsBroadcast(true);
    setSelectedRecipients([]);
  };

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setSubmitting(true);

    const { error } = await createTeamTask({
      title: title.trim(),
      notes: notes.trim() || null,
      due_at: dueDate || null,
      priority,
      is_broadcast: isBroadcast,
      recipient_ids: isBroadcast ? [] : selectedRecipients,
    });

    if (error) {
      toast({ title: 'Error', description: error, variant: 'destructive' });
    } else {
      toast({ title: 'Task created' });
      resetForm();
      onCreated();
      onOpenChange(false);
    }
    setSubmitting(false);
  };

  const toggleRecipient = (userId: string) => {
    setSelectedRecipients((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const priorityColors: Record<TaskPriority, string> = {
    LOW: 'bg-muted text-muted-foreground',
    MED: 'bg-primary/10 text-primary',
    HIGH: 'bg-destructive/10 text-destructive',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Task</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Title */}
          <div className="space-y-1">
            <Label htmlFor="task-title" className="text-xs">Title *</Label>
            <Input
              id="task-title"
              placeholder="Task title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-9"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <Label htmlFor="task-notes" className="text-xs">Notes</Label>
            <Textarea
              id="task-notes"
              placeholder="Optional notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[60px] text-sm resize-none"
            />
          </div>

          {/* Due Date + Priority row */}
          <div className="flex gap-3">
            <div className="flex-1 space-y-1">
              <Label htmlFor="task-due" className="text-xs">Due Date</Label>
              <Input
                id="task-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="w-28 space-y-1">
              <Label className="text-xs">Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(['LOW', 'MED', 'HIGH'] as TaskPriority[]).map((p) => (
                    <SelectItem key={p} value={p}>
                      <Badge variant="secondary" className={`text-[10px] ${priorityColors[p]}`}>{p}</Badge>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Broadcast toggle */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Broadcast to All Users</p>
              <p className="text-[11px] text-muted-foreground">Visible to everyone in the team</p>
            </div>
            <Switch checked={isBroadcast} onCheckedChange={setIsBroadcast} />
          </div>

          {/* Recipient selector (only if not broadcast) */}
          {!isBroadcast && (
            <div className="space-y-1">
              <Label className="text-xs">Select Recipients</Label>
              {loadingUsers ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <ScrollArea className="max-h-[260px] rounded-md border p-2">
                  <div className="space-y-1">
                    {users.map((u) => (
                      <label key={u.id} className="flex items-center gap-2 rounded p-1.5 hover:bg-muted cursor-pointer">
                        <Checkbox
                          checked={selectedRecipients.includes(u.id)}
                          onCheckedChange={() => toggleRecipient(u.id)}
                        />
                        <span className="text-sm">{u.full_name}</span>
                        <span className="text-[10px] text-muted-foreground ml-auto">{u.role}</span>
                      </label>
                    ))}
                  </div>
                </ScrollArea>
              )}
              {selectedRecipients.length > 0 && (
                <p className="text-[11px] text-muted-foreground">{selectedRecipients.length} selected</p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !title.trim()}>
            {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
            Create Task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
