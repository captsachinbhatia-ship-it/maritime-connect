import { supabase } from '@/lib/supabaseClient';
import { getCurrentCrmUserId } from './profiles';

export type AssignmentStage = 'COLD_CALLING' | 'ASPIRATION' | 'ACHIEVEMENT' | 'INACTIVE';
export type AssignmentRole = 'PRIMARY' | 'SECONDARY';

export interface ContactAssignment {
  id: string;
  contact_id: string;
  stage: AssignmentStage;
  status: string;
  assignment_role: AssignmentRole | null;
  // CRM user columns (primary)
  assigned_to_crm_user_id: string | null;
  assigned_by_crm_user_id: string | null;
  stage_changed_by_crm_user_id: string | null;
  // Timestamps
  assigned_at: string | null;
  stage_changed_at: string | null;
  notes: string | null;
}

export interface ContactOwners {
  primary: ContactAssignment | null;
  secondary: ContactAssignment | null;
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

    // Map by contact_id for quick lookup (prefer PRIMARY)
    const assignmentMap: Record<string, ContactAssignment> = {};
    data?.forEach(assignment => {
      const existing = assignmentMap[assignment.contact_id];
      // If no existing or current is PRIMARY, use it
      if (!existing || assignment.assignment_role === 'PRIMARY') {
        assignmentMap[assignment.contact_id] = assignment as ContactAssignment;
      }
    });

    return { data: assignmentMap, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Unknown error occurred'
    };
  }
}

// Get Primary and Secondary owners for a contact
export async function getContactOwners(contactId: string): Promise<{
  data: ContactOwners | null;
  error: string | null;
}> {
  try {
    const { data, error } = await supabase
      .from('contact_assignments')
      .select('*')
      .eq('contact_id', contactId)
      .eq('status', 'ACTIVE')
      .in('assignment_role', ['PRIMARY', 'SECONDARY']);

    if (error) {
      return { data: null, error: error.message };
    }

    const owners: ContactOwners = {
      primary: null,
      secondary: null,
    };

    data?.forEach(assignment => {
      if (assignment.assignment_role === 'PRIMARY') {
        owners.primary = assignment as ContactAssignment;
      } else if (assignment.assignment_role === 'SECONDARY') {
        owners.secondary = assignment as ContactAssignment;
      }
    });

    return { data: owners, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Unknown error occurred'
    };
  }
}

// Get owners for multiple contacts (for list view)
export async function getOwnersForContacts(contactIds: string[]): Promise<{
  data: Record<string, ContactOwners> | null;
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
      .eq('status', 'ACTIVE')
      .in('assignment_role', ['PRIMARY', 'SECONDARY']);

    if (error) {
      return { data: null, error: error.message };
    }

    const ownersMap: Record<string, ContactOwners> = {};

    // Initialize all contact IDs
    contactIds.forEach(id => {
      ownersMap[id] = { primary: null, secondary: null };
    });

    data?.forEach(assignment => {
      const contactId = assignment.contact_id;
      if (!ownersMap[contactId]) {
        ownersMap[contactId] = { primary: null, secondary: null };
      }
      if (assignment.assignment_role === 'PRIMARY') {
        ownersMap[contactId].primary = assignment as ContactAssignment;
      } else if (assignment.assignment_role === 'SECONDARY') {
        ownersMap[contactId].secondary = assignment as ContactAssignment;
      }
    });

    return { data: ownersMap, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Unknown error occurred'
    };
  }
}

