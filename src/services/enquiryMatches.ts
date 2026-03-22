import { supabase } from '@/lib/supabaseClient';

export interface EnquiryMatch {
  id: string;
  match_notes: string | null;
  matched_at: string;
  status: string;
  matched_by_user?: { full_name: string } | null;
  vessel_enq?: {
    id: string;
    enquiry_number: string;
    vessel_name: string | null;
    vessel_type: string | null;
    loading_port: string | null;
    laycan_from: string | null;
    contact?: { full_name: string } | null;
  } | null;
  cargo_enq?: {
    id: string;
    enquiry_number: string;
    cargo_type: string | null;
    quantity: number | null;
    quantity_unit: string | null;
    loading_port: string | null;
    discharge_port: string | null;
    laycan_from: string | null;
    laycan_to: string | null;
    contact?: { full_name: string } | null;
  } | null;
}

export async function fetchMatchedVessels(cargoEnquiryId: string): Promise<{ data: EnquiryMatch[] | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('enquiry_matches')
      .select(`
        id, match_notes, matched_at, status,
        matched_by_user:crm_users!enquiry_matches_matched_by_fkey (full_name),
        vessel_enq:enquiries!vessel_enquiry_id (
          id, enquiry_number, vessel_name, vessel_type,
          loading_port, laycan_from,
          contact:contacts!contact_id (full_name)
        )
      `)
      .eq('cargo_enquiry_id', cargoEnquiryId)
      .eq('status', 'ACTIVE')
      .order('matched_at', { ascending: false });

    if (error) return { data: null, error: error.message };
    return { data: data as unknown as EnquiryMatch[], error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function fetchMatchedCargoes(vesselEnquiryId: string): Promise<{ data: EnquiryMatch[] | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('enquiry_matches')
      .select(`
        id, match_notes, matched_at, status,
        matched_by_user:crm_users!enquiry_matches_matched_by_fkey (full_name),
        cargo_enq:enquiries!cargo_enquiry_id (
          id, enquiry_number, cargo_type, quantity, quantity_unit,
          loading_port, discharge_port, laycan_from, laycan_to,
          contact:contacts!contact_id (full_name)
        )
      `)
      .eq('vessel_enquiry_id', vesselEnquiryId)
      .eq('status', 'ACTIVE')
      .order('matched_at', { ascending: false });

    if (error) return { data: null, error: error.message };
    return { data: data as unknown as EnquiryMatch[], error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function fetchAvailableVessels(excludeIds: string[]): Promise<{ data: any[] | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('enquiries')
      .select(`
        id, enquiry_number, vessel_name, vessel_type,
        loading_port, laycan_from, laycan_to, notes,
        contact:contacts!contact_id (full_name)
      `)
      .in('enquiry_mode', ['TC', 'SNP'])
      .eq('is_draft', false)
      .is('deleted_at', null)
      .order('laycan_from', { ascending: true });

    if (error) return { data: null, error: error.message };
    const filtered = (data || []).filter((v: any) => !excludeIds.includes(v.id));
    return { data: filtered, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function fetchAvailableCargoes(excludeIds: string[]): Promise<{ data: any[] | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('enquiries')
      .select(`
        id, enquiry_number, cargo_type, quantity, quantity_unit,
        loading_port, discharge_port, laycan_from, laycan_to, notes,
        contact:contacts!contact_id (full_name)
      `)
      .in('enquiry_mode', ['SPOT', 'VOY', 'CVC', 'BB', 'CARGO_OPEN'])
      .eq('is_draft', false)
      .is('deleted_at', null)
      .order('laycan_from', { ascending: true });

    if (error) return { data: null, error: error.message };
    const filtered = (data || []).filter((c: any) => !excludeIds.includes(c.id));
    return { data: filtered, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function createMatch(cargoId: string, vesselId: string, notes: string | null, matchedBy: string): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.from('enquiry_matches').insert({
      cargo_enquiry_id: cargoId,
      vessel_enquiry_id: vesselId,
      match_notes: notes,
      matched_by: matchedBy,
      status: 'ACTIVE',
    });
    if (error) {
      if (error.message.includes('duplicate') || error.message.includes('unique')) {
        return { error: 'This vessel is already matched to this cargo enquiry.' };
      }
      return { error: error.message };
    }
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function removeMatch(matchId: string): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.from('enquiry_matches').update({ status: 'CANCELLED' }).eq('id', matchId);
    if (error) return { error: error.message };
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function updateMatchNotes(matchId: string, notes: string): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.from('enquiry_matches').update({ match_notes: notes }).eq('id', matchId);
    if (error) return { error: error.message };
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
