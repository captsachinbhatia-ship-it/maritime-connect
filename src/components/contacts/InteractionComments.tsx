import { useState, useEffect, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Send, Trash2, User, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { useCrmUser } from '@/hooks/useCrmUser';
import { useAuth } from '@/contexts/AuthContext';
import {
  getCommentsByInteraction,
  addComment,
  deleteComment,
  InteractionComment,
} from '@/services/interactionComments';

interface InteractionCommentsProps {
  interactionId: string;
  contactId: string;
  onCommentCountChange?: (count: number) => void;
}

export function InteractionComments({
  interactionId,
  contactId,
  onCommentCountChange,
}: InteractionCommentsProps) {
  const { crmUserId } = useCrmUser();
  const { isAdmin } = useAuth();
  const [comments, setComments] = useState<InteractionComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchComments = useCallback(async () => {
    setLoading(true);
    const { data } = await getCommentsByInteraction(interactionId);
    setComments(data || []);
    onCommentCountChange?.(data?.length || 0);
    setLoading(false);
  }, [interactionId, onCommentCountChange]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleAdd = async () => {
    if (!newComment.trim() || !crmUserId) return;
    setSubmitting(true);
    const { error } = await addComment(interactionId, contactId, crmUserId, newComment);
    if (error) {
      toast({ title: 'Error', description: error, variant: 'destructive' });
    } else {
      setNewComment('');
      fetchComments();
    }
    setSubmitting(false);
  };

  const handleDelete = async (commentId: string) => {
    const { error } = await deleteComment(commentId);
    if (error) {
      toast({ title: 'Error', description: error, variant: 'destructive' });
    } else {
      fetchComments();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="mt-2 pt-2 border-t space-y-2">
      {loading ? (
        <p className="text-xs text-muted-foreground">Loading comments...</p>
      ) : comments.length > 0 ? (
        <div className="space-y-1.5">
          {comments.map((c) => (
            <div key={c.id} className="flex items-start gap-2 group">
              <User className="h-3 w-3 mt-0.5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium">{c.creator_full_name}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-xs text-foreground/80">{c.comment}</p>
              </div>
              {(c.user_id === crmUserId || isAdmin) && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 opacity-0 group-hover:opacity-100 shrink-0"
                  onClick={() => handleDelete(c.id)}
                  title="Delete comment"
                >
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              )}
            </div>
          ))}
        </div>
      ) : null}

      <div className="flex items-center gap-1.5">
        <Input
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a comment..."
          className="h-7 text-xs"
          maxLength={500}
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={handleAdd}
          disabled={!newComment.trim() || submitting}
        >
          {submitting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>
    </div>
  );
}
