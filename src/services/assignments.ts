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
      .select('stage')
      .eq('contact_id', contact_id)
      .eq('status', 'ACTIVE')
      .eq('assignment_role', 'PRIMARY')
      .maybeSingle();

    const finalStage = stage || (existingPrimary?.stage as AssignmentStage) || 'ASPIRATION';

    // Close all existing ACTIVE PRIMARY and SECONDARY rows for this contact
    const { error: closeError } = await supabase
      .from('contact_assignments')
      .update({ status: 'CLOSED' })
      .eq('contact_id', contact_id)
      .eq('status', 'ACTIVE')
      .in('assignment_role', ['PRIMARY', 'SECONDARY']);

    if (closeError) {
      if (closeError.message.includes('row-level security')) {
        return { data: null, error: 'Permission blocked by RLS policy on contact_assignments.' };
      }
      return { data: null, error: closeError.message };
    }

    const now = new Date().toISOString();

    // Insert new PRIMARY assignment
    const primaryPayload = {
      contact_id,
      assigned_to_crm_user_id: primary_owner_id,
      assigned_by_crm_user_id: currentCrmUserId,
      assignment_role: 'PRIMARY',
      stage: finalStage,
      status: 'ACTIVE',
      assigned_at: now,
      stage_changed_at: now,
      stage_changed_by_crm_user_id: currentCrmUserId,
    };

    console.log('[upsertOwners] Insert PRIMARY payload:', primaryPayload);

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
      return { data: null, error: primaryError.message };
    }

    // Insert SECONDARY if provided
    let secondaryData: ContactAssignment | null = null;

    if (secondary_owner_id) {
      const secondaryPayload = {
        contact_id,
        assigned_to_crm_user_id: secondary_owner_id,
        assigned_by_crm_user_id: currentCrmUserId,
        assignment_role: 'SECONDARY',
        stage: finalStage,
        status: 'ACTIVE',
        assigned_at: now,
        stage_changed_at: now,
        stage_changed_by_crm_user_id: currentCrmUserId,
      };

      console.log('[upsertOwners] Insert SECONDARY payload:', secondaryPayload);

      const { data: secData, error: secondaryError } = await supabase
        .from('contact_assignments')
        .insert(secondaryPayload)
        .select()
        .single();

      if (secondaryError) {
        console.error('[upsertOwners] SECONDARY insert error:', secondaryError);
        if (secondaryError.message.includes('row-level security')) {
          return { data: null, error: 'Permission blocked by RLS policy on contact_assignments.' };
        }
        return { data: null, error: secondaryError.message };
      }

      secondaryData = secData as ContactAssignment;
    }

    return {
      data: {
        primary: primaryData as ContactAssignment,
        secondary: secondaryData,
      },
      error: null,
    };
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
