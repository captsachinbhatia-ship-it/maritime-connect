import { supabase } from '@/lib/supabaseClient';

/**
 * Assign a primary owner to a contact via the assign_primary_contact_owner RPC.
 * This is admin-only and enforced server-side.
 */
export async function assignPrimaryContactOwner(params: {
  contactId: string;
  assigneeCrmUserId: string;
  stage?: string;
}): Promise<{
  data: { assignment_id: string } | null;
  error: string | null;
}> {
  try {
    const { contactId, assigneeCrmUserId, stage } = params;

    const { data, error } = await supabase.rpc('assign_primary_contact_owner', {
      p_contact_id: contactId,
      p_assignee_crm_user_id: assigneeCrmUserId,
      p_stage: stage || 'COLD_CALLING',
    });

    if (error) {
      console.error('[assignPrimaryContactOwner] RPC error:', error);
      return { data: null, error: error.message };
    }

    return { data: data as { assignment_id: string }, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Check if current user is admin via the is_admin() DB function.
 */
export async function checkIsAdmin(): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('is_admin');
    if (error) {
      console.error('[checkIsAdmin] RPC error:', error);
      return false;
    }
    return !!data;
  } catch {
    return false;
  }
}

/**
 * Fetch active CRM users for assignment dropdown.
 */
export async function getActiveCrmUsers(): Promise<{
  data: Array<{ id: string; full_name: string; email: string | null }> | null;
  error: string | null;
}> {
  try {
    const { data, error } = await supabase
      .from('crm_users')
      .select('id, full_name, email')
      .eq('active', true)
      .order('full_name', { ascending: true });

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data || [], error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
