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

    // Get overdue followups with assignment info
    const { data: followups, error: followupsError } = await supabase
      .from('contact_followups')
      .select('id, due_at, assignment_id')
      .eq('status', 'OPEN')
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

    // Get assignment IDs
    const assignmentIds = [...new Set(followups.map((f) => f.assignment_id).filter(Boolean))];

    if (assignmentIds.length === 0) {
      return { data: [], error: null };
    }

    // Fetch assignments to get assigned_to_crm_user_id (caller)
    const { data: assignments, error: assignmentsError } = await supabase
      .from('contact_assignments')
      .select('id, assigned_to_crm_user_id')
      .in('id', assignmentIds);

    if (assignmentsError) {
      return { data: null, error: assignmentsError.message };
    }

    // Build assignment -> caller map
    const assignmentCallerMap: Record<string, string> = {};
    (assignments || []).forEach((a) => {
      if (a.assigned_to_crm_user_id) {
        assignmentCallerMap[a.id] = a.assigned_to_crm_user_id;
      }
    });

    // Group by caller
    const callerStats: Record<string, { count: number; oldestDue: Date }> = {};
    followups.forEach((f) => {
      const callerId = f.assignment_id ? assignmentCallerMap[f.assignment_id] : null;
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
    const { data: assignments, error: assignmentsError } = await supabase
      .from('contact_assignments')
      .select('id, contact_id')
      .eq('assigned_to_crm_user_id', callerId);

    if (assignmentsError) {
      return { data: null, error: assignmentsError.message };
    }

    if (!assignments || assignments.length === 0) {
      return { data: [], error: null };
    }

    const assignmentIds = assignments.map((a) => a.id);
    const contactMap: Record<string, string> = {};
    assignments.forEach((a) => {
      contactMap[a.id] = a.contact_id;
    });

    // Get overdue followups for these assignments
    const { data: followups, error: followupsError } = await supabase
      .from('contact_followups')
      .select('id, due_at, contact_id, assignment_id, followup_type, followup_reason')
      .eq('status', 'OPEN')
      .lt('due_at', startOfToday.toISOString())
      .in('assignment_id', assignmentIds)
      .order('due_at', { ascending: true });

    if (followupsError) {
      return { data: null, error: followupsError.message };
    }

    if (!followups || followups.length === 0) {
      return { data: [], error: null };
    }

    // Fetch contact names
    const contactIds = [...new Set(followups.map((f) => f.contact_id))];
    const { data: contacts, error: contactsError } = await supabase
      .from('contacts')
      .select('id, full_name, company_id')
      .in('id', contactIds);

    if (contactsError) {
      return { data: null, error: contactsError.message };
    }

    // Fetch company names
    const companyIds = (contacts || [])
      .map((c) => c.company_id)
      .filter((id): id is string => id !== null);

    let companyNames: Record<string, string> = {};
    if (companyIds.length > 0) {
      const { data: companies } = await supabase
        .from('companies')
        .select('id, company_name')
        .in('id', companyIds);

      (companies || []).forEach((c) => {
        companyNames[c.id] = c.company_name;
      });
    }

    // Build contact info map
    const contactInfoMap: Record<string, { name: string; company: string | null }> = {};
    (contacts || []).forEach((c) => {
      contactInfoMap[c.id] = {
        name: c.full_name || 'Unknown',
        company: c.company_id ? companyNames[c.company_id] || null : null,
      };
    });

    // Build result
    const result: CallerFollowupDrilldown[] = followups.map((f) => ({
      id: f.id,
      dueAt: f.due_at,
      contactName: contactInfoMap[f.contact_id]?.name || 'Unknown',
      companyName: contactInfoMap[f.contact_id]?.company || null,
      followupType: f.followup_type,
      followupReason: f.followup_reason,
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

    // Get all overdue followups
    const { data: followups, error: followupsError } = await supabase
      .from('contact_followups')
      .select('id, due_at, contact_id, assignment_id')
      .eq('status', 'OPEN')
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

    // Group by contact
    const contactStats: Record<string, { count: number; oldestDue: Date; assignmentId: string | null }> = {};
    followups.forEach((f) => {
      if (!contactStats[f.contact_id]) {
        contactStats[f.contact_id] = {
          count: 0,
          oldestDue: new Date(f.due_at),
          assignmentId: f.assignment_id,
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

    // Fetch contact info
    const { data: contacts, error: contactsError } = await supabase
      .from('contacts')
      .select('id, full_name, company_id')
      .in('id', slippingContactIds);

    if (contactsError) {
      return { data: null, error: contactsError.message };
    }

    // Fetch company names
    const companyIds = (contacts || [])
      .map((c) => c.company_id)
      .filter((id): id is string => id !== null);

    let companyNames: Record<string, string> = {};
    if (companyIds.length > 0) {
      const { data: companies } = await supabase
        .from('companies')
        .select('id, company_name')
        .in('id', companyIds);

      (companies || []).forEach((c) => {
        companyNames[c.id] = c.company_name;
      });
    }

    // Fetch assignment info (assigned_to_crm_user_id)
    const assignmentIds = [...new Set(
      slippingContactIds
        .map((cid) => contactStats[cid].assignmentId)
        .filter((id): id is string => id !== null)
    )];

    let assignmentUserMap: Record<string, string> = {};
    if (assignmentIds.length > 0) {
      const { data: assignments } = await supabase
        .from('contact_assignments')
        .select('id, assigned_to_crm_user_id')
        .in('id', assignmentIds);

      (assignments || []).forEach((a) => {
        if (a.assigned_to_crm_user_id) {
          assignmentUserMap[a.id] = a.assigned_to_crm_user_id;
        }
      });
    }

    // Fetch user names from crm_users
    const userIds = [...new Set(Object.values(assignmentUserMap))];
    let userNameMap: Record<string, string> = {};
    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from('crm_users')
        .select('id, full_name, email')
        .in('id', userIds);

      (users || []).forEach((u) => {
        userNameMap[u.id] = u.full_name || u.email || 'Unknown';
      });
    }

    // Build result
    const contactInfoMap: Record<string, { name: string; company: string | null }> = {};
    (contacts || []).forEach((c) => {
      contactInfoMap[c.id] = {
        name: c.full_name || 'Unknown',
        company: c.company_id ? companyNames[c.company_id] || null : null,
      };
    });

    const result: SlippingContact[] = slippingContactIds.map((contactId) => {
      const stats = contactStats[contactId];
      const assignedToId = stats.assignmentId ? assignmentUserMap[stats.assignmentId] : null;
      const daysDiff = Math.floor((startOfToday.getTime() - stats.oldestDue.getTime()) / (24 * 60 * 60 * 1000));

      return {
        contactId,
        contactName: contactInfoMap[contactId]?.name || 'Unknown',
        companyName: contactInfoMap[contactId]?.company || null,
        overdueCount: stats.count,
        oldestOverdueDays: daysDiff,
        oldestDue: stats.oldestDue.toISOString(),
        assignedTo: assignedToId || '',
        assignedToName: assignedToId ? userNameMap[assignedToId] || 'Unknown' : 'Unassigned',
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
