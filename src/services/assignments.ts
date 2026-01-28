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

    // First check if assignment exists
    const { data: existing, error: checkError } = await supabase
      .from('contact_assignments')
      .select('id')
      .eq('contact_id', contact_id)
      .eq('status', 'ACTIVE')
      .maybeSingle();

    if (checkError) {
      return { data: null, error: checkError.message };
    }

    if (existing) {
      // Update existing assignment - don't use updated_at as it doesn't exist
      const { data, error } = await supabase
        .from('contact_assignments')
        .update({
          assigned_to,
          stage,
          assigned_by: currentUserId,
          assigned_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        if (error.message.includes('row-level security')) {
          return { data: null, error: 'Permission blocked by RLS policy on contact_assignments.' };
        }
        return { data: null, error: error.message };
      }

      return { data: data as ContactAssignment, error: null };
    } else {
      // Insert new assignment
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
    }
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

    // Note: contact_assignments table doesn't have updated_at column
    // Use stage_changed_at and stage_changed_by instead
    const { data, error } = await supabase
      .from('contact_assignments')
      .update({
        stage,
        stage_changed_at: new Date().toISOString(),
        stage_changed_by: currentUserId,
      })
      .eq('contact_id', contact_id)
      .eq('status', 'ACTIVE')
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
