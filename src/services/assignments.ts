import { supabase } from '@/lib/supabaseClient';
import { previewWriteGuard } from '@/lib/previewGuard';

export type AssignmentStage = 'COLD_CALLING' | 'TARGETING' | 'ASPIRATION' | 'ACHIEVEMENT';
export type AssignmentRole = 'primary' | 'secondary';

export interface ContactAssignment {
  id: string;
  contact_id: string;
  assigned_to_crm_user_id: string | null;
  assigned_by_crm_user_id: string | null;
  assignment_role: string;
  stage: string | null;
  status: string;
  created_at: string;
  assigned_at: string | null;
  ended_at: string | null;
  stage_changed_at: string | null;
  stage_changed_by: string | null;
}

export interface ContactOwners {
  primary: ContactAssignment | null;
  secondary: ContactAssignment | null;
}

// --------------- Queries ---------------

export async function getAssignmentsByContact(
  contactId: string
): Promise<{ data: ContactAssignment[] | null; error: string | null }> {
  const { data, error } = await supabase
    .from('contact_assignments')
    .select('*')
    .eq('contact_id', contactId)
    .order('created_at', { ascending: false });

  if (error) return { data: null, error: error.message };
  return { data: data as ContactAssignment[], error: null };
}

export async function getContactOwners(
  contactId: string
): Promise<{ data: ContactOwners | null; error: string | null }> {
  const { data, error } = await supabase
    .from('contact_assignments')
    .select('*')
    .eq('contact_id', contactId)
    .eq('status', 'ACTIVE')
    .is('ended_at', null);

  if (error) return { data: null, error: error.message };

  const rows = (data || []) as ContactAssignment[];
  const primary = rows.find((r) => r.assignment_role?.toLowerCase() === 'primary') || null;
  const secondary = rows.find((r) => r.assignment_role?.toLowerCase() === 'secondary') || null;

  return { data: { primary, secondary }, error: null };
}

export async function getOwnersForContacts(
  contactIds: string[]
): Promise<{ data: Record<string, ContactOwners> | null; error: string | null }> {
  if (contactIds.length === 0) return { data: {}, error: null };

  const { data, error } = await supabase
    .from('contact_assignments')
    .select('*')
    .in('contact_id', contactIds)
    .eq('status', 'ACTIVE')
    .is('ended_at', null);

  if (error) return { data: null, error: error.message };

  const map: Record<string, ContactOwners> = {};
  for (const row of (data || []) as ContactAssignment[]) {
    if (!map[row.contact_id]) map[row.contact_id] = { primary: null, secondary: null };
    const role = row.assignment_role?.toLowerCase();
    if (role === 'primary') map[row.contact_id].primary = row;
    else if (role === 'secondary') map[row.contact_id].secondary = row;
  }

  return { data: map, error: null };
}

// --------------- Mutations ---------------

/** Close-then-insert pattern for primary + optional secondary */
export async function upsertOwners(params: {
  contact_id: string;
  primary_owner_id: string;
  secondary_owner_id?: string | null;
  stage?: AssignmentStage;
  /** Pass crm_users.id from useCrmUser() to avoid an extra DB round-trip. */
  assigned_by_crm_user_id?: string | null;
}): Promise<{ data: boolean | null; error: string | null }> {
  const guardError = previewWriteGuard();
  if (guardError) return { data: null, error: guardError };

  const { contact_id, primary_owner_id, secondary_owner_id } = params;
  const now = new Date().toISOString();

  try {
    // Use caller-provided crm user id; fall back to DB lookup only if not provided.
    let assignedByCrmUserId: string | null = params.assigned_by_crm_user_id ?? null;
    if (!assignedByCrmUserId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('crm_users')
          .select('id')
          .eq('auth_user_id', user.id)
          .maybeSingle();
        assignedByCrmUserId = profile?.id || null;
      }
    }

    // Determine stage: use provided, or preserve existing, or default
    let stage: string = params.stage || 'COLD_CALLING';
    if (!params.stage) {
      const { data: existing } = await supabase
        .from('contact_assignments')
        .select('stage')
        .eq('contact_id', contact_id)
        .eq('status', 'ACTIVE')
        .is('ended_at', null)
        .eq('assignment_role', 'PRIMARY')
        .maybeSingle();
      if (existing?.stage) stage = existing.stage;
    }

    // Close all existing ACTIVE assignments for this contact
    await supabase
      .from('contact_assignments')
      .update({ status: 'CLOSED', ended_at: now })
      .eq('contact_id', contact_id)
      .eq('status', 'ACTIVE')
      .is('ended_at', null);

    // Insert primary
    const { error: primaryError } = await supabase
      .from('contact_assignments')
      .insert({
        contact_id,
        assigned_to_crm_user_id: primary_owner_id,
        assigned_by_crm_user_id: assignedByCrmUserId,
        assignment_role: 'PRIMARY',
        stage,
        status: 'ACTIVE',
      });

    if (primaryError) return { data: null, error: primaryError.message };

    // Insert secondary if provided
    if (secondary_owner_id) {
      const { error: secondaryError } = await supabase
        .from('contact_assignments')
        .insert({
          contact_id,
          assigned_to_crm_user_id: secondary_owner_id,
          assigned_by_crm_user_id: assignedByCrmUserId,
          assignment_role: 'SECONDARY',
          stage,
          status: 'ACTIVE',
        });

      if (secondaryError) return { data: null, error: secondaryError.message };
    }

    return { data: true, error: null };
  } catch (e: any) {
    return { data: null, error: e?.message || 'Unexpected error in upsertOwners' };
  }
}

