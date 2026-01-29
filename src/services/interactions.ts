import { supabase } from '@/lib/supabaseClient';

export type InteractionType = 'CALL' | 'WHATSAPP' | 'EMAIL' | 'MEETING' | 'NOTE';

export interface ContactInteraction {
  id: string;
  contact_id: string;
  interaction_at: string;
  interaction_type: InteractionType;
  summary: string | null;
  next_action: string | null;
  next_action_date: string | null;
  creator_name: string | null;
}

export async function getInteractionsByContact(contactId: string): Promise<{
  data: ContactInteraction[] | null;
  error: string | null;
  tableExists: boolean;
}> {
  try {
    const { data, error } = await supabase
      .from('v_contact_interactions_timeline')
      .select('*')
      .eq('contact_id', contactId)
      .order('interaction_at', { ascending: false });

    if (error) {
      // Check if view doesn't exist
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

// Get user names from crm_users table
// Fallback: crm_users.full_name → "Unknown User"
export async function getUserNames(userIds: string[]): Promise<{
  data: Record<string, string> | null;
  error: string | null;
}> {
  try {
    if (userIds.length === 0) {
      return { data: {}, error: null };
    }

    const uniqueIds = [...new Set(userIds)];

    // Fetch from crm_users table
    const { data, error } = await supabase
      .from('crm_users')
      .select('id, full_name')
      .in('id', uniqueIds);

    if (error) {
      return { data: null, error: error.message };
    }

    const nameMap: Record<string, string> = {};
    
    // Map all found users
    data?.forEach(user => {
      nameMap[user.id] = user.full_name || 'Unknown User';
    });

    // For any ID not found in crm_users, set "Unknown User"
    uniqueIds.forEach(id => {
      if (!nameMap[id]) {
        nameMap[id] = 'Unknown User';
      }
    });

    return { data: nameMap, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Unknown error occurred'
    };
  }
}

// Alias for backward compatibility
export const getCreatorNames = getUserNames;
