import { supabase } from '@/lib/supabaseClient';

export type InteractionType = 'CALL' | 'WHATSAPP' | 'EMAIL' | 'MEETING' | 'NOTE';

export interface ContactInteraction {
  id: string;
  contact_id: string;
  created_at: string;
  created_by: string | null;
  interaction_type: InteractionType;
  summary: string | null;
  next_action: string | null;
  next_action_date: string | null;
  meta: Record<string, unknown> | null;
  // Joined field
  creator_name?: string;
}

export async function getInteractionsByContact(contactId: string): Promise<{
  data: ContactInteraction[] | null;
  error: string | null;
  tableExists: boolean;
}> {
  try {
    const { data, error } = await supabase
      .from('contact_interactions')
      .select('*')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false });

    if (error) {
      // Check if table doesn't exist
      if (error.message.includes('does not exist') || error.code === '42P01') {
        return { data: [], error: null, tableExists: false };
      }
      return { data: null, error: error.message, tableExists: true };
    }

    return { data: data as ContactInteraction[], error: null, tableExists: true };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Unknown error occurred',
      tableExists: true
    };
  }
}

// Get user names for interaction creators
export async function getCreatorNames(userIds: string[]): Promise<{
  data: Record<string, string> | null;
  error: string | null;
}> {
  try {
    if (userIds.length === 0) {
      return { data: {}, error: null };
    }

    const uniqueIds = [...new Set(userIds)];

    // Try profiles table first for display names
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', uniqueIds);

    if (error) {
      return { data: null, error: error.message };
    }

    const nameMap: Record<string, string> = {};
    data?.forEach(profile => {
      nameMap[profile.id] = profile.full_name || profile.id.slice(0, 8);
    });

    return { data: nameMap, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Unknown error occurred'
    };
  }
}
