import { supabase } from '@/lib/supabaseClient';

export interface StageRequest {
  id: string;
  contact_id: string;
  requested_stage: string;
  requested_by_crm_user_id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  decision_by_crm_user_id: string | null;
  decision_note: string | null;
  decided_at: string | null;
  requested_at: string;
  note: string | null;
}

export interface StageRequestWithDetails extends StageRequest {
  contact_name: string | null;
  current_stage: string | null;
  requester_name: string | null;
}

export interface StageEvent {
  id: string;
  contact_id: string;
  from_stage: string | null;
  to_stage: string;
  changed_by_crm_user_id: string;
  occurred_at: string;
  note: string | null;
  actor_name?: string;
}

/**
 * Create a new stage move request
 */
export async function createStageRequest(
  contactId: string,
  requestedStage: string,
  requestedByCrmUserId: string,
  note?: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('contact_stage_requests')
    .insert({
      contact_id: contactId,
      requested_stage: requestedStage,
      requested_by_crm_user_id: requestedByCrmUserId,
      note: note || null,
      status: 'PENDING',
    });

  if (error) {
    console.error('Error creating stage request:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Get pending stage requests for a contact
 */
export async function getStageRequestsByContact(
  contactId: string
): Promise<{ data: StageRequest[] | null; error?: string }> {
  const { data, error } = await supabase
    .from('contact_stage_requests')
    .select('*')
    .eq('contact_id', contactId)
    .order('requested_at', { ascending: false });

  if (error) {
    console.error('Error fetching stage requests:', error);
    return { data: null, error: error.message };
  }

  return { data };
}

/**
 * Get all pending stage requests (for admin dashboard)
 */
export async function getPendingStageRequests(): Promise<{ 
  data: StageRequestWithDetails[] | null; 
  error?: string 
}> {
  // Fetch pending requests
  const { data: requests, error: requestsError } = await supabase
    .from('contact_stage_requests')
    .select('*')
    .eq('status', 'PENDING')
    .order('requested_at', { ascending: false });

  if (requestsError) {
    console.error('Error fetching pending requests:', requestsError);
    return { data: null, error: requestsError.message };
  }

  if (!requests || requests.length === 0) {
    return { data: [] };
  }

  // Get unique contact IDs and requester IDs
  const contactIds = [...new Set(requests.map(r => r.contact_id))];
  const requesterIds = [...new Set(requests.map(r => r.requested_by_crm_user_id))];

  // Fetch contact names and current stages in parallel
  const [contactsResult, usersResult, assignmentsResult] = await Promise.all([
    supabase
      .from('contacts')
      .select('id, full_name')
      .in('id', contactIds),
    supabase
      .from('crm_users')
      .select('id, full_name')
      .in('id', requesterIds),
    supabase
      .from('contact_assignments')
      .select('contact_id, stage')
      .in('contact_id', contactIds)
      .eq('status', 'ACTIVE')
      .eq('assignment_role', 'primary'),
  ]);

  const contactMap: Record<string, string> = {};
  const userMap: Record<string, string> = {};
  const stageMap: Record<string, string> = {};

  if (contactsResult.data) {
    contactsResult.data.forEach(c => {
      contactMap[c.id] = c.full_name || 'Unknown Contact';
    });
  }

  if (usersResult.data) {
    usersResult.data.forEach(u => {
      userMap[u.id] = u.full_name || 'System / Admin';
    });
  }

  if (assignmentsResult.data) {
    assignmentsResult.data.forEach(a => {
      stageMap[a.contact_id] = a.stage;
    });
  }

  const enrichedRequests: StageRequestWithDetails[] = requests.map(r => ({
    ...r,
    contact_name: contactMap[r.contact_id] || 'Unknown Contact',
    current_stage: stageMap[r.contact_id] || 'Unknown',
    requester_name: userMap[r.requested_by_crm_user_id] || 'System / Admin',
  }));

  return { data: enrichedRequests };
}

/**
 * Decide on a stage request (approve or reject)
 */
export async function decideStageRequest(
  requestId: string,
  decision: 'APPROVED' | 'REJECTED',
  note?: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.rpc('decide_stage_request', {
    p_request_id: requestId,
    p_decision: decision,
    p_note: note || null,
  });

  if (error) {
    console.error('Error deciding stage request:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Get stage events (history) for a contact
 */
export async function getStageEventsByContact(
  contactId: string
): Promise<{ data: StageEvent[] | null; error?: string }> {
  const { data: events, error } = await supabase
    .from('contact_stage_events')
    .select('*')
    .eq('contact_id', contactId)
    .order('occurred_at', { ascending: false });

  if (error) {
    console.error('Error fetching stage events:', error);
    return { data: null, error: error.message };
  }

  if (!events || events.length === 0) {
    return { data: [] };
  }

  // Get actor names
  const actorIds = [...new Set(events.map(e => e.changed_by_crm_user_id).filter(Boolean))];
  
  if (actorIds.length > 0) {
    const { data: users } = await supabase
      .from('crm_users')
      .select('id, full_name')
      .in('id', actorIds);

    const userMap: Record<string, string> = {};
    if (users) {
      users.forEach(u => {
        userMap[u.id] = u.full_name || 'System / Admin';
      });
    }

    return {
      data: events.map(e => ({
        ...e,
        actor_name: e.changed_by_crm_user_id ? userMap[e.changed_by_crm_user_id] || 'System / Admin' : 'System',
      })),
    };
  }

  return { data: events };
}