// Upsert owners (Primary and optional Secondary)
// Uses close-then-insert pattern to preserve history and respect unique constraints
export async function upsertOwners(params: {
  contact_id: string;
  primary_owner_id: string;
  secondary_owner_id: string | null;
  stage?: AssignmentStage;
}): Promise<{
  data: { primary: ContactAssignment; secondary: ContactAssignment | null } | null;
  error: string | null;
}> {
  try {
    const { contact_id, primary_owner_id, secondary_owner_id, stage } = params;

    // Validate same user not assigned to both roles
    if (secondary_owner_id && primary_owner_id === secondary_owner_id) {
      return { data: null, error: 'Primary and Secondary owner cannot be the same user.' };
    }

    // Get current CRM user ID for assigner
    const { data: currentCrmUserId, error: crmError } = await getCurrentCrmUserId();
    if (crmError || !currentCrmUserId) {
      return { data: null, error: crmError || 'Could not resolve current CRM user' };
    }

    // Get current ACTIVE PRIMARY to preserve stage if not provided
    const { data: existingPrimary } = await supabase
      .from('contact_assignments')
      .select('id, stage, assigned_to_crm_user_id')
      .eq('contact_id', contact_id)
      .eq('status', 'ACTIVE')
      .eq('assignment_role', 'PRIMARY')
      .maybeSingle();

    // Get current ACTIVE SECONDARY
    const { data: existingSecondary } = await supabase
      .from('contact_assignments')
      .select('id, assigned_to_crm_user_id')
      .eq('contact_id', contact_id)
      .eq('status', 'ACTIVE')
      .eq('assignment_role', 'SECONDARY')
      .maybeSingle();

    // Preserve stage: use provided stage, or existing primary's stage, or fallback to ASPIRATION
    const finalStage = stage || (existingPrimary?.stage as AssignmentStage) || 'ASPIRATION';
    const now = new Date().toISOString();

    console.log('[upsertOwners] Contact:', contact_id);
    console.log('[upsertOwners] Existing PRIMARY:', existingPrimary?.id);
    console.log('[upsertOwners] Existing SECONDARY:', existingSecondary?.id);
    console.log('[upsertOwners] Final stage:', finalStage);

    // ========== STEP 1: CLOSE ALL EXISTING ACTIVE ASSIGNMENTS ==========
    // Use a single bulk update to close ALL ACTIVE assignments for this contact
    // This prevents race conditions and ensures unique constraint is satisfied
    const { data: closedRows, error: closeAllError } = await supabase
      .from('contact_assignments')
      .update({ status: 'CLOSED' })
      .eq('contact_id', contact_id)
      .eq('status', 'ACTIVE')
      .select('id');

    if (closeAllError) {
      console.error('[upsertOwners] Failed to close existing assignments:', closeAllError);
      if (closeAllError.message.includes('row-level security')) {
        return { data: null, error: 'Permission blocked by RLS policy on contact_assignments.' };
      }
      return { data: null, error: closeAllError.message };
    }

    console.log('[upsertOwners] Closed assignments:', closedRows?.length || 0);

    // ========== STEP 2: INSERT NEW PRIMARY ==========
    const primaryPayload = {
      contact_id,
      assigned_to_crm_user_id: primary_owner_id,
      assigned_by_crm_user_id: currentCrmUserId,
      assignment_role: 'PRIMARY' as const,
      stage: finalStage,
      status: 'ACTIVE' as const,
      assigned_at: now,
      stage_changed_at: now,
      stage_changed_by_crm_user_id: currentCrmUserId,
    };

    console.log('[upsertOwners] Inserting PRIMARY:', primaryPayload);

    const { data: primaryData, error: primaryError } = await supabase
      .from('contact_assignments')
      .insert(primaryPayload)
      .select()
      .single();

    if (primaryError) {
      console.error('[upsertOwners] PRIMARY insert error:', primaryError);
      if (primaryError.message.includes('row-level security')) {
        return { data: null, error: 'Permission blocked by RLS policy on contact_assignments.' };
      }
      if (primaryError.message.includes('one_active_assignment') || primaryError.message.includes('duplicate key')) {
        return { data: null, error: `Constraint error: ${primaryError.message}. Please refresh and try again.` };
      }
      return { data: null, error: primaryError.message };
    }

    // ========== STEP 3: INSERT NEW SECONDARY (if provided) ==========
    let secondaryData: ContactAssignment | null = null;
    
    if (secondary_owner_id) {
      const secondaryPayload = {
        contact_id,
        assigned_to_crm_user_id: secondary_owner_id,
        assigned_by_crm_user_id: currentCrmUserId,
        assignment_role: 'SECONDARY' as const,
        stage: finalStage,
        status: 'ACTIVE' as const,
        assigned_at: now,
        stage_changed_at: now,
        stage_changed_by_crm_user_id: currentCrmUserId,
      };

      console.log('[upsertOwners] Inserting SECONDARY:', secondaryPayload);

      const { data: secData, error: secondaryError } = await supabase
        .from('contact_assignments')
        .insert(secondaryPayload)
        .select()
        .single();

      if (secondaryError) {
        console.error('[upsertOwners] SECONDARY insert error:', secondaryError);
        // Primary succeeded, log but don't fail the entire operation
        if (secondaryError.message.includes('one_active_assignment') || secondaryError.message.includes('duplicate key')) {
          console.warn('[upsertOwners] Secondary constraint violation - primary succeeded but secondary failed');
        }
      } else {
        secondaryData = secData as ContactAssignment;
      }
    }

    return {
      data: {
        primary: primaryData as ContactAssignment,
        secondary: secondaryData,
      },
      error: null,
    };
  } catch (err) {
    console.error('[upsertOwners] Unexpected error:', err);
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
  data: ContactAssignment[] | null;
  error: string | null;
}> {
  try {
    const { contact_id, stage } = params;

    // Get current CRM user ID
    const { data: currentCrmUserId, error: crmError } = await getCurrentCrmUserId();
    if (crmError || !currentCrmUserId) {
      return { data: null, error: crmError || 'Could not resolve current CRM user' };
    }

    // Get ALL current ACTIVE assignments to preserve both PRIMARY and SECONDARY
    const { data: currentAssignments, error: fetchError } = await supabase
      .from('contact_assignments')
      .select('id, assigned_to_crm_user_id, assignment_role')
      .eq('contact_id', contact_id)
      .eq('status', 'ACTIVE');

    if (fetchError) {
      return { data: null, error: fetchError.message };
    }

    if (!currentAssignments || currentAssignments.length === 0) {
      return { data: null, error: 'No active assignment found for this contact.' };
    }

    const now = new Date().toISOString();
    const insertedAssignments: ContactAssignment[] = [];

    // Process each assignment: close existing, then insert new with updated stage
    for (const assignment of currentAssignments) {
      // Close the existing assignment by ID
      console.log(`[updateStage] Closing assignment ${assignment.id} (${assignment.assignment_role})`);
      const { error: closeError } = await supabase
        .from('contact_assignments')
        .update({ status: 'CLOSED' })
        .eq('id', assignment.id);

      if (closeError) {
        console.error('[updateStage] Close error:', closeError);
        if (closeError.message.includes('row-level security')) {
          return { data: null, error: 'Permission blocked by RLS policy on contact_assignments.' };
        }
        return { data: null, error: closeError.message };
      }

      // Insert new ACTIVE row with updated stage
      const insertPayload = {
        contact_id,
        assigned_to_crm_user_id: assignment.assigned_to_crm_user_id,
        assigned_by_crm_user_id: currentCrmUserId,
        assignment_role: assignment.assignment_role,
        stage,
        status: 'ACTIVE',
        assigned_at: now,
        stage_changed_at: now,
        stage_changed_by_crm_user_id: currentCrmUserId,
      };

      console.log('[updateStage] Insert payload:', insertPayload);

      const { data: insertedData, error: insertError } = await supabase
        .from('contact_assignments')
        .insert(insertPayload)
        .select()
        .single();

      if (insertError) {
        console.error('[updateStage] Insert error:', insertError);
        if (insertError.message.includes('row-level security')) {
          return { data: null, error: 'Permission blocked by RLS policy on contact_assignments.' };
        }
        if (insertError.message.includes('one_active_assignment')) {
          return { data: null, error: 'An active assignment already exists. Please refresh and try again.' };
        }
        return { data: null, error: insertError.message };
      }

      insertedAssignments.push(insertedData as ContactAssignment);
    }

    return { data: insertedAssignments, error: null };
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
