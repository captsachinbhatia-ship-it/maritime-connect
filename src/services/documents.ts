import { supabase } from '@/lib/supabaseClient';

export interface CrmDocument {
  id: string;
  title: string;
  category: string;
  description: string | null;
  drive_url: string | null;
  tags: string[];
  product: string | null;
  load_area: string | null;
  discharge_area: string | null;
  vessel_size: string | null;
  source_type: string | null;
  intel_notes: string | null;
  related_enquiry_id: string | null;
  related_company_id: string | null;
  uploaded_by: string | null;
  created_at: string;
  deleted_at: string | null;
  uploaded_by_user?: { full_name: string } | null;
  related_enquiry?: { enquiry_number: string; subject: string | null } | null;
  related_company?: { company_name: string } | null;
}

export async function fetchDocuments(): Promise<{ data: CrmDocument[] | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('crm_documents')
      .select(`
        id, title, category, description, tags, drive_url,
        product, load_area, discharge_area, vessel_size, source_type,
        related_enquiry_id, related_company_id,
        created_at, deleted_at,
        uploaded_by_user:crm_users!uploaded_by (full_name),
        related_enquiry:enquiries!related_enquiry_id (enquiry_number, subject),
        related_company:companies!related_company_id (company_name)
      `)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) return { data: null, error: error.message };
    return { data: data as unknown as CrmDocument[], error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function createDocument(doc: {
  title: string;
  category: string;
  description?: string | null;
  drive_url?: string | null;
  tags?: string[];
  product?: string | null;
  load_area?: string | null;
  discharge_area?: string | null;
  vessel_size?: string | null;
  source_type?: string | null;
  intel_notes?: string | null;
  related_enquiry_id?: string | null;
  related_company_id?: string | null;
  uploaded_by: string;
}): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.from('crm_documents').insert(doc);
    if (error) return { error: error.message };
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function updateDocument(id: string, updates: Partial<CrmDocument>): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.from('crm_documents').update(updates).eq('id', id);
    if (error) return { error: error.message };
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function softDeleteDocument(id: string): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.from('crm_documents').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    if (error) return { error: error.message };
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function fetchDocumentsForEnquiry(enquiryId: string): Promise<{ data: CrmDocument[] | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('crm_documents')
      .select('id, title, category, drive_url, created_at, uploaded_by_user:crm_users!uploaded_by(full_name)')
      .eq('related_enquiry_id', enquiryId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) return { data: null, error: error.message };
    return { data: data as unknown as CrmDocument[], error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function linkDocumentToEnquiry(docId: string, enquiryId: string): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.from('crm_documents').update({ related_enquiry_id: enquiryId }).eq('id', docId);
    if (error) return { error: error.message };
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
