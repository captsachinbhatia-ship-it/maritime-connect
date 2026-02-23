import { useEffect, useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ListTodo, StickyNote, Plus, Pin, PinOff, Trash2 } from 'lucide-react';
import { useCrmUser } from '@/hooks/useCrmUser';
import { getMyTasks, createTask, updateTask, deleteTask, type UserTask } from '@/services/userTasks';
import { getNotepad, saveNotepad } from '@/services/userNotepad';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export function TasksNotepad() {
  const { crmUserId } = useCrmUser();
  const [activeTab, setActiveTab] = useState('tasks');

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <ListTodo className="h-4.5 w-4.5 text-primary" />
          </div>
          <CardTitle className="text-base">Tasks & Notes</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full h-8">
            <TabsTrigger value="tasks" className="text-xs flex-1">
              <ListTodo className="h-3 w-3 mr-1" /> Tasks
            </TabsTrigger>
            <TabsTrigger value="notepad" className="text-xs flex-1">
              <StickyNote className="h-3 w-3 mr-1" /> Notepad
            </TabsTrigger>
          </TabsList>
          <TabsContent value="tasks" className="mt-2">
            {crmUserId ? <TasksList crmUserId={crmUserId} /> : <p className="text-sm text-muted-foreground py-4 text-center">Loading...</p>}
          </TabsContent>
          <TabsContent value="notepad" className="mt-2">
            {crmUserId ? <NotepadEditor crmUserId={crmUserId} /> : <p className="text-sm text-muted-foreground py-4 text-center">Loading...</p>}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function TasksList({ crmUserId }: { crmUserId: string }) {
  const [tasks, setTasks] = useState<UserTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [adding, setAdding] = useState(false);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    const { data } = await getMyTasks(crmUserId);
    setTasks(data || []);
    setLoading(false);
  }, [crmUserId]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const handleAdd = async () => {
    if (!newTitle.trim()) return;
    setAdding(true);
    const { error } = await createTask(crmUserId, newTitle.trim());
    if (error) {
      toast({ title: 'Error', description: error, variant: 'destructive' });
    } else {
      setNewTitle('');
      fetchTasks();
    }
    setAdding(false);
  };

  const handleToggleDone = async (task: UserTask) => {
    await updateTask(task.id, { is_done: !task.is_done });
    fetchTasks();
  };

  const handleTogglePin = async (task: UserTask) => {
    await updateTask(task.id, { is_pinned: !task.is_pinned });
    fetchTasks();
  };

  const handleDelete = async (taskId: string) => {
    await deleteTask(taskId);
    fetchTasks();
  };

  if (loading) {
    return <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>;
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-1.5">
        <Input
          placeholder="Add a task..."
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          className="h-8 text-sm"
        />
        <Button size="sm" className="h-8 px-2" onClick={handleAdd} disabled={adding || !newTitle.trim()}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="space-y-1 max-h-[240px] overflow-y-auto pr-1">
        {tasks.length === 0 ? (
          <p className="py-3 text-center text-sm text-muted-foreground">No tasks yet</p>
        ) : (
          tasks.map((task) => (
            <div key={task.id} className={`flex items-center gap-2 rounded-lg border p-1.5 ${task.is_done ? 'opacity-50' : ''}`}>
              <Checkbox
                checked={task.is_done}
                onCheckedChange={() => handleToggleDone(task)}
                className="shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className={`text-sm truncate ${task.is_done ? 'line-through text-muted-foreground' : ''}`}>
                  {task.title}
                </p>
                {task.due_date && (
                  <p className="text-[10px] text-muted-foreground">{format(new Date(task.due_date), 'dd MMM')}</p>
                )}
              </div>
              <div className="flex gap-0.5 shrink-0">
                {task.is_pinned && <Badge variant="secondary" className="text-[10px] py-0 h-4 px-1">📌</Badge>}
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleTogglePin(task)}>
                  {task.is_pinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
                </Button>
                <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => handleDelete(task.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function NotepadEditor({ crmUserId }: { crmUserId: string }) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await getNotepad(crmUserId);
      setContent(data);
      setLoading(false);
    };
    load();
  }, [crmUserId]);

  const handleChange = (value: string) => {
    setContent(value);
    // Autosave after 1s
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      setSaving(true);
      await saveNotepad(crmUserId, value);
      setSaving(false);
    }, 1000);
  };

  if (loading) return <Skeleton className="h-[200px] w-full" />;

  return (
    <div className="space-y-1">
      <Textarea
        value={content}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Quick notes, reminders..."
        className="min-h-[200px] text-sm resize-none"
      />
      <p className="text-[10px] text-muted-foreground text-right">
        {saving ? 'Saving...' : 'Auto-saved'}
      </p>
    </div>
  );
}
