import { supabase } from '@/lib/supabaseClient';

// ─── Types ───────────────────────────────────────────────────────────

export type EnquiryStatus = 'NEW' | 'IN_PROGRESS' | 'QUOTED' | 'NEGOTIATING' | 'WON' | 'LOST' | 'CANCELLED' | 'ON_HOLD';
export type EnquiryPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type EnquiryMode = 'CARGO_OPEN' | 'VESSEL_OPEN' | 'GENERAL';
export type QuoteStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'REVISED';

export interface EnquiryFeedRow {
  id: string;
  enquiry_number: string;
  subject: string | null;
  status: EnquiryStatus;
  priority: EnquiryPriority | null;
  enquiry_type: string | null;
  contact_id: string | null;
  contact_name: string | null;
  company_name: string | null;
  updated_at: string | null;
  created_at: string | null;
  // Mode derivation fields
  cargo_type: string | null;
  quantity: number | null;
  loading_port: string | null;
  discharge_port: string | null;
  laycan_from: string | null;
  laycan_to: string | null;
  vessel_name: string | null;
  vessel_type: string | null;
}

export interface EnquiryPipelineRow extends EnquiryFeedRow {
  assigned_to: string | null;
  assigned_to_name: string | null;
  quantity_unit: string | null;
  budget_min: number | null;
  budget_max: number | null;
  currency: string | null;
  quote_count: number | null;
  last_quote_sent: string | null;
  days_open: number | null;
  description: string | null;
}

