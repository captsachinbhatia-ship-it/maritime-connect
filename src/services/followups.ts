import { supabase } from '@/lib/supabaseClient';

export type FollowupType = 'CALL' | 'EMAIL' | 'MEETING' | 'WHATSAPP' | 'OTHER';
export type FollowupStatus = 'OPEN' | 'COMPLETED' | 'CANCELLED';

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

// Q2: List follow-ups for a contact
export async function getFollowupsByContact(contactId: string): Promise<{
  data: ContactFollowup[] | null;
  error: string | null;
}> {
  try {
    // Fetch all follow-ups for contact
    const { data, error } = await supabase
      .from('contact_followups')
      .select('*')
      .eq('contact_id', contactId);

    if (error) {
      // Check if table doesn't exist
      if (error.message.includes('does not exist') || error.code === '42P01') {
        return { data: [], error: null };
      }
      return { data: null, error: error.message };
    }

    // Sort: OPEN first (by due_at asc), then COMPLETED/CANCELLED (by completed_at desc)
    const sorted = (data || []).sort((a, b) => {
      // OPEN comes first
      if (a.status === 'OPEN' && b.status !== 'OPEN') return -1;
      if (a.status !== 'OPEN' && b.status === 'OPEN') return 1;
      
      // Both OPEN: sort by due_at asc
      if (a.status === 'OPEN' && b.status === 'OPEN') {
        return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
      }
      
      // Both non-OPEN: sort by completed_at desc (nulls last)
      const aCompleted = a.completed_at ? new Date(a.completed_at).getTime() : 0;
      const bCompleted = b.completed_at ? new Date(b.completed_at).getTime() : 0;
      return bCompleted - aCompleted;
    });

    return { data: sorted as ContactFollowup[], error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to load follow-ups',
    };
  }
}

// Q3: Create a new follow-up
export async function createFollowup(payload: CreateFollowupPayload): Promise<{
  data: ContactFollowup | null;
  error: string | null;
}> {
  try {
    // Verify authenticated session exists before insert
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !sessionData.session) {
      return { data: null, error: 'No authenticated session. Please log in again.' };
    }

    const { data, error } = await supabase
      .from('contact_followups')
      .insert({
        contact_id: payload.contact_id,
        assignment_id: payload.assignment_id,
        interaction_id: payload.interaction_id || null,
        followup_type: payload.followup_type,
        followup_reason: payload.followup_reason,
        notes: payload.notes || null,
        due_at: payload.due_at,
        status: 'OPEN',
      })
      .select()
      .single();

    if (error) {
      if (error.message.includes('row-level security')) {
        return { data: null, error: 'Permission blocked by RLS policy on contact_followups.' };
      }
      return { data: null, error: error.message };
    }

    return { data: data as ContactFollowup, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to create follow-up',
    };
  }
}

// Q4: Mark follow-up as completed
export async function markFollowupComplete(followupId: string): Promise<{
  error: string | null;
}> {
  try {
    const { error } = await supabase
      .from('contact_followups')
      .update({ status: 'COMPLETED' })
      .eq('id', followupId)
      .eq('status', 'OPEN');

    if (error) {
      if (error.message.includes('row-level security')) {
        return { error: 'Permission blocked by RLS policy on contact_followups.' };
      }
      return { error: error.message };
    }

    return { error: null };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Failed to complete follow-up',
    };
  }
}

// Q5: Cancel a follow-up
export async function cancelFollowup(followupId: string): Promise<{
  error: string | null;
}> {
  try {
    const { error } = await supabase
      .from('contact_followups')
      .update({ status: 'CANCELLED' })
      .eq('id', followupId)
      .eq('status', 'OPEN');

    if (error) {
      if (error.message.includes('row-level security')) {
        return { error: 'Permission blocked by RLS policy on contact_followups.' };
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

// Q6: Get next follow-up due date for multiple contacts (for Contacts list)
export async function getNextFollowupDueMap(contactIds: string[]): Promise<{
  data: Record<string, string | null> | null;
  error: string | null;
}> {
  try {
    if (contactIds.length === 0) {
      return { data: {}, error: null };
    }

    const { data, error } = await supabase
      .from('contact_followups')
      .select('contact_id, due_at')
      .in('contact_id', contactIds)
      .eq('status', 'OPEN')
      .order('due_at', { ascending: true });

    if (error) {
      // Table might not exist yet
      if (error.message.includes('does not exist') || error.code === '42P01') {
        return { data: {}, error: null };
      }
      return { data: null, error: error.message };
    }

    // Get min due_at per contact (first due_at for each contact since sorted asc)
    const dueMap: Record<string, string | null> = {};
    (data || []).forEach((row) => {
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

// Q7: Get my follow-ups due (for My Follow-ups page)
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

    // First, get follow-ups with filters
    let query = supabase
      .from('contact_followups')
      .select('*')
      .eq('status', 'OPEN');

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
    // 'all' has no date filter

    const { data: followups, error: followupsError } = await query.order('due_at', { ascending: true });

    if (followupsError) {
      if (followupsError.message.includes('does not exist') || followupsError.code === '42P01') {
        return { data: [], error: null };
      }
      return { data: null, error: followupsError.message };
    }

    if (!followups || followups.length === 0) {
      return { data: [], error: null };
    }

    // Get unique contact IDs
    const contactIds = [...new Set(followups.map((f) => f.contact_id))];

    // Fetch contacts with company names
    const { data: contacts, error: contactsError } = await supabase
      .from('contacts')
      .select('id, full_name, company_id')
      .in('id', contactIds);

    if (contactsError) {
      return { data: null, error: contactsError.message };
    }

    // Fetch company names
    const companyIds = (contacts || [])
      .map((c) => c.company_id)
      .filter((id): id is string => id !== null);

    let companyNames: Record<string, string> = {};
    if (companyIds.length > 0) {
      const { data: companies } = await supabase
        .from('companies')
        .select('id, company_name')
        .in('id', companyIds);

      (companies || []).forEach((c) => {
        companyNames[c.id] = c.company_name;
      });
    }

    // Build contact map
    const contactMap: Record<string, { full_name: string | null; company_name: string | null }> = {};
    (contacts || []).forEach((c) => {
      contactMap[c.id] = {
        full_name: c.full_name,
        company_name: c.company_id ? companyNames[c.company_id] || null : null,
      };
    });

    // Merge data
    const result: FollowupWithContact[] = followups.map((f) => ({
      ...f,
      contact_name: contactMap[f.contact_id]?.full_name || null,
      company_name: contactMap[f.contact_id]?.company_name || null,
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
