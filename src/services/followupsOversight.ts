import { supabase } from '@/lib/supabaseClient';

// Q1: KPI counts (Overdue, Due Today, Next 7 Days) - via RPC
export interface OversightKPIs {
  overdue: number;
  dueToday: number;
  next7Days: number;
}

export async function getOversightKPIs(): Promise<{
  data: OversightKPIs | null;
  error: string | null;
}> {
  try {
    const { data, error } = await supabase.rpc('rpc_followups_kpis');

    if (error) {
      // Check for access restriction
      if (error.message.includes('Access restricted') || error.code === '42501') {
        return { data: null, error: 'Access restricted' };
      }
      // Fallback for missing function
      if (error.message.includes('does not exist') || error.code === '42883') {
        return { data: { overdue: 0, dueToday: 0, next7Days: 0 }, error: null };
      }
      return { data: null, error: error.message };
    }

    // Map RPC response to our interface
    // Expected format: { overdue: number, due_today: number, next_7_days: number }
    return {
      data: {
        overdue: data?.overdue ?? 0,
        dueToday: data?.due_today ?? 0,
        next7Days: data?.next_7_days ?? 0,
      },
      error: null,
    };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to load KPIs',
    };
  }
}

// Next 7 Days list - via RPC
export interface Next7DaysFollowup {
  id: string;
  dueAt: string;
  contactId: string;
  contactName: string;
  companyName: string | null;
  callerName: string;
  followupType: string;
  followupReason: string;
}

export async function getNext7DaysFollowups(): Promise<{
  data: Next7DaysFollowup[] | null;
  error: string | null;
}> {
  try {
    const { data, error } = await supabase.rpc('rpc_followups_next_7_days');

    if (error) {
      // Check for access restriction
      if (error.message.includes('Access restricted') || error.code === '42501') {
        return { data: null, error: 'Access restricted' };
      }
      // Fallback for missing function
      if (error.message.includes('does not exist') || error.code === '42883') {
        return { data: [], error: null };
      }
      return { data: null, error: error.message };
    }

    // Map RPC response to our interface
    const result: Next7DaysFollowup[] = (data || []).map((row: any) => ({
      id: row.id,
      dueAt: row.due_at,
      contactId: row.contact_id,
      contactName: row.contact_name || 'Unknown',
      companyName: row.company_name || null,
      callerName: row.caller_name || 'Unassigned',
      followupType: row.followup_type,
      followupReason: row.followup_reason,
    }));

    // Sort by due_at ascending (soonest first)
    result.sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());

    return { data: result, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to load next 7 days',
    };
  }
}

// Q2: Overdue by caller
export interface OverdueByCaller {
  callerId: string;
  callerName: string;
  overdueCount: number;
  oldestDue: string;
}

export async function getOverdueByCaller(): Promise<{
  data: OverdueByCaller[] | null;
  error: string | null;
}> {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Get overdue followups from V2 view
    const { data: followups, error: followupsError } = await supabase
      .from('v_followup_queue_all_v2')
      .select('id, due_at, user_id, contact_id')
      .lt('due_at', startOfToday.toISOString());

    if (followupsError) {
      if (followupsError.message.includes('does not exist') || followupsError.code === '42P01') {
        return { data: [], error: null };
      }
      return { data: null, error: followupsError.message };
    }

    if (!followups || followups.length === 0) {
      return { data: [], error: null };
    }

    // Group by user_id (caller) directly from v2 view
    const callerStats: Record<string, { count: number; oldestDue: Date }> = {};
    followups.forEach((f: any) => {
      const callerId = f.user_id;
      if (!callerId) return;

      if (!callerStats[callerId]) {
        callerStats[callerId] = { count: 0, oldestDue: new Date(f.due_at) };
      }
      callerStats[callerId].count++;
      const dueDate = new Date(f.due_at);
      if (dueDate < callerStats[callerId].oldestDue) {
        callerStats[callerId].oldestDue = dueDate;
      }
    });

    // Fetch caller names from crm_users
    const callerIds = Object.keys(callerStats);
    if (callerIds.length === 0) {
      return { data: [], error: null };
    }

    const { data: users, error: usersError } = await supabase
      .from('crm_users')
      .select('id, full_name, email')
      .in('id', callerIds);

    if (usersError) {
      return { data: null, error: usersError.message };
    }

    const userNameMap: Record<string, string> = {};
    (users || []).forEach((u) => {
      userNameMap[u.id] = u.full_name || u.email || 'Unknown';
    });

    // Build result
    const result: OverdueByCaller[] = callerIds.map((callerId) => ({
      callerId,
      callerName: userNameMap[callerId] || 'Unknown',
      overdueCount: callerStats[callerId].count,
      oldestDue: callerStats[callerId].oldestDue.toISOString(),
    }));

    // Sort by overdue count desc
    result.sort((a, b) => b.overdueCount - a.overdueCount);

    return { data: result, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to load overdue by caller',
    };
  }
}

