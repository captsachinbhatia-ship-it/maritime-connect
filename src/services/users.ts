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
  console.log('[createCrmUserViaEdgeFunction] input:', userData);

  // Verify session before invoking
  const { data: { user } } = await supabase.auth.getUser();
  console.log('[createCrmUserViaEdgeFunction] session user:', user);

  if (!user) {
    console.error('No authenticated user found');
    return { data: null, error: 'You must be logged in to create users' };
  }

  const input = {
    full_name: userData.full_name,
    email: userData.email,
    role: userData.role,
    region_focus: userData.region_focus || null,
  };

  console.log('[createCrmUserViaEdgeFunction] invoking admin-create-user with body:', input);

  try {
    const { data, error } = await supabase.functions.invoke('admin-create-user', {
      body: input,
    });

    console.log('[createCrmUserViaEdgeFunction] invoke raw:', { data, error });

    if (error) {
      // Supabase SDK wraps HTTP errors – unwrap them
      if ((error as any).context instanceof Response) {
        try {
          const res = (error as any).context;
          const contentType = res.headers.get('content-type') || '';

          if (contentType.includes('application/json')) {
            const payload = await res.json();
            throw new Error(payload.details || payload.error || error.message);
          } else {
            const text = await res.text();
            throw new Error(text || error.message);
          }
        } catch (e: any) {
          throw new Error(e.message || error.message);
        }
      }

      // True network / fetch failure only
      throw new Error(error.message);
    }

    // Check if response indicates an error (some Edge Functions return {ok: false, error: ...})
    if (data && data.ok === false && data.error) {
      console.error('[createCrmUserViaEdgeFunction] error in data:', data.error);
      return { data: null, error: data.error };
    }

    console.log('[createCrmUserViaEdgeFunction] success:', data);
    return { data, error: null };
  } catch (err: any) {
    console.error('[createCrmUserViaEdgeFunction] exception:', err);
    return { data: null, error: err.message || 'Unknown error occurred' };
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
