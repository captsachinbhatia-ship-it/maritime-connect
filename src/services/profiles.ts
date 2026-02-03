import { supabase } from '@/lib/supabaseClient';

export interface Profile {
  id: string;
  full_name: string | null;
  role: string | null;
}

export interface CrmUserForAssignment {
  id: string;
  full_name: string;
  email: string | null;
  role: string | null;
}

export async function getCurrentUserProfile(): Promise<{
  data: Profile | null;
  error: string | null;
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { data: null, error: 'Not authenticated' };
    }

    // Fetch role from crm_users table instead of profiles
    const { data, error } = await supabase
      .from('crm_users')
      .select('id, full_name, role')
      .eq('id', user.id)
      .maybeSingle();

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

// List active CRM users for assignment dropdown
export async function listCrmUsersForAssignment(): Promise<{
  data: CrmUserForAssignment[] | null;
  error: string | null;
}> {
  try {
    const { data, error } = await supabase
      .from('crm_users')
      .select('id, full_name, email, role')
      .eq('active', true)
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

// Get current user's CRM ID from auth_user_id
export async function getCurrentCrmUserId(): Promise<{
  data: string | null;
  error: string | null;
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { data: null, error: 'Not authenticated' };
    }

    const { data, error } = await supabase
      .from('crm_users')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (error) {
      return { data: null, error: error.message };
    }

    if (!data) {
      return { data: null, error: 'CRM user not found for current auth user' };
    }

    return { data: data.id, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Unknown error occurred'
    };
  }
}

// Legacy function - kept for backward compatibility
export async function listProfilesForAssignment(): Promise<{
  data: Profile[] | null;
  error: string | null;
}> {
  try {
    const { data, error } = await supabase
      .from('crm_users')
      .select('id, full_name, role')
      .eq('active', true)
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
