import { supabase } from '@/lib/supabaseClient';
import type { Company, CompanyFilters, CreateCompanyPayload } from '@/types';

export async function getCompaniesPreview(): Promise<{
  data: Company[] | null;
  error: string | null;
}> {
  try {
    const { data, error } = await supabase
      .from('companies')
      .select('id, company_name')
      .limit(5);

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as Company[], error: null };
  } catch (err) {
    return { 
      data: null, 
      error: err instanceof Error ? err.message : 'Unknown error occurred' 
    };
  }
}

export async function listCompanies(filters: CompanyFilters = {}): Promise<{
  data: Company[] | null;
  error: string | null;
}> {
  try {
    let query = supabase
      .from('companies')
      .select('id, company_name, company_type, company_type_other_text, country, city, region, website, email_general, phone_general, board_line, status, notes, is_active, updated_at')
      .order('company_name', { ascending: true });

    // Apply search filter (case-insensitive)
    if (filters.search && filters.search.trim()) {
      query = query.ilike('company_name', `%${filters.search.trim()}%`);
    }

    // Apply company_type filter
    if (filters.company_type && filters.company_type !== 'all') {
      query = query.eq('company_type', filters.company_type);
    }

    // Apply status filter
    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    // Apply region filter
    if (filters.region && filters.region !== 'all') {
      query = query.eq('region', filters.region);
    }

    const { data, error } = await query;

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as Company[], error: null };
  } catch (err) {
    return { 
      data: null, 
      error: err instanceof Error ? err.message : 'Unknown error occurred' 
    };
  }
}

export async function checkDuplicateCompanyName(companyName: string): Promise<{
  isDuplicate: boolean;
  matchedCompanyName: string | null;
  error: string | null;
}> {
  try {
    const normalizedName = companyName.trim().toLowerCase();
    
    const { data, error } = await supabase
      .from('companies')
      .select('company_name')
      .ilike('company_name', normalizedName)
      .limit(1);

    if (error) {
      return { isDuplicate: false, matchedCompanyName: null, error: error.message };
    }

    if (data && data.length > 0) {
      return { 
        isDuplicate: true, 
        matchedCompanyName: data[0].company_name, 
        error: null 
      };
    }

    return { isDuplicate: false, matchedCompanyName: null, error: null };
  } catch (err) {
    return { 
      isDuplicate: false, 
      matchedCompanyName: null, 
      error: err instanceof Error ? err.message : 'Unknown error occurred' 
    };
  }
}

export async function createCompany(payload: CreateCompanyPayload): Promise<{
  data: Company | null;
  error: string | null;
}> {
  try {
    const { data, error } = await supabase
      .from('companies')
      .insert({
        company_name: payload.company_name.trim(),
        company_type: payload.company_type,
          company_type_other_text: payload.company_type_other_text || null,
          board_line: payload.board_line || null,
        country: payload.country || null,
        city: payload.city || null,
        region: payload.region || null,
        website: payload.website || null,
        email_general: payload.email_general || null,
        phone_general: payload.phone_general || null,
        status: payload.status || null,
        notes: payload.notes || null,
        is_active: payload.is_active ?? true,
      })
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as Company, error: null };
  } catch (err) {
    return { 
      data: null, 
      error: err instanceof Error ? err.message : 'Unknown error occurred' 
    };
  }
}

export async function getContactsCountByCompanyIds(companyIds: string[]): Promise<{
  data: Record<string, number> | null;
  error: string | null;
}> {
  try {
    if (companyIds.length === 0) {
      return { data: {}, error: null };
    }

    const { data, error } = await supabase
      .from('contacts')
      .select('company_id')
      .in('company_id', companyIds);

    if (error) {
      return { data: null, error: error.message };
    }

    // Count contacts per company
    const countMap: Record<string, number> = {};
    companyIds.forEach(id => { countMap[id] = 0; });
    
    if (data) {
      data.forEach(contact => {
        if (contact.company_id) {
          countMap[contact.company_id] = (countMap[contact.company_id] || 0) + 1;
        }
      });
    }

    return { data: countMap, error: null };
  } catch (err) {
    return { 
      data: null, 
      error: err instanceof Error ? err.message : 'Unknown error occurred' 
    };
  }
}

export async function getDistinctFilterValues(): Promise<{
  companyTypes: string[];
  statuses: string[];
  regions: string[];
  error: string | null;
}> {
  try {
    const { data, error } = await supabase
      .from('companies')
      .select('company_type, status, region');

    if (error) {
      return { companyTypes: [], statuses: [], regions: [], error: error.message };
    }

    const companyTypes = [...new Set(data?.map(c => c.company_type).filter(Boolean) as string[])].sort();
    const statuses = [...new Set(data?.map(c => c.status).filter(Boolean) as string[])].sort();
    const regions = [...new Set(data?.map(c => c.region).filter(Boolean) as string[])].sort();

    return { companyTypes, statuses, regions, error: null };
  } catch (err) {
    return { 
      companyTypes: [], 
      statuses: [], 
      regions: [], 
      error: err instanceof Error ? err.message : 'Unknown error occurred' 
    };
  }
}