/** Simple single-row upsert for quick assignment (e.g. from Unassigned list) */
export async function upsertAssignment(params: {
  contact_id: string;
  assigned_to_crm_user_id: string;
  stage: string;
}): Promise<{ data: boolean | null; error: string | null }> {
  return upsertOwners({
    contact_id: params.contact_id,
    primary_owner_id: params.assigned_to_crm_user_id,
    stage: params.stage as AssignmentStage,
  });
}

/** Add a single assignment (primary or secondary) without closing others of different role */
export async function addAssignment(params: {
  contact_id: string;
  assigned_to_crm_user_id: string;
  assignment_role: AssignmentRole;
  stage: AssignmentStage;
  /** Pass crm_users.id from useCrmUser() to avoid an extra DB round-trip. */
  assigned_by_crm_user_id?: string | null;
}): Promise<{ data: { assignmentId: string | null } | null; error: string | null }> {
  const now = new Date().toISOString();

  try {
    // Use caller-provided crm user id; fall back to DB lookup only if not provided.
    let assignedByCrmUserId: string | null = params.assigned_by_crm_user_id ?? null;
    if (!assignedByCrmUserId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('crm_users')
          .select('id')
          .eq('auth_user_id', user.id)
          .maybeSingle();
        assignedByCrmUserId = profile?.id || null;
      }
    }

    // Close existing ACTIVE assignment of the SAME role for this contact
    await supabase
      .from('contact_assignments')
      .update({ status: 'CLOSED', ended_at: now })
      .eq('contact_id', params.contact_id)
      .eq('status', 'ACTIVE')
      .is('ended_at', null)
      .eq('assignment_role', params.assignment_role.toUpperCase());

    // Insert new and return the id
    const { data: inserted, error } = await supabase
      .from('contact_assignments')
      .insert({
        contact_id: params.contact_id,
        assigned_to_crm_user_id: params.assigned_to_crm_user_id,
        assigned_by_crm_user_id: assignedByCrmUserId,
        assignment_role: params.assignment_role.toUpperCase(),
        stage: params.assignment_role.toUpperCase() === 'PRIMARY' ? params.stage : 'COLD_CALLING',
        status: 'ACTIVE',
      })
      .select('id')
      .single();

    if (error) return { data: null, error: error.message };
    return { data: { assignmentId: inserted?.id || null }, error: null };
  } catch (e: any) {
    return { data: null, error: e?.message || 'Unexpected error in addAssignment' };
  }
}

/** Change stage on the ACTIVE PRIMARY assignment, with INACTIVE request logic */
export async function changeContactStage(params: {
  contact_id: string;
  to_stage: AssignmentStage;
}): Promise<{ data: { action: string } | null; error: string | null }> {
  try {
    // Try RPC first
    const { data, error } = await supabase.rpc('change_contact_stage', {
      p_contact_id: params.contact_id,
      p_to_stage: params.to_stage,
    });

    if (error) {
      // Fallback: direct update on contact_assignments
      const { error: updateError, count } = await supabase
        .from('contact_assignments')
        .update({
          stage: params.to_stage,
          stage_changed_at: new Date().toISOString(),
        }, { count: 'exact' })
        .eq('contact_id', params.contact_id)
        .eq('status', 'ACTIVE')
        .is('ended_at', null)
        .eq('assignment_role', 'PRIMARY');

      if (updateError) return { data: null, error: updateError.message };
      if (count === 0) return { data: { action: 'NO_ROWS' }, error: null };
      return { data: { action: 'UPDATED' }, error: null };
    }

    return { data: data || { action: 'UPDATED' }, error: null };
  } catch (e: any) {
    return { data: null, error: e?.message || 'Unexpected error in changeContactStage' };
  }
}
