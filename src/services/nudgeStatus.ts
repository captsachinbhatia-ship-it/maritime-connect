import { supabase } from '@/lib/supabaseClient';

export interface NudgeStatus {
  hasActiveNudge: boolean;
  lastNudgeAt: string | null;
}

/**
 * Checks if a contact has an active nudge (unacknowledged backup request).
 * A nudge is active if:
 * - There's an interaction with subject starting with "[NUDGE]"
 * - There's no "[ACK]" interaction after the last "[NUDGE]"
 */
export async function getNudgeStatus(contactId: string): Promise<{
  data: NudgeStatus | null;
  error: string | null;
}> {
  try {
    // Get the most recent NUDGE or ACK interaction
    const { data, error } = await supabase
      .from('v_interaction_timeline_v2')
      .select('subject, interaction_at')
      .eq('contact_id', contactId)
      .or('subject.ilike.[NUDGE]%,subject.ilike.[ACK]%')
      .order('interaction_at', { ascending: false })
      .limit(1);

    if (error) {
      return { data: null, error: error.message };
    }

    if (!data || data.length === 0) {
      return {
        data: { hasActiveNudge: false, lastNudgeAt: null },
        error: null,
      };
    }

    const latest = data[0];
    const subject = (latest.subject || '').toUpperCase();

    // If the latest is a NUDGE (not ACK), there's an active nudge
    if (subject.startsWith('[NUDGE]')) {
      return {
        data: { hasActiveNudge: true, lastNudgeAt: latest.interaction_at },
        error: null,
      };
    }

    // If the latest is an ACK, the nudge has been acknowledged
    return {
      data: { hasActiveNudge: false, lastNudgeAt: null },
      error: null,
    };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to check nudge status',
    };
  }
}

/**
 * Batch check nudge status for multiple contacts.
 * Returns a map of contactId -> hasActiveNudge
 */
export async function getNudgeStatusMap(contactIds: string[]): Promise<{
  data: Record<string, boolean> | null;
  error: string | null;
}> {
  if (contactIds.length === 0) {
    return { data: {}, error: null };
  }

  try {
    // Get all NUDGE/ACK interactions for the contacts
    const { data, error } = await supabase
      .from('v_interaction_timeline_v2')
      .select('contact_id, subject, interaction_at')
      .in('contact_id', contactIds)
      .or('subject.ilike.[NUDGE]%,subject.ilike.[ACK]%')
      .order('interaction_at', { ascending: false });

    if (error) {
      return { data: null, error: error.message };
    }

    // For each contact, find the most recent NUDGE/ACK
    const statusMap: Record<string, boolean> = {};
    const seenContacts = new Set<string>();

    // Data is ordered by interaction_at desc, so first occurrence per contact is the latest
    for (const row of data || []) {
      if (seenContacts.has(row.contact_id)) continue;
      seenContacts.add(row.contact_id);

      const subject = (row.subject || '').toUpperCase();
      statusMap[row.contact_id] = subject.startsWith('[NUDGE]');
    }

    // Contacts with no NUDGE/ACK interactions have no active nudge
    for (const contactId of contactIds) {
      if (!(contactId in statusMap)) {
        statusMap[contactId] = false;
      }
    }

    return { data: statusMap, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to check nudge statuses',
    };
  }
}
