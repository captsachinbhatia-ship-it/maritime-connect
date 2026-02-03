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

// Type guard for Supabase FunctionsHttpError
type FnErrorPayload = { error?: string; details?: string };

function isFunctionsHttpError(err: unknown): err is { context?: Response; message?: string } {
  return !!err && typeof err === 'object' && 'context' in err;
}

// Extract the real error message from Edge Function responses
async function readFnError(err: unknown): Promise<string> {
  // True network / CORS / DNS type errors
  if (err instanceof TypeError) {
    return `Network error: ${err.message}`;
  }

  // Supabase FunctionsHttpError - extract response body
  if (isFunctionsHttpError(err) && err.context) {
    try {
      const contentType = err.context.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const payload = (await err.context.json()) as FnErrorPayload;
        return payload.details
          ? `${payload.error ?? 'Function error'}: ${payload.details}`
          : payload.error ?? err.message ?? 'Function error';
      }
      const text = await err.context.text();
      return text || err.message || 'Function error';
    } catch {
      return err.message || 'Function error';
    }
  }

  // Generic fallback
  if (err instanceof Error) {
    return err.message;
  }
  return typeof err === 'string' ? err : JSON.stringify(err);
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

  const requestBody = {
    full_name: userData.full_name,
    email: userData.email,
    role: userData.role,
    region_focus: userData.region_focus || null,
  };

  console.log('[createCrmUserViaEdgeFunction] invoking admin-create-user with body:', requestBody);

  try {
    const { data, error } = await supabase.functions.invoke('admin-create-user', {
      body: requestBody,
    });

    console.log('[createCrmUserViaEdgeFunction] invoke result:', { data, error });

    if (error) {
      const msg = await readFnError(error);
      console.error('[createCrmUserViaEdgeFunction] error extracted:', msg);
      return { data: null, error: msg };
    }

    // Check if response indicates an error (some Edge Functions return {ok: false, error: ...})
    if (data && data.ok === false && data.error) {
      console.error('[createCrmUserViaEdgeFunction] error in data:', data.error);
      return { data: null, error: data.error };
    }

    console.log('[createCrmUserViaEdgeFunction] success:', data);
    return { data, error: null };
  } catch (err) {
    const msg = await readFnError(err);
    console.error('[createCrmUserViaEdgeFunction] exception:', err, 'extracted:', msg);
    return { data: null, error: msg };
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
