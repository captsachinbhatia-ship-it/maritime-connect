import { supabase } from '@/lib/supabaseClient';

export interface UserTask {
  id: string;
  user_id: string;
  assigned_by: string | null;
  title: string;
  notes: string | null;
  due_date: string | null;
  is_pinned: boolean;
  is_done: boolean;
  created_at: string;
  updated_at: string;
}

export async function getMyTasks(crmUserId: string): Promise<{
  data: UserTask[] | null;
  error: string | null;
}> {
  try {
    const { data, error } = await supabase
      .from('user_tasks')
      .select('*')
      .eq('user_id', crmUserId)
      .order('is_pinned', { ascending: false })
      .order('is_done', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      if (error.message.includes('does not exist') || error.code === '42P01') {
        return { data: [], error: null };
      }
      return { data: null, error: error.message };
    }
    return { data: data as UserTask[], error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Failed to load tasks' };
  }
}

export async function createTask(crmUserId: string, title: string, dueDate?: string | null): Promise<{
  error: string | null;
}> {
  try {
    const { error } = await supabase
      .from('user_tasks')
      .insert({
        user_id: crmUserId,
        title,
        due_date: dueDate || null,
      });
    if (error) return { error: error.message };
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to create task' };
  }
}

export async function updateTask(taskId: string, updates: Partial<Pick<UserTask, 'title' | 'notes' | 'is_pinned' | 'is_done' | 'due_date'>>): Promise<{
  error: string | null;
}> {
  try {
    const { error } = await supabase
      .from('user_tasks')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', taskId);
    if (error) return { error: error.message };
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to update task' };
  }
}

export async function deleteTask(taskId: string): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.from('user_tasks').delete().eq('id', taskId);
    if (error) return { error: error.message };
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to delete task' };
  }
}