export interface EnquiryDetail {
  id: string;
  enquiry_number: string;
  contact_id: string | null;
  company_id: string | null;
  subject: string | null;
  description: string | null;
  enquiry_type: string | null;
  status: EnquiryStatus;
  priority: EnquiryPriority | null;
  vessel_type: string | null;
  vessel_name: string | null;
  cargo_type: string | null;
  quantity: number | null;
  quantity_unit: string | null;
  loading_port: string | null;
  discharge_port: string | null;
  laycan_from: string | null;
  laycan_to: string | null;
  budget_min: number | null;
  budget_max: number | null;
  currency: string | null;
  win_probability: number | null;
  expected_close_date: string | null;
  estimated_value: number | null;
  actual_value: number | null;
  lost_reason: string | null;
  lost_to_competitor: string | null;
  cancellation_reason: string | null;
  received_via: string | null;
  source_details: string | null;
  tags: string[] | null;
  notes: string | null;
  assigned_to: string | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface EnquiryQuote {
  id: string;
  enquiry_id: string;
  quote_number: string | null;
  version: number | null;
  status: QuoteStatus;
  rate: number | null;
  rate_unit: string | null;
  base_amount: number | null;
  additional_charges: number | null;
  total_amount: number | null;
  currency: string | null;
  vessel_name: string | null;
  vessel_imo: string | null;
  vessel_dwt: number | null;
  validity_date: string | null;
  payment_terms: string | null;
  laycan_from: string | null;
  laycan_to: string | null;
  special_conditions: string | null;
  terms: string | null;
  sent_at: string | null;
  sent_via: string | null;
  sent_message: string | null;
  sent_by_crm_user_id: string | null;
  sent_to_contact_id: string | null;
  accepted_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface EnquiryActivity {
  id: string;
  enquiry_id: string;
  activity_type: string;
  description: string | null;
  metadata: Record<string, unknown> | null;
  created_by: string | null;
  created_at: string | null;
  creator_name?: string | null;
}

export interface CreateQuotePayload {
  enquiry_id: string;
  status: QuoteStatus;
  rate?: number | null;
  rate_unit?: string | null;
  base_amount?: number | null;
  additional_charges?: number | null;
  total_amount?: number | null;
  currency?: string | null;
  vessel_name?: string | null;
  vessel_imo?: string | null;
  vessel_dwt?: number | null;
  validity_date?: string | null;
  payment_terms?: string | null;
  laycan_from?: string | null;
  laycan_to?: string | null;
  special_conditions?: string | null;
  terms?: string | null;
  sent_via?: string | null;
  sent_message?: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────

export function deriveEnquiryMode(row: {
  cargo_type?: string | null;
  quantity?: number | null;
  loading_port?: string | null;
  discharge_port?: string | null;
  laycan_from?: string | null;
  laycan_to?: string | null;
  vessel_name?: string | null;
  vessel_type?: string | null;
}): EnquiryMode {
  const hasCargoFields = !!(row.cargo_type || row.quantity || row.loading_port || row.discharge_port || row.laycan_from || row.laycan_to);
  const hasVesselFields = !!(row.vessel_name || row.vessel_type);

  if (hasCargoFields) return 'CARGO_OPEN';
  if (hasVesselFields) return 'VESSEL_OPEN';
  return 'GENERAL';
}

// ─── Feed (All Enquiries) ────────────────────────────────────────────

export async function fetchEnquiryFeed(page: number = 0, pageSize: number = 50): Promise<{
  data: EnquiryFeedRow[] | null;
  error: string | null;
  hasMore: boolean;
}> {
  try {
    const from = page * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await supabase
      .from('enquiry_feed')
      .select('*', { count: 'exact' })
      .order('updated_at', { ascending: false })
      .range(from, to);

    if (error) {
      return { data: null, error: error.message, hasMore: false };
    }

    return {
      data: (data || []) as EnquiryFeedRow[],
      error: null,
      hasMore: (count || 0) > from + pageSize,
    };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Unknown error', hasMore: false };
  }
}

// ─── Pipeline (My Enquiries) ─────────────────────────────────────────

export async function fetchEnquiryPipeline(filters?: {
  statuses?: string[];
  mode?: EnquiryMode | null;
  assignedToMe?: boolean;
  crmUserId?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<{
  data: EnquiryPipelineRow[] | null;
  error: string | null;
}> {
  try {
    let query = supabase
      .from('v_enquiry_pipeline')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.statuses && filters.statuses.length > 0) {
      query = query.in('status', filters.statuses);
    }

    if (filters?.assignedToMe && filters?.crmUserId) {
      query = query.eq('assigned_to', filters.crmUserId);
    }

    if (filters?.search) {
      const term = `%${filters.search}%`;
      query = query.or(
        `enquiry_number.ilike.${term},subject.ilike.${term},contact_name.ilike.${term},company_name.ilike.${term},vessel_name.ilike.${term},cargo_type.ilike.${term},loading_port.ilike.${term},discharge_port.ilike.${term}`
      );
    }

    if (filters?.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }
    if (filters?.dateTo) {
      query = query.lte('created_at', filters.dateTo);
    }

    const { data, error } = await query;

    if (error) {
      return { data: null, error: error.message };
    }

    // Client-side mode filter
    let filtered = (data || []) as EnquiryPipelineRow[];
    if (filters?.mode) {
      filtered = filtered.filter(row => deriveEnquiryMode(row) === filters.mode);
    }

    return { data: filtered, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// ─── Detail ──────────────────────────────────────────────────────────

export async function fetchEnquiryDetail(id: string): Promise<{
  data: EnquiryDetail | null;
  error: string | null;
}> {
  try {
    const { data, error } = await supabase
      .from('enquiries')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as EnquiryDetail | null, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function updateEnquiry(id: string, updates: Partial<EnquiryDetail>): Promise<{
  error: string | null;
}> {
  try {
    const { error } = await supabase
      .from('enquiries')
      .update(updates)
      .eq('id', id);

    if (error) {
      if (error.message.includes('row-level security')) {
        return { error: 'Not permitted by access policy.' };
      }
      return { error: error.message };
    }

    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// ─── Quotes ──────────────────────────────────────────────────────────

export async function fetchEnquiryQuotes(enquiryId: string): Promise<{
  data: EnquiryQuote[] | null;
  error: string | null;
}> {
  try {
    const { data, error } = await supabase
      .from('enquiry_quotes')
      .select('*')
      .eq('enquiry_id', enquiryId)
      .order('created_at', { ascending: false });

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: (data || []) as EnquiryQuote[], error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function createEnquiryQuote(payload: CreateQuotePayload, crmUserId: string, contactId?: string | null): Promise<{
  data: EnquiryQuote | null;
  error: string | null;
}> {
  try {
    const insertData: Record<string, unknown> = {
      enquiry_id: payload.enquiry_id,
      status: payload.status,
      created_by: crmUserId,
      rate: payload.rate || null,
      rate_unit: payload.rate_unit || null,
      base_amount: payload.base_amount || null,
      additional_charges: payload.additional_charges || null,
      total_amount: payload.total_amount || null,
      currency: payload.currency || 'USD',
      vessel_name: payload.vessel_name || null,
      vessel_imo: payload.vessel_imo || null,
      vessel_dwt: payload.vessel_dwt || null,
      validity_date: payload.validity_date || null,
      payment_terms: payload.payment_terms || null,
      laycan_from: payload.laycan_from || null,
      laycan_to: payload.laycan_to || null,
      special_conditions: payload.special_conditions || null,
      terms: payload.terms || null,
      sent_via: payload.sent_via || null,
      sent_message: payload.sent_message || null,
    };

    if (payload.status === 'SENT') {
      insertData.sent_at = new Date().toISOString();
      insertData.sent_by_crm_user_id = crmUserId;
      insertData.sent_to_contact_id = contactId || null;
    }

    const { data, error } = await supabase
      .from('enquiry_quotes')
      .insert(insertData)
      .select()
      .maybeSingle();

    if (error) {
      if (error.message.includes('row-level security')) {
        return { data: null, error: 'Not permitted by access policy.' };
      }
      return { data: null, error: error.message };
    }

    return { data: data as EnquiryQuote, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function updateQuoteStatus(quoteId: string, status: QuoteStatus, extra?: {
  rejection_reason?: string;
  sent_by_crm_user_id?: string;
}): Promise<{ error: string | null }> {
  try {
    const updates: Record<string, unknown> = { status };

    if (status === 'SENT') {
      updates.sent_at = new Date().toISOString();
      if (extra?.sent_by_crm_user_id) updates.sent_by_crm_user_id = extra.sent_by_crm_user_id;
    } else if (status === 'ACCEPTED') {
      updates.accepted_at = new Date().toISOString();
    } else if (status === 'REJECTED') {
      updates.rejected_at = new Date().toISOString();
      if (extra?.rejection_reason) updates.rejection_reason = extra.rejection_reason;
    }

    const { error } = await supabase
      .from('enquiry_quotes')
      .update(updates)
      .eq('id', quoteId);

    if (error) {
      if (error.message.includes('row-level security')) {
        return { error: 'Not permitted by access policy.' };
      }
      return { error: error.message };
    }

    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// ─── Activities ──────────────────────────────────────────────────────

export async function fetchEnquiryActivities(enquiryId: string): Promise<{
  data: EnquiryActivity[] | null;
  error: string | null;
}> {
  try {
    const { data, error } = await supabase
      .from('enquiry_activities')
      .select('*')
      .eq('enquiry_id', enquiryId)
      .order('created_at', { ascending: false });

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: (data || []) as EnquiryActivity[], error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function addEnquiryNote(enquiryId: string, description: string, crmUserId: string): Promise<{
  error: string | null;
}> {
  try {
    const { error } = await supabase
      .from('enquiry_activities')
      .insert({
        enquiry_id: enquiryId,
        activity_type: 'NOTE_ADDED',
        description,
        created_by: crmUserId,
      });

    if (error) {
      if (error.message.includes('row-level security')) {
        return { error: 'Not permitted by access policy.' };
      }
      return { error: error.message };
    }

    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// ─── Create Enquiry (from Contact page) ──────────────────────────────

export async function createEnquiry(payload: {
  contact_id: string;
  enquiry_type: string;
  subject: string;
  description?: string;
  priority?: EnquiryPriority;
  estimated_value?: number;
  vessel_type?: string;
  cargo_type?: string;
  loading_port?: string;
  discharge_port?: string;
  laycan_from?: string;
  laycan_to?: string;
}): Promise<{
  data: { id: string; enquiry_number: string } | null;
  error: string | null;
}> {
  try {
    // Try RPC first
    const { data: rpcData, error: rpcError } = await supabase.rpc('create_enquiry', {
      p_contact_id: payload.contact_id,
      p_enquiry_type: payload.enquiry_type,
      p_subject: payload.subject,
      p_description: payload.description || null,
      p_estimated_value: payload.estimated_value || null,
      p_priority: payload.priority || 'MEDIUM',
      p_vessel_type: payload.vessel_type || null,
      p_cargo_type: payload.cargo_type || null,
    });

    if (!rpcError && rpcData) {
      return { data: rpcData as { id: string; enquiry_number: string }, error: null };
    }

    // Fallback: direct insert
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      return { data: null, error: 'No authenticated session.' };
    }

    const { data: crmUser } = await supabase
      .from('crm_users')
      .select('id')
      .eq('auth_user_id', sessionData.session.user.id)
      .maybeSingle();

    // Get contact's company_id
    const { data: contact } = await supabase
      .from('contacts')
      .select('company_id')
      .eq('id', payload.contact_id)
      .maybeSingle();

    const { data, error } = await supabase
      .from('enquiries')
      .insert({
        contact_id: payload.contact_id,
        company_id: contact?.company_id || null,
        enquiry_type: payload.enquiry_type,
        subject: payload.subject,
        description: payload.description || null,
        priority: payload.priority || 'MEDIUM',
        estimated_value: payload.estimated_value || null,
        vessel_type: payload.vessel_type || null,
        cargo_type: payload.cargo_type || null,
        loading_port: payload.loading_port || null,
        discharge_port: payload.discharge_port || null,
        laycan_from: payload.laycan_from || null,
        laycan_to: payload.laycan_to || null,
        status: 'NEW',
        assigned_to: crmUser?.id || null,
        created_by: crmUser?.id || null,
      })
      .select('id, enquiry_number')
      .single();

    if (error) {
      if (error.message.includes('row-level security')) {
        return { data: null, error: 'Not permitted by access policy.' };
      }
      return { data: null, error: error.message };
    }

    return { data: data as { id: string; enquiry_number: string }, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// ─── Fetch enquiries for a contact (for linking) ─────────────────────

export async function fetchEnquiriesForContact(contactId: string): Promise<{
  data: { id: string; enquiry_number: string; subject: string | null }[] | null;
  error: string | null;
}> {
  try {
    const { data, error } = await supabase
      .from('enquiries')
      .select('id, enquiry_number, subject')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false });

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data || [], error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// ─── Update enquiry status (quick action) ────────────────────────────

export async function updateEnquiryStatus(enquiryId: string, status: EnquiryStatus): Promise<{
  error: string | null;
}> {
  return updateEnquiry(enquiryId, { status } as Partial<EnquiryDetail>);
}
