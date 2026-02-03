import { supabase } from '@/lib/supabaseClient';
import { getCurrentCrmUserId } from './profiles';

export type AssignmentStage = 'COLD_CALLING' | 'ASPIRATION' | 'ACHIEVEMENT' | 'INACTIVE';

export interface ContactAssignment {
  id: string;
  contact_id: string;
  stage: AssignmentStage;
  status: string;
  // New CRM user columns
  assigned_to_crm_user_id: string | null;
  assigned_by_crm_user_id: string | null;
  stage_changed_by_crm_user_id: string | null;
  // Legacy columns (read-only, may still exist)
  assigned_to: string | null;
  assigned_by: string | null;
  assigned_at: string | null;
  stage_changed_at: string | null;
  stage_changed_by: string | null;
  notes: string | null;
}

export async function getAssignmentsForContacts(contactIds: string[]): Promise<{
  data: Record<string, ContactAssignment> | null;
  error: string | null;
}> {
  try {
    if (contactIds.length === 0) {
      return { data: {}, error: null };
    }

    const { data, error } = await supabase
      .from('contact_assignments')
      .select('*')
      .in('contact_id', contactIds)
      .eq('status', 'ACTIVE');

    if (error) {
      return { data: null, error: error.message };
    }

    // Map by contact_id for quick lookup
    const assignmentMap: Record<string, ContactAssignment> = {};
    data?.forEach(assignment => {
      assignmentMap[assignment.contact_id] = assignment as ContactAssignment;
    });

    return { data: assignmentMap, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Unknown error occurred'
    };
  }
}

export async function upsertAssignment(params: {
  contact_id: string;
  assigned_to_crm_user_id: string;
  stage: AssignmentStage;
  notes?: string | null;
}): Promise<{
  data: ContactAssignment | null;
  error: string | null;
}> {
  try {
    const { contact_id, assigned_to_crm_user_id, stage, notes } = params;

    // Get current CRM user ID for assigner
    const { data: currentCrmUserId, error: crmError } = await getCurrentCrmUserId();
    if (crmError || !currentCrmUserId) {
      return { data: null, error: crmError || 'Could not resolve current CRM user' };
    }

    // Close all existing ACTIVE rows for this contact
    const { error: closeError } = await supabase
      .from('contact_assignments')
      .update({ status: 'CLOSED' })
      .eq('contact_id', contact_id)
      .eq('status', 'ACTIVE');

    if (closeError) {
      if (closeError.message.includes('row-level security')) {
        return { data: null, error: 'Permission blocked by RLS policy on contact_assignments.' };
      }
      return { data: null, error: closeError.message };
    }

    const now = new Date().toISOString();

    // Build insert payload with NEW CRM columns only
    const insertPayload = {
      contact_id,
      assigned_to_crm_user_id,
      assigned_by_crm_user_id: currentCrmUserId,
      stage,
      status: 'ACTIVE',
      assigned_at: now,
      stage_changed_at: now,
      stage_changed_by_crm_user_id: currentCrmUserId,
      notes: notes || null,
    };

    console.log('[upsertAssignment] Insert payload:', insertPayload);

    // Insert new ACTIVE assignment
    const { data, error } = await supabase
      .from('contact_assignments')
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      console.error('[upsertAssignment] Insert error:', error);
      if (error.message.includes('row-level security')) {
        return { data: null, error: 'Permission blocked by RLS policy on contact_assignments.' };
      }
      return { data: null, error: error.message };
    }

    return { data: data as ContactAssignment, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Unknown error occurred'
    };
  }
}

export async function updateStage(params: {
  contact_id: string;
  stage: AssignmentStage;
}): Promise<{
  data: ContactAssignment | null;
  error: string | null;
}> {
  try {
    const { contact_id, stage } = params;

    // Get current CRM user ID
    const { data: currentCrmUserId, error: crmError } = await getCurrentCrmUserId();
    if (crmError || !currentCrmUserId) {
      return { data: null, error: crmError || 'Could not resolve current CRM user' };
    }

    // Get current ACTIVE assignment to preserve assigned_to_crm_user_id
    const { data: currentAssignment, error: fetchError } = await supabase
      .from('contact_assignments')
      .select('assigned_to_crm_user_id')
      .eq('contact_id', contact_id)
      .eq('status', 'ACTIVE')
      .maybeSingle();

    if (fetchError) {
      return { data: null, error: fetchError.message };
    }

    if (!currentAssignment) {
      return { data: null, error: 'No active assignment found for this contact.' };
    }

    // Close existing ACTIVE rows
    const { error: closeError } = await supabase
      .from('contact_assignments')
      .update({ status: 'CLOSED' })
      .eq('contact_id', contact_id)
      .eq('status', 'ACTIVE');

    if (closeError) {
      if (closeError.message.includes('row-level security')) {
        return { data: null, error: 'Permission blocked by RLS policy on contact_assignments.' };
      }
      return { data: null, error: closeError.message };
    }

    const now = new Date().toISOString();

    // Insert new ACTIVE row with new stage using NEW CRM columns
    const insertPayload = {
      contact_id,
      assigned_to_crm_user_id: currentAssignment.assigned_to_crm_user_id,
      assigned_by_crm_user_id: currentCrmUserId,
      stage,
      status: 'ACTIVE',
      assigned_at: now,
      stage_changed_at: now,
      stage_changed_by_crm_user_id: currentCrmUserId,
    };

    console.log('[updateStage] Insert payload:', insertPayload);

    const { data, error } = await supabase
      .from('contact_assignments')
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      console.error('[updateStage] Insert error:', error);
      if (error.message.includes('row-level security')) {
        return { data: null, error: 'Permission blocked by RLS policy on contact_assignments.' };
      }
      return { data: null, error: error.message };
    }

    return { data: data as ContactAssignment, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Unknown error occurred'
    };
  }
}

// Get all assignments for a single contact (for drawer)
export async function getAssignmentsByContact(contactId: string): Promise<{
  data: ContactAssignment[] | null;
  error: string | null;
}> {
  try {
    const { data, error } = await supabase
      .from('contact_assignments')
      .select('*')
      .eq('contact_id', contactId)
      .order('assigned_at', { ascending: false });

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as ContactAssignment[], error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Unknown error occurred'
    };
  }
}
