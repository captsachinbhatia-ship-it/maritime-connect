import { supabase } from '@/lib/supabaseClient';

const AUTO_SEQUENCE_KEY = 'aq-auto-cold-call-sequence';

/**
 * Check if auto-sequence creation is enabled (localStorage toggle).
 */
export function isAutoSequenceEnabled(): boolean {
  return localStorage.getItem(AUTO_SEQUENCE_KEY) !== 'false'; // default ON
}

/**
 * Toggle auto-sequence creation.
 */
export function setAutoSequenceEnabled(enabled: boolean): void {
  localStorage.setItem(AUTO_SEQUENCE_KEY, String(enabled));
}

/**
 * Create the 3-step cold call follow-up sequence for a newly assigned contact.
 * Only call this when stage is COLD_CALLING and auto-sequence is enabled.
 *
 * Returns null on success, or an error message on failure.
 */
export async function createColdCallSequence(params: {
  contactId: string;
  assignedTo: string;
  assignmentId: string;
}): Promise<string | null> {
  if (!isAutoSequenceEnabled()) return null;

  const { error } = await supabase.rpc('create_cold_call_sequence', {
    p_contact_id: params.contactId,
    p_assigned_to: params.assignedTo,
    p_assignment_id: params.assignmentId,
    p_start_date: new Date().toISOString(),
  });

  if (error) {
    console.error('[createColdCallSequence] RPC error:', error);
    return error.message;
  }

  return null;
}
