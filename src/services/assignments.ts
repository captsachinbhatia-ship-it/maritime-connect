import { supabase } from '@/lib/supabaseClient';
import { getCurrentCrmUserId } from './profiles';

export type AssignmentStage = 'COLD_CALLING' | 'ASPIRATION' | 'ACHIEVEMENT' | 'INACTIVE';
export type AssignmentRole = 'primary' | 'secondary';

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
      if (!existing || assignment.assignment_role === 'primary') {
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
      .in('assignment_role', ['primary', 'secondary']);

    if (error) {
      return { data: null, error: error.message };
    }

    const owners: ContactOwners = {
      primary: null,
      secondary: null,
    };

    data?.forEach(assignment => {
      const role = (assignment.assignment_role || '').toLowerCase();
      if (role === 'primary') {
        owners.primary = assignment as ContactAssignment;
      } else if (role === 'secondary') {
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
      .in('assignment_role', ['primary', 'secondary']);

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
      const role = (assignment.assignment_role || '').toLowerCase();
      if (role === 'primary') {
        ownersMap[contactId].primary = assignment as ContactAssignment;
      } else if (role === 'secondary') {
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
      .eq('assignment_role', 'primary')
      .maybeSingle();

    // Get current ACTIVE SECONDARY
    const { data: existingSecondary } = await supabase
      .from('contact_assignments')
      .select('id, assigned_to_crm_user_id')
      .eq('contact_id', contact_id)
      .eq('status', 'ACTIVE')
      .eq('assignment_role', 'secondary')
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

    // ========== STEP 2: BUILD ALL INSERT PAYLOADS ==========
    const insertPayloads: Array<{
      contact_id: string;
      assigned_to_crm_user_id: string;
      assigned_by_crm_user_id: string;
      assignment_role: 'primary' | 'secondary';
      stage: AssignmentStage;
      status: 'ACTIVE';
      assigned_at: string;
      stage_changed_at: string;
      stage_changed_by_crm_user_id: string;
    }> = [];

    // Always add PRIMARY
    insertPayloads.push({
      contact_id,
      assigned_to_crm_user_id: primary_owner_id,
      assigned_by_crm_user_id: currentCrmUserId,
      assignment_role: 'primary',
      stage: finalStage,
      status: 'ACTIVE',
      assigned_at: now,
      stage_changed_at: now,
      stage_changed_by_crm_user_id: currentCrmUserId,
    });

    // Add SECONDARY if provided
    if (secondary_owner_id) {
      insertPayloads.push({
        contact_id,
        assigned_to_crm_user_id: secondary_owner_id,
        assigned_by_crm_user_id: currentCrmUserId,
        assignment_role: 'secondary',
        stage: finalStage,
        status: 'ACTIVE',
        assigned_at: now,
        stage_changed_at: now,
        stage_changed_by_crm_user_id: currentCrmUserId,
      });
    }

    console.log('[upsertOwners] Inserting payloads:', JSON.stringify(insertPayloads, null, 2));

    // ========== STEP 3: INSERT ALL IN A SINGLE BATCH ==========
    const { data: insertedData, error: insertError } = await supabase
      .from('contact_assignments')
      .insert(insertPayloads)
      .select();

    if (insertError) {
      console.error('[upsertOwners] Insert error:', insertError);
      if (insertError.message.includes('row-level security')) {
        return { data: null, error: 'Permission blocked by RLS policy on contact_assignments.' };
      }
      if (insertError.message.includes('one_active_assignment') || insertError.message.includes('duplicate key')) {
        return { data: null, error: `Constraint error: ${insertError.message}. Please refresh and try again.` };
      }
      return { data: null, error: insertError.message };
    }

    // Parse results
    const primaryData = insertedData?.find(a => a.assignment_role === 'primary') || null;
    const secondaryData = insertedData?.find(a => a.assignment_role === 'secondary') || null;

    console.log('[upsertOwners] Inserted PRIMARY:', primaryData?.id);
    console.log('[upsertOwners] Inserted SECONDARY:', secondaryData?.id);

    return {
      data: {
        primary: primaryData as ContactAssignment,
        secondary: secondaryData as ContactAssignment | null,
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

/**
 * Change contact stage using RPC
 * Returns action type: 'UPDATED' for direct updates, 'REQUESTED' for INACTIVE requests
 */
export async function changeContactStage(params: {
  contact_id: string;
  to_stage: AssignmentStage;
  note?: string | null;
}): Promise<{
  data: { action: 'UPDATED' | 'REQUESTED' } | null;
  error: string | null;
}> {
  try {
    const { contact_id, to_stage, note } = params;

    // Get current CRM user ID
    const { data: currentCrmUserId, error: crmError } = await getCurrentCrmUserId();
    if (crmError || !currentCrmUserId) {
      return { data: null, error: crmError || 'Could not resolve current CRM user' };
    }

    // INACTIVE transitions require admin approval
    if (to_stage === 'INACTIVE') {
      const { error: requestError } = await supabase
        .from('contact_stage_requests')
        .insert({
          contact_id,
          requested_stage: to_stage,
          requested_by_crm_user_id: currentCrmUserId,
          note: note || null,
          status: 'PENDING',
        });

      if (requestError) {
        console.error('[changeContactStage] Request insert error:', requestError);
        return { data: null, error: requestError.message };
      }

      return { data: { action: 'REQUESTED' }, error: null };
    }

    // Direct update to contacts.stage (no RPC, no alias)
    const { error: contactUpdateError } = await supabase
      .from('contacts')
      .update({ stage: to_stage })
      .eq('id', contact_id);

    if (contactUpdateError) {
      console.error('[changeContactStage] contacts.stage update error:', contactUpdateError);
      return { data: null, error: contactUpdateError.message };
    }

    // Also update active contact_assignments.stage for consistency
    const now = new Date().toISOString();
    await supabase
      .from('contact_assignments')
      .update({
        stage: to_stage,
        stage_changed_at: now,
        stage_changed_by_crm_user_id: currentCrmUserId,
      })
      .eq('contact_id', contact_id)
      .eq('status', 'ACTIVE');

    return { data: { action: 'UPDATED' }, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Unknown error occurred'
    };
  }
}

// Legacy updateStage - kept for backwards compatibility
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

// Add a single assignment (for Admin add assignment modal)
// This inserts a new ACTIVE assignment without closing existing ones
// Used when adding a new owner to a contact that may already have owners
export async function addAssignment(params: {
  contact_id: string;
  assigned_to_crm_user_id: string;
  assignment_role: AssignmentRole;
  stage: AssignmentStage;
}): Promise<{
  data: ContactAssignment | null;
  error: string | null;
}> {
  try {
    const { contact_id, assigned_to_crm_user_id, assignment_role, stage } = params;

    // Get current CRM user ID for assigner
    const { data: currentCrmUserId, error: crmError } = await getCurrentCrmUserId();
    if (crmError || !currentCrmUserId) {
      return { data: null, error: crmError || 'Could not resolve current CRM user' };
    }

    // Check if there's already an ACTIVE assignment with the same role
    const { data: existingRoleAssignment } = await supabase
      .from('contact_assignments')
      .select('id, assigned_to_crm_user_id')
      .eq('contact_id', contact_id)
      .eq('status', 'ACTIVE')
      .eq('assignment_role', assignment_role)
      .maybeSingle();

    // If there's an existing assignment with the same role, close it first
    if (existingRoleAssignment) {
      console.log(`[addAssignment] Closing existing ${assignment_role} assignment:`, existingRoleAssignment.id);
      const { error: closeError } = await supabase
        .from('contact_assignments')
        .update({ status: 'CLOSED' })
        .eq('id', existingRoleAssignment.id);

      if (closeError) {
        console.error('[addAssignment] Close error:', closeError);
        if (closeError.message.includes('row-level security')) {
          return { data: null, error: 'Permission blocked by RLS policy on contact_assignments.' };
        }
        return { data: null, error: closeError.message };
      }
    }

    const now = new Date().toISOString();

    const insertPayload = {
      contact_id,
      assigned_to_crm_user_id,
      assigned_by_crm_user_id: currentCrmUserId,
      assignment_role,
      stage,
      status: 'ACTIVE',
      assigned_at: now,
      stage_changed_at: now,
      stage_changed_by_crm_user_id: currentCrmUserId,
    };

    console.log('[addAssignment] Insert payload:', insertPayload);

    const { data, error } = await supabase
      .from('contact_assignments')
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      console.error('[addAssignment] Insert error:', error);
      if (error.message.includes('row-level security')) {
        return { data: null, error: 'Permission blocked by RLS policy on contact_assignments.' };
      }
      if (error.message.includes('one_active_assignment') || error.message.includes('duplicate key')) {
        return { data: null, error: 'An active assignment with this role already exists. Please refresh and try again.' };
      }
      return { data: null, error: error.message };
    }

    return { data: data as ContactAssignment, error: null };
  } catch (err) {
    console.error('[addAssignment] Unexpected error:', err);
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Unknown error occurred'
    };
  }
}
