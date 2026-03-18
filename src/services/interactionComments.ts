import { supabase } from '@/lib/supabaseClient';

export interface InteractionComment {
  id: string;
  interaction_id: string;
  contact_id: string;
  user_id: string;
  comment: string;
  created_at: string;
  creator_full_name?: string;
}

export async function getCommentsByInteraction(
  interactionId: string
): Promise<{ data: InteractionComment[] | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('interaction_comments')
      .select('*, crm_users(full_name)')
      .eq('interaction_id', interactionId)
      .order('created_at', { ascending: true });

    if (error) return { data: null, error: error.message };

    const mapped = (data || []).map((c: any) => ({
      id: c.id,
      interaction_id: c.interaction_id,
      contact_id: c.contact_id,
      user_id: c.user_id,
      comment: c.comment,
      created_at: c.created_at,
      creator_full_name: c.crm_users?.full_name || 'Unknown',
    }));

    return { data: mapped, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Failed to fetch comments' };
  }
}

export async function addComment(
  interactionId: string,
  contactId: string,
  userId: string,
  comment: string
): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase
      .from('interaction_comments')
      .insert({
        interaction_id: interactionId,
        contact_id: contactId,
        user_id: userId,
        comment: comment.trim(),
      });

    if (error) return { error: error.message };
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to add comment' };
  }
}

export async function deleteComment(
  commentId: string
): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase
      .from('interaction_comments')
      .delete()
      .eq('id', commentId);

    if (error) return { error: error.message };
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to delete comment' };
  }
}
