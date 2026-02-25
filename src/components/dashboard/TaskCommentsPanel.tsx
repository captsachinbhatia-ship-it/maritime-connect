import { useEffect, useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Send } from 'lucide-react';
import { getTaskComments, addTaskComment, type TaskComment } from '@/services/teamTasks';
import { useCrmUser } from '@/hooks/useCrmUser';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface TaskCommentsPanelProps {
  taskId: string;
}

export function TaskCommentsPanel({ taskId }: TaskCommentsPanelProps) {
  const { crmUserId } = useCrmUser();
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchComments = useCallback(async () => {
    setLoading(true);
    const { data, error } = await getTaskComments(taskId);
    if (error) {
      console.error('Failed to load comments:', error);
    }
    setComments(data || []);
    setLoading(false);
  }, [taskId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // Auto-scroll to bottom when comments change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [comments]);

  const handleSubmit = async () => {
    if (!newComment.trim() || !crmUserId) return;
    setSending(true);
    const { error } = await addTaskComment(taskId, crmUserId, newComment.trim());
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
        <div ref={scrollRef} className="space-y-1.5 max-h-[240px] overflow-y-auto overscroll-contain pr-1">
          {comments.map((c) => {
            const isMe = c.crm_user_id === crmUserId;
            return (
              <div key={c.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] rounded-lg px-2.5 py-1.5 text-[11px] ${
                    isMe
                      ? 'bg-primary text-primary-foreground rounded-br-sm'
                      : 'bg-muted text-foreground rounded-bl-sm'
                  }`}
                >
                  {!isMe && (
                    <p className="font-semibold text-[10px] mb-0.5 opacity-80">{c.user_name}</p>
                  )}
                  <p className="whitespace-pre-wrap break-words">{c.comment}</p>
                  <p className={`text-[9px] mt-0.5 ${isMe ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                    {format(new Date(c.created_at), 'dd MMM, HH:mm')}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {comments.length === 0 && (
        <p className="text-[11px] text-muted-foreground text-center py-1">No comments yet</p>
      )}
      <div className="flex gap-1">
        <Input
          placeholder="Add comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSubmit()}
          className="h-7 text-xs"
        />
        <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={handleSubmit} disabled={sending || !newComment.trim()}>
          <Send className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
