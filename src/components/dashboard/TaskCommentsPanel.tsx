import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Send } from 'lucide-react';
import { getTaskComments, addTaskComment, type TaskComment } from '@/services/teamTasks';
import { toast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface TaskCommentsPanelProps {
  taskId: string;
}

export function TaskCommentsPanel({ taskId }: TaskCommentsPanelProps) {
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [sending, setSending] = useState(false);

  const fetchComments = useCallback(async () => {
    setLoading(true);
    const { data } = await getTaskComments(taskId);
    setComments(data || []);
    setLoading(false);
  }, [taskId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleSubmit = async () => {
    if (!newComment.trim()) return;
    setSending(true);
    const { error } = await addTaskComment(taskId, newComment.trim());
    if (error) {
      toast({ title: 'Error', description: error, variant: 'destructive' });
    } else {
      setNewComment('');
      fetchComments();
    }
    setSending(false);
  };

  if (loading) {
    return <Skeleton className="h-16 w-full" />;
  }

  return (
    <div className="space-y-2 mt-2 border-t pt-2">
      {comments.length > 0 && (
        <div className="space-y-1.5 max-h-[120px] overflow-y-auto">
          {comments.map((c) => (
            <div key={c.id} className="text-[11px]">
              <span className="font-medium">{c.user_name}</span>{' '}
              <span className="text-muted-foreground">
                {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
              </span>
              <p className="text-muted-foreground mt-0.5">{c.comment}</p>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-1">
        <Input
          placeholder="Add comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          className="h-7 text-xs"
        />
        <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={handleSubmit} disabled={sending || !newComment.trim()}>
          <Send className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
