import { supabase } from '@/lib/supabaseClient';

export type FollowupType = 'CALL' | 'EMAIL' | 'MEETING' | 'WHATSAPP' | 'OTHER';
export type FollowupStatus = 'OPEN' | 'COMPLETED' | 'CANCELLED';

export type RecurrenceFrequency = 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

export interface ContactFollowup {
  id: string;
  contact_id: string;
  assignment_id: string | null;
  interaction_id: string | null;
  followup_type: FollowupType;
  followup_reason: string;
  notes: string | null;
  due_at: string;
  status: FollowupStatus;
  completed_at: string | null;
  created_at: string;
  created_by: string | null;
  recurrence_enabled: boolean | null;
  recurrence_frequency: RecurrenceFrequency | null;
  recurrence_interval: number | null;
  recurrence_end_date: string | null;
  recurrence_count: number | null;
}

export interface FollowupWithContact extends ContactFollowup {
  contact_name: string | null;
  company_name: string | null;
}

export interface CreateFollowupPayload {
  contact_id: string;
  assignment_id: string;
  interaction_id?: string | null;
  followup_type: FollowupType;
  followup_reason: string;
  notes?: string | null;
  due_at: string;
  recurrence_enabled?: boolean;
  recurrence_frequency?: RecurrenceFrequency | null;
  recurrence_interval?: number | null;
  recurrence_end_date?: string | null;
}

// Q1: Get active assignment for a contact
export async function getActiveAssignmentForContact(contactId: string): Promise<{
  data: { id: string } | null;
  error: string | null;
}> {
  try {
    const { data, error } = await supabase
      .from('contact_assignments')
      .select('id')
      .eq('contact_id', contactId)
      .eq('status', 'ACTIVE')
      .order('assigned_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to get active assignment',
    };
  }
}

// Q2: List follow-ups for a contact — reads from v_followup_queue_all_v2
export async function getFollowupsByContact(contactId: string): Promise<{
  data: ContactFollowup[] | null;
  error: string | null;
}> {
  try {
    const { data, error } = await supabase
      .from('v_followup_queue_all_v2')
      .select('*')
      .eq('contact_id', contactId)
      .order('due_at', { ascending: true });

    if (error) {
      if (error.message.includes('does not exist') || error.code === '42P01') {
        return { data: [], error: null };
      }
      return { data: null, error: error.message };
    }

    // Map V2 view columns to ContactFollowup shape
    const mapped: ContactFollowup[] = (data || []).map((row: any) => ({
      id: row.id,
      contact_id: row.contact_id,
      assignment_id: null,
      interaction_id: null,
      followup_type: row.interaction_type || 'OTHER',
      followup_reason: row.notes || '',
      notes: row.notes || null,
      due_at: row.due_at || row.next_follow_up_at,
      status: 'OPEN' as FollowupStatus,
      completed_at: null,
      created_at: row.created_at || row.interaction_at || '',
      created_by: row.user_id || null,
      recurrence_enabled: null,
      recurrence_frequency: null,
      recurrence_interval: null,
      recurrence_end_date: null,
      recurrence_count: null,
    }));

    return { data: mapped, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to load follow-ups',
    };
  }
}

// Q3: Create a new follow-up — writes to contact_interactions with next_follow_up_at
export async function createFollowup(payload: CreateFollowupPayload): Promise<{
  data: ContactFollowup | null;
  error: string | null;
}> {
  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !sessionData.session) {
      return { data: null, error: 'No authenticated session. Please log in again.' };
    }

    // Resolve crmUserId from session
    const { data: crmUser } = await supabase
      .from('crm_users')
      .select('id')
      .eq('auth_uid', sessionData.session.user.id)
      .maybeSingle();

    const { data, error } = await supabase
      .from('contact_interactions')
      .insert({
        contact_id: payload.contact_id,
        user_id: crmUser?.id || null,
        interaction_type: payload.followup_type || 'NOTE',
        direction: 'OUTBOUND',
        interaction_at: new Date().toISOString(),
        outcome: null,
        notes: payload.followup_reason + (payload.notes ? `\n${payload.notes}` : ''),
        next_follow_up_at: payload.due_at,
        meta: { source: 'app', followup: true },
      })
      .select()
      .single();

    if (error) {
      if (error.message.includes('row-level security')) {
        return { data: null, error: 'Permission blocked by RLS policy.' };
      }
      return { data: null, error: error.message };
    }

    // Map to ContactFollowup shape for backward compatibility
    const mapped: ContactFollowup = {
      id: data.id,
      contact_id: data.contact_id,
      assignment_id: null,
      interaction_id: null,
      followup_type: data.interaction_type || 'OTHER',
      followup_reason: payload.followup_reason,
      notes: data.notes,
      due_at: data.next_follow_up_at || payload.due_at,
      status: 'OPEN',
      completed_at: null,
      created_at: data.created_at || data.interaction_at,
      created_by: data.user_id,
      recurrence_enabled: null,
      recurrence_frequency: null,
      recurrence_interval: null,
      recurrence_end_date: null,
      recurrence_count: null,
    };

    return { data: mapped, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to create follow-up',
    };
  }
}

