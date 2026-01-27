import { supabase } from '@/lib/supabaseClient';
import type { Company } from '@/types';

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