// Q3: Drilldown list by caller_id
export interface CallerFollowupDrilldown {
  id: string;
  dueAt: string;
  contactName: string;
  companyName: string | null;
  followupType: string;
  followupReason: string;
}

export async function getOverdueByCallerId(callerId: string): Promise<{
  data: CallerFollowupDrilldown[] | null;
  error: string | null;
}> {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Get assignments for this caller (callerId is now crm_users.id)
    // Get overdue followups for this caller from V2 view
    const { data: followups, error: followupsError } = await supabase
      .from('v_followup_queue_all_v2')
      .select('id, due_at, contact_id, contact_name, company_name, interaction_type, notes')
      .eq('user_id', callerId)
      .lt('due_at', startOfToday.toISOString())
      .order('due_at', { ascending: true });

    if (followupsError) {
      return { data: null, error: followupsError.message };
    }

    if (!followups || followups.length === 0) {
      return { data: [], error: null };
    }

    // Build result directly from v2 view data
    const result: CallerFollowupDrilldown[] = followups.map((f: any) => ({
      id: f.id,
      dueAt: f.due_at,
      contactName: f.contact_name || 'Unknown',
      companyName: f.company_name || null,
      followupType: f.interaction_type || 'OTHER',
      followupReason: f.notes || '',
    }));

    return { data: result, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to load caller drilldown',
    };
  }
}

// Q4: Slipping contacts (2+ overdue OR oldest overdue > 7 days)
export interface SlippingContact {
  contactId: string;
  contactName: string;
  companyName: string | null;
  overdueCount: number;
  oldestOverdueDays: number;
  oldestDue: string;
  assignedTo: string;
  assignedToName: string;
}

export async function getSlippingContacts(): Promise<{
  data: SlippingContact[] | null;
  error: string | null;
}> {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get all overdue followups from V2 view
    const { data: followups, error: followupsError } = await supabase
      .from('v_followup_queue_all_v2')
      .select('id, due_at, contact_id, contact_name, company_name, user_id, user_name')
      .lt('due_at', startOfToday.toISOString());

    if (followupsError) {
      if (followupsError.message.includes('does not exist') || followupsError.code === '42P01') {
        return { data: [], error: null };
      }
      return { data: null, error: followupsError.message };
    }

    if (!followups || followups.length === 0) {
      return { data: [], error: null };
    }

    // Group by contact — v2 view provides contact_name, company_name, user_id, user_name directly
    const contactStats: Record<string, {
      count: number;
      oldestDue: Date;
      contactName: string;
      companyName: string | null;
      userId: string | null;
      userName: string;
    }> = {};

    followups.forEach((f: any) => {
      if (!contactStats[f.contact_id]) {
        contactStats[f.contact_id] = {
          count: 0,
          oldestDue: new Date(f.due_at),
          contactName: f.contact_name || 'Unknown',
          companyName: f.company_name || null,
          userId: f.user_id || null,
          userName: f.user_name || 'Unassigned',
        };
      }
      contactStats[f.contact_id].count++;
      const dueDate = new Date(f.due_at);
      if (dueDate < contactStats[f.contact_id].oldestDue) {
        contactStats[f.contact_id].oldestDue = dueDate;
      }
    });

    // Filter: 2+ overdue OR oldest overdue > 7 days
    const slippingContactIds = Object.keys(contactStats).filter((contactId) => {
      const stats = contactStats[contactId];
      return stats.count >= 2 || stats.oldestDue < sevenDaysAgo;
    });

    if (slippingContactIds.length === 0) {
      return { data: [], error: null };
    }

    const result: SlippingContact[] = slippingContactIds.map((contactId) => {
      const stats = contactStats[contactId];
      const daysDiff = Math.floor((startOfToday.getTime() - stats.oldestDue.getTime()) / (24 * 60 * 60 * 1000));

      return {
        contactId,
        contactName: stats.contactName,
        companyName: stats.companyName,
        overdueCount: stats.count,
        oldestOverdueDays: daysDiff,
        oldestDue: stats.oldestDue.toISOString(),
        assignedTo: stats.userId || '',
        assignedToName: stats.userName,
      };
    });

    // Sort by oldest overdue days desc
    result.sort((a, b) => b.oldestOverdueDays - a.oldestOverdueDays);

    return { data: result, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to load slipping contacts',
    };
  }
}

// Check if current user is admin
export async function checkIsAdmin(): Promise<{
  isAdmin: boolean;
  error: string | null;
}> {
  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !sessionData.session) {
      return { isAdmin: false, error: 'Not authenticated' };
    }

    const userId = sessionData.session.user.id;

    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      return { isAdmin: false, error: error.message };
    }

    const isAdmin = data?.role === 'ADMIN' || data?.role === 'CEO';
    return { isAdmin, error: null };
  } catch (err) {
    return {
      isAdmin: false,
      error: err instanceof Error ? err.message : 'Failed to check admin status',
    };
  }
}
