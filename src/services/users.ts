import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabaseClient';

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

export async function createCrmUserViaEdgeFunction(input: {
  full_name: string;
  email: string;
  role: string;
  region_focus?: string;
}): Promise<{ data: unknown; error: string | null }> {
  console.log('[createCrmUserViaEdgeFunction] input:', input);

  const { data: sessionData, error: sessErr } = await supabase.auth.getSession();
  console.log('[createCrmUserViaEdgeFunction] session:', sessionData?.session, 'sessErr:', sessErr);

  const token = sessionData?.session?.access_token;
  if (!token) {
    return { data: null, error: 'No active session. Please log in again.' };
  }

  const url = `${SUPABASE_URL}/functions/v1/admin-create-user`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(input),
    });

    const contentType = res.headers.get('content-type') || '';
    const bodyText = await res.text();

    console.log('[createCrmUserViaEdgeFunction] status:', res.status);
    console.log('[createCrmUserViaEdgeFunction] raw body:', bodyText);

    let parsed: any = null;
    if (contentType.includes('application/json')) {
      try {
        parsed = JSON.parse(bodyText);
      } catch {
        // Not valid JSON, keep parsed as null
      }
    }

    if (!res.ok) {
      const msg =
        parsed?.details ||
        parsed?.error ||
        bodyText ||
        `Edge Function failed (${res.status})`;
      return { data: null, error: msg };
    }

    return { data: parsed ?? bodyText, error: null };
  } catch (err: any) {
    console.error('[createCrmUserViaEdgeFunction] fetch exception:', err);
    return { data: null, error: err.message || 'Network error occurred' };
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
