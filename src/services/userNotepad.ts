import { supabase } from '@/lib/supabaseClient';

export async function getNotepad(crmUserId: string): Promise<{
  data: string;
  reminderAt: string | null;
  error: string | null;
}> {
  try {
    const { data, error } = await supabase
      .from('user_notepad')
      .select('content, reminder_at')
      .eq('user_id', crmUserId)
      .maybeSingle();

    if (error) {
      if (error.message.includes('does not exist') || error.code === '42P01') {
        return { data: '', reminderAt: null, error: null };
      }
      return { data: '', reminderAt: null, error: error.message };
    }
    return { data: data?.content ?? '', reminderAt: (data as any)?.reminder_at ?? null, error: null };
  } catch (err) {
    return { data: '', reminderAt: null, error: err instanceof Error ? err.message : 'Failed to load notepad' };
  }
}

export async function saveNotepad(crmUserId: string, content: string, reminderAt: string | null = null): Promise<{
  error: string | null;
}> {
  try {
    const { error } = await supabase
      .from('user_notepad')
      .upsert(
        { user_id: crmUserId, content, reminder_at: reminderAt, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      );
    if (error) return { error: error.message };
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to save notepad' };
  }
}
