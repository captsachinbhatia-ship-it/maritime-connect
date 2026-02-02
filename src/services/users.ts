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

export const CRM_ROLES = ['ShipBroker', 'Desk Manager', 'Operations', 'Accounts Executive'] as const;
export type CrmRole = typeof CRM_ROLES[number];

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

export async function createCrmUserViaEdgeFunction(userData: {
  full_name: string;
  email: string;
  role: string;
  region_focus?: string;
}): Promise<{ data: unknown; error: string | null }> {
  try {
    // PART 3: Log session info before invoking
    const { data: { user } } = await supabase.auth.getUser();
    console.log('Current session user before Edge Function call:', user);

    if (!user) {
      console.error('No authenticated user found');
      return { data: null, error: 'You must be logged in to create users' };
    }

    const requestBody = {
      full_name: userData.full_name,
      email: userData.email,
      role: userData.role,
      region_focus: userData.region_focus || null,
    };

    console.log('Invoking Edge Function admin-create-user with body:', requestBody);

    // PART 2 & 4: Use official supabase.functions.invoke (NOT fetch, NOT hardcoded URL)
    const { data, error } = await supabase.functions.invoke('admin-create-user', {
      body: requestBody,
    });

    // PART 2: Log full response for debugging
    console.log('Edge Function response:', { data, error });

    if (error) {
      // PART 5: Extract the actual error message
      // FunctionsHttpError has a different structure
      let errorMessage = 'Failed to create user';
      
      if (error.message) {
        errorMessage = error.message;
      }
      
      // Try to parse error context if available
      if (error.context) {
        try {
          const contextBody = await error.context.json();
          console.error('Edge Function error context:', contextBody);
          if (contextBody?.error) {
            errorMessage = contextBody.error;
          }
        } catch {
          console.error('Could not parse error context');
        }
      }

      console.error('Edge Function error:', errorMessage);
      return { data: null, error: errorMessage };
    }

    // Check if response indicates an error (some Edge Functions return {ok: false, error: ...})
    if (data && data.ok === false && data.error) {
      console.error('Edge Function returned error in data:', data.error);
      return { data: null, error: data.error };
    }

    console.log('Edge Function success:', data);
    return { data, error: null };
  } catch (err) {
    // PART 2: Log full error for debugging
    console.error('Edge Function call failed with exception:', err);
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
