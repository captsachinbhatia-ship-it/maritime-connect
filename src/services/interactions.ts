import { supabase } from '@/lib/supabaseClient';
import { ALLOWED_INTERACTION_TYPES } from '@/lib/interactionConstants';

export type InteractionType = 'COLD_CALL' | 'CALL' | 'EMAIL_SENT' | 'WHATSAPP_SENT' | 'WHATSAPP_REPLY' | 'MEETING' | 'NOTE';

export interface ContactInteraction {
  id: string;
  contact_id: string;
  interaction_at: string;
  interaction_type: InteractionType;
  outcome: string | null;
  summary: string | null;
  subject: string | null;
  notes: string | null;
  next_action: string | null;
  next_action_date: string | null;
  creator_full_name: string | null;
  creator_email: string | null;
}

export interface InteractionFilters {
  type?: string;
  outcome?: string;
  dateRange?: string;
  search?: string;
}

export async function getInteractionsByContact(
  contactId: string,
  filters?: InteractionFilters
): Promise<{
  data: ContactInteraction[] | null;
  error: string | null;
  tableExists: boolean;
}> {
  try {
    let query = supabase
      .from('v_interaction_timeline_v2')
      .select('*')
      .eq('contact_id', contactId);

    // Apply type filter
    if (filters?.type && filters.type !== 'all') {
      query = query.eq('interaction_type', filters.type);
    }

    // Apply outcome filter
    if (filters?.outcome && filters.outcome !== 'all') {
      query = query.eq('outcome', filters.outcome);
    }

    // Apply date range filter
    if (filters?.dateRange && filters.dateRange !== 'all') {
      const days = parseInt(filters.dateRange, 10);
      if (!isNaN(days)) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        query = query.gte('interaction_at', cutoffDate.toISOString());
      }
    }

    // Apply search filter (ilike on subject and notes)
    if (filters?.search && filters.search.trim()) {
      const searchTerm = `%${filters.search.trim()}%`;
      query = query.or(`subject.ilike.${searchTerm},notes.ilike.${searchTerm}`);
    }

    // Always order by interaction_at desc
    const { data, error } = await query.order('interaction_at', { ascending: false });

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
// Fallback: crm_users.full_name → "System / Admin"
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
      nameMap[user.id] = user.full_name || 'System / Admin';
    });

    // For any ID not found in crm_users, set "System / Admin"
    uniqueIds.forEach(id => {
      if (!nameMap[id]) {
        nameMap[id] = 'System / Admin';
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

export interface CreateInteractionPayload {
  contact_id: string;
  user_id: string; // crm_users.id — NOT auth.uid()
  interaction_type: InteractionType;
  direction?: 'INBOUND' | 'OUTBOUND' | null;
  outcome: string | null;
  subject: string | null;
  notes: string;
  interaction_at: string;
  next_follow_up_at?: string | null;
}

export async function createInteraction(payload: CreateInteractionPayload): Promise<{
  error: string | null;
}> {
  try {
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return { error: 'No authenticated session. Please log in again.' };
    }

    if (!payload.user_id) {
      return { error: 'crmUserId missing — interaction cannot be inserted without a valid CRM user ID.' };
    }

    // Last-guard: reject invalid interaction_type before hitting DB
    if (!ALLOWED_INTERACTION_TYPES.has(payload.interaction_type)) {
      return { error: `Invalid interaction type: "${payload.interaction_type}". Allowed: ${[...ALLOWED_INTERACTION_TYPES].join(', ')}` };
    }

    const insertRow: Record<string, unknown> = {
      contact_id: payload.contact_id,
      user_id: payload.user_id,
      interaction_type: payload.interaction_type,
      direction: payload.direction ?? 'OUT',
      outcome: payload.outcome,
      notes: payload.notes ?? null,
      interaction_at: payload.interaction_at,
      meta: { source: 'app', subject: payload.subject },
    };

    if (payload.next_follow_up_at) {
      insertRow.next_follow_up_at = payload.next_follow_up_at;
    }

    const { error } = await supabase
      .from('contact_interactions')
      .insert(insertRow);

    if (error) {
      return { error: error.message };
    }

    return { error: null };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Failed to create interaction',
    };
  }
}

// Alias for backward compatibility
export const getCreatorNames = getUserNames;
