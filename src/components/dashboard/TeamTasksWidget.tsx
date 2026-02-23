import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  ListTodo,
  Plus,
  Pin,
  PinOff,
  Trash2,
  ChevronDown,
  MessageSquare,
  Users,
  Globe,
  AlertCircle,
} from 'lucide-react';
import { useCrmUser } from '@/hooks/useCrmUser';
import { useAuth } from '@/contexts/AuthContext';
import {
  getMyTasks,
  upsertTaskUserState,
  deleteTeamTask,
  type Task,
} from '@/services/teamTasks';
import { toast } from '@/hooks/use-toast';
import { format, isPast, isToday } from 'date-fns';
import { CreateTaskModal } from './CreateTaskModal';
import { TaskCommentsPanel } from './TaskCommentsPanel';

type FilterTab = 'all' | 'open' | 'done' | 'pinned' | 'mine';

export function TeamTasksWidget() {
  const { crmUserId } = useCrmUser();
  const { isAdmin } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [mainTab, setMainTab] = useState('my');
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    const { data, error } = await getMyTasks(50);
    if (error) {
      toast({ title: 'Error loading tasks', description: error, variant: 'destructive' });
    }
    setTasks(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleToggleDone = async (task: Task) => {
    const newStatus = task.my_status === 'DONE' ? 'OPEN' : 'DONE';
    const { error } = await upsertTaskUserState(task.id, { status: newStatus });
    if (error) {
      toast({ title: 'Error', description: error, variant: 'destructive' });
    } else {
      fetchTasks();
    }
  };

  const handleTogglePin = async (task: Task) => {
    const { error } = await upsertTaskUserState(task.id, { pinned: !task.my_pinned });
    if (error) {
      toast({ title: 'Error', description: error, variant: 'destructive' });
    } else {
      fetchTasks();
    }
  };

  const handleDelete = async (taskId: string) => {
    const { error } = await deleteTeamTask(taskId);
    if (error) {
      toast({ title: 'Error', description: error, variant: 'destructive' });
    } else {
      fetchTasks();
    }
  };

  // Filter tasks based on main tab and filter tab
  const getFilteredTasks = () => {
    let filtered = tasks;

    // Main tab filter
    if (mainTab === 'team') {
      filtered = filtered.filter((t) => t.created_by_crm_user_id === crmUserId);
    }

    // Sub-filter
    switch (filterTab) {
      case 'open':
        filtered = filtered.filter((t) => t.my_status !== 'DONE');
        break;
      case 'done':
        filtered = filtered.filter((t) => t.my_status === 'DONE');
        break;
      case 'pinned':
        filtered = filtered.filter((t) => t.my_pinned);
        break;
      case 'mine':
        filtered = filtered.filter((t) => t.created_by_crm_user_id === crmUserId);
        break;
    }

    return filtered;
  };

  const filteredTasks = getFilteredTasks();

  const priorityColors: Record<string, string> = {
    LOW: 'bg-muted text-muted-foreground',
    MED: 'bg-primary/10 text-primary',
    HIGH: 'bg-destructive/10 text-destructive',
  };

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <ListTodo className="h-4.5 w-4.5 text-primary" />
            </div>
            <CardTitle className="text-base">Tasks</CardTitle>
          </div>
          <Button size="sm" className="h-8" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" /> New Task
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        {/* Main tabs: My Tasks / Team Tasks */}
        <Tabs value={mainTab} onValueChange={setMainTab}>
          <TabsList className="w-full h-8 mb-2">
            <TabsTrigger value="my" className="text-xs flex-1">My Tasks</TabsTrigger>
            <TabsTrigger value="team" className="text-xs flex-1">Team Tasks</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Filter sub-tabs */}
        <Tabs value={filterTab} onValueChange={(v) => setFilterTab(v as FilterTab)}>
          <TabsList className="w-full h-7">
            <TabsTrigger value="all" className="text-[10px] flex-1">All</TabsTrigger>
            <TabsTrigger value="open" className="text-[10px] flex-1">Open</TabsTrigger>
            <TabsTrigger value="done" className="text-[10px] flex-1">Done</TabsTrigger>
            <TabsTrigger value="pinned" className="text-[10px] flex-1">Pinned</TabsTrigger>
            <TabsTrigger value="mine" className="text-[10px] flex-1">By Me</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Task list */}
        <div className="mt-2">
          {loading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="py-6 text-center">
              <AlertCircle className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
              <p className="text-sm text-muted-foreground">No tasks found</p>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-1">
              {filteredTasks.map((task) => (
                <Collapsible
                  key={task.id}
                  open={expandedTask === task.id}
                  onOpenChange={(open) => setExpandedTask(open ? task.id : null)}
                >
                  <div
                    className={`rounded-lg border p-2 ${
                      task.my_status === 'DONE' ? 'opacity-50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <Checkbox
                        checked={task.my_status === 'DONE'}
                        onCheckedChange={() => handleToggleDone(task)}
                        className="shrink-0 mt-0.5"
                      />
                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-sm leading-tight ${
                            task.my_status === 'DONE' ? 'line-through text-muted-foreground' : ''
                          }`}
                        >
                          {task.title}
                        </p>
                        <div className="flex items-center gap-1 mt-1 flex-wrap">
                          <Badge
                            variant="secondary"
                            className={`text-[10px] py-0 h-4 px-1 ${priorityColors[task.priority] || ''}`}
                          >
                            {task.priority}
                          </Badge>
                          {task.is_broadcast ? (
                            <Badge variant="outline" className="text-[10px] py-0 h-4 px-1">
                              <Globe className="h-2.5 w-2.5 mr-0.5" /> All
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] py-0 h-4 px-1">
                              <Users className="h-2.5 w-2.5 mr-0.5" /> Private
                            </Badge>
                          )}
                          {task.due_at && (
                            <Badge
                              variant={
                                isPast(new Date(task.due_at)) && !isToday(new Date(task.due_at))
                                  ? 'destructive'
                                  : 'outline'
                              }
                              className="text-[10px] py-0 h-4 px-1"
                            >
                              {format(new Date(task.due_at), 'dd MMM')}
                            </Badge>
                          )}
                          {task.creator_name && (
                            <span className="text-[10px] text-muted-foreground">
                              by {task.creator_name}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-0.5 shrink-0 items-start">
                        <CollapsibleTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-6 w-6">
                            <ChevronDown className="h-3 w-3" />
                          </Button>
                        </CollapsibleTrigger>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => handleTogglePin(task)}
                        >
                          {task.my_pinned ? (
                            <PinOff className="h-3 w-3" />
                          ) : (
                            <Pin className="h-3 w-3" />
                          )}
                        </Button>
                        {(task.created_by_crm_user_id === crmUserId || isAdmin) && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-destructive"
                            onClick={() => handleDelete(task.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <CollapsibleContent>
                      {task.notes && (
                        <p className="text-[11px] text-muted-foreground mt-2 ml-6">
                          {task.notes}
                        </p>
                      )}
                      <div className="ml-6">
                        <TaskCommentsPanel taskId={task.id} />
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))}
            </div>
          )}
        </div>
      </CardContent>

      <CreateTaskModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={fetchTasks}
      />
    </Card>
  );
}
