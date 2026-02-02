import { supabase } from '@/lib/supabaseClient';

export interface CrmUser {
  id: string;
  auth_user_id: string | null;
  full_name: string;
  email: string | null;
  role: string;
  region_focus: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export async function listCrmUsers(): Promise<{
  data: CrmUser[] | null;
  error: string | null;
}> {
  try {
    const { data, error } = await supabase
      .from('crm_users')
      .select('id, auth_user_id, full_name, email, role, region_focus, active, created_at, updated_at')
      .order('full_name', { ascending: true });

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data || [], error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Unknown error occurred'
    };
  }
}

export async function createCrmUser(userData: {
  full_name: string;
  email?: string;
  role: string;
  region_focus?: string;
  active?: boolean;
}): Promise<{ data: CrmUser | null; error: string | null }> {
  try {
    // Get current authenticated user
    const { data: authData, error: authError } = await supabase.auth.getUser();
    
    if (authError || !authData.user) {
      return { data: null, error: 'You must be logged in to create users.' };
    }

    const { data, error } = await supabase
      .from('crm_users')
      .insert({
        auth_user_id: authData.user.id,
        full_name: userData.full_name,
        email: userData.email || null,
        role: userData.role,
        region_focus: userData.region_focus || null,
        active: userData.active ?? true,
      })
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Unknown error occurred'
    };
  }
}

export async function updateCrmUser(
  userId: string,
  updates: Partial<Pick<CrmUser, 'full_name' | 'role' | 'active' | 'email' | 'region_focus'>>
): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase
      .from('crm_users')
      .update(updates)
      .eq('id', userId);

    if (error) {
      return { error: error.message };
    }

    return { error: null };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Unknown error occurred'
    };
  }
}

export async function deleteCrmUser(userId: string): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase
      .from('crm_users')
      .delete()
      .eq('id', userId);

    if (error) {
      return { error: error.message };
    }

    return { error: null };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Unknown error occurred'
    };
  }
}