// Q4: Mark follow-up as completed — clears next_follow_up_at on the contact_interactions row
export async function markFollowupComplete(followupId: string): Promise<{
  error: string | null;
  nextFollowupCreated?: boolean;
}> {
  try {
    const { error } = await supabase
      .from('contact_interactions')
      .update({ next_follow_up_at: null })
      .eq('id', followupId);

    if (error) {
      if (error.message.includes('row-level security')) {
        return { error: 'Permission blocked by RLS policy.' };
      }
      return { error: error.message };
    }

    return { error: null, nextFollowupCreated: false };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Failed to complete follow-up',
    };
  }
}

// Q5: Cancel a follow-up — clears next_follow_up_at
export async function cancelFollowup(followupId: string): Promise<{
  error: string | null;
}> {
  try {
    const { error } = await supabase
      .from('contact_interactions')
      .update({ next_follow_up_at: null })
      .eq('id', followupId);

    if (error) {
      if (error.message.includes('row-level security')) {
        return { error: 'Permission blocked by RLS policy.' };
      }
      return { error: error.message };
    }

    return { error: null };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Failed to cancel follow-up',
    };
  }
}

// Q6: Get next follow-up due date for multiple contacts
export async function getNextFollowupDueMap(contactIds: string[]): Promise<{
  data: Record<string, string | null> | null;
  error: string | null;
}> {
  try {
    if (contactIds.length === 0) {
      return { data: {}, error: null };
    }

    const { data, error } = await supabase
      .from('v_followup_queue_all_v2')
      .select('contact_id, due_at')
      .in('contact_id', contactIds)
      .order('due_at', { ascending: true });

    if (error) {
      if (error.message.includes('does not exist') || error.code === '42P01') {
        return { data: {}, error: null };
      }
      return { data: null, error: error.message };
    }

    const dueMap: Record<string, string | null> = {};
    (data || []).forEach((row: any) => {
      if (!dueMap[row.contact_id]) {
        dueMap[row.contact_id] = row.due_at;
      }
    });

    return { data: dueMap, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to load follow-up due dates',
    };
  }
}

// Q7: Get my follow-ups due
export type FollowupDueFilter = 'overdue' | 'today' | 'next7days' | 'all';

export async function getMyFollowupsDue(filter: FollowupDueFilter): Promise<{
  data: FollowupWithContact[] | null;
  error: string | null;
}> {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000 - 1);
    const tomorrow = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);
    const next7Days = new Date(startOfToday.getTime() + 8 * 24 * 60 * 60 * 1000);

    let query = supabase
      .from('v_followup_queue_all_v2')
      .select('*');

    if (filter === 'overdue') {
      query = query.lt('due_at', startOfToday.toISOString());
    } else if (filter === 'today') {
      query = query
        .gte('due_at', startOfToday.toISOString())
        .lte('due_at', endOfToday.toISOString());
    } else if (filter === 'next7days') {
      query = query
        .gte('due_at', tomorrow.toISOString())
        .lt('due_at', next7Days.toISOString());
    }

    const { data, error } = await query.order('due_at', { ascending: true });

    if (error) {
      if (error.message.includes('does not exist') || error.code === '42P01') {
        return { data: [], error: null };
      }
      return { data: null, error: error.message };
    }

    // Map V2 view to FollowupWithContact shape
    const result: FollowupWithContact[] = (data || []).map((row: any) => ({
      id: row.id,
      contact_id: row.contact_id,
      assignment_id: null,
      interaction_id: null,
      followup_type: row.interaction_type || 'OTHER',
      followup_reason: row.notes || '',
      notes: row.notes || null,
      due_at: row.due_at || row.next_follow_up_at,
      status: 'OPEN' as FollowupStatus,
      completed_at: null,
      created_at: row.created_at || row.interaction_at || '',
      created_by: row.user_id || null,
      recurrence_enabled: null,
      recurrence_frequency: null,
      recurrence_interval: null,
      recurrence_end_date: null,
      recurrence_count: null,
      contact_name: row.contact_name || null,
      company_name: row.company_name || null,
    }));

    return { data: result, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to load follow-ups',
    };
  }
}

// Helper: Derive follow-up status label from due date
export function getFollowupStatusLabel(dueAt: string | null): 'OVERDUE' | 'DUE_TODAY' | 'UPCOMING' | null {
  if (!dueAt) return null;

  const now = new Date();
  const dueDate = new Date(dueAt);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000 - 1);

  if (dueDate < startOfToday) {
    return 'OVERDUE';
  } else if (dueDate >= startOfToday && dueDate <= endOfToday) {
    return 'DUE_TODAY';
  } else {
    return 'UPCOMING';
  }
}
