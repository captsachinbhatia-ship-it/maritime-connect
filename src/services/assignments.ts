import { supabase } from '@/lib/supabaseClient';

export type AssignmentStage = 'COLD_CALLING' | 'ASPIRATION' | 'ACHIEVEMENT' | 'INACTIVE';

export interface ContactAssignment {
  id: string;
  contact_id: string;
  stage: AssignmentStage;
  status: string;
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
  assigned_to: string;
  stage: AssignmentStage;
  currentUserId: string;
}): Promise<{
  data: ContactAssignment | null;
  error: string | null;
}> {
  try {
    const { contact_id, assigned_to, stage, currentUserId } = params;

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

    // Insert new ACTIVE assignment
    const { data, error } = await supabase
      .from('contact_assignments')
      .insert({
        contact_id,
        assigned_to,
        stage,
        status: 'ACTIVE',
        assigned_by: currentUserId,
        assigned_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
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
  currentUserId: string;
}): Promise<{
  data: ContactAssignment | null;
  error: string | null;
}> {
  try {
    const { contact_id, stage, currentUserId } = params;

    // Get current ACTIVE assignment to preserve assigned_to
    const { data: currentAssignment, error: fetchError } = await supabase
      .from('contact_assignments')
      .select('assigned_to')
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

    // Insert new ACTIVE row with new stage
    const { data, error } = await supabase
      .from('contact_assignments')
      .insert({
        contact_id,
        assigned_to: currentAssignment.assigned_to,
        stage,
        status: 'ACTIVE',
        assigned_by: currentUserId,
        assigned_at: new Date().toISOString(),
        stage_changed_at: new Date().toISOString(),
        stage_changed_by: currentUserId,
      })
      .select()
      .single();

    if (error) {
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
