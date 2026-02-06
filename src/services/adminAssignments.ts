import { supabase } from '@/lib/supabaseClient';

/**
 * Admin: Assign specific contacts to a target CRM user.
 * Calls RPC admin_assign_contacts(p_target_crm_user_id, p_contact_ids)
 */
export async function adminAssignContacts(
  targetCrmUserId: string,
  contactIds: string[]
): Promise<{ data: { assigned_count: number } | null; error: string | null }> {
  try {
    const { data, error } = await supabase.rpc('admin_assign_contacts', {
      p_target_crm_user_id: targetCrmUserId,
      p_contact_ids: contactIds,
    });

    if (error) {
      console.error('[adminAssignContacts] RPC error:', error);
      return { data: null, error: error.message };
    }

    return { data: data as { assigned_count: number }, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Admin: Assign next N unassigned contacts to a target CRM user.
 * Calls RPC admin_assign_unassigned(target_crm_user_id, limit_int)
 */
export async function adminAssignUnassigned(
  targetCrmUserId: string,
  limitInt: number
): Promise<{ data: { assigned_count: number } | null; error: string | null }> {
  try {
    const { data, error } = await supabase.rpc('admin_assign_unassigned', {
      target_crm_user_id: targetCrmUserId,
      limit_int: limitInt,
    });

    if (error) {
      console.error('[adminAssignUnassigned] RPC error:', error);
      return { data: null, error: error.message };
    }

    return { data: data as { assigned_count: number }, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
