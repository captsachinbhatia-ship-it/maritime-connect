import { supabase } from '@/lib/supabaseClient';

export interface UserNote {
  id: string;
  crm_user_id: string;
  content: string;
  is_completed: boolean;
  reminder_at: string | null;
  created_at: string;
  updated_at: string;
}

export async function listNotes(crmUserId: string): Promise<{
  data: UserNote[] | null;
  error: string | null;
}> {
  const { data, error } = await supabase
    .from('user_notes')
    .select('*')
    .eq('crm_user_id', crmUserId)
    .order('is_completed', { ascending: true })
    .order('reminder_at', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (error) return { data: null, error: error.message };
  return { data: data as UserNote[], error: null };
}

export async function createNote(
  crmUserId: string,
  content: string,
  reminderAt: string | null = null
): Promise<{ data: UserNote | null; error: string | null }> {
  const { data, error } = await supabase
    .from('user_notes')
    .insert({ crm_user_id: crmUserId, content, reminder_at: reminderAt })
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as UserNote, error: null };
}

export async function updateNote(
  id: string,
  fields: Partial<Pick<UserNote, 'content' | 'is_completed' | 'reminder_at'>>
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('user_notes')
    .update(fields)
    .eq('id', id);

  if (error) return { error: error.message };
  return { error: null };
}

export async function deleteNote(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('user_notes')
    .delete()
    .eq('id', id);

  if (error) return { error: error.message };
  return { error: null };
}
