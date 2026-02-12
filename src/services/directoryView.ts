import { supabase } from '@/lib/supabaseClient';
import { DirectoryRow } from '@/types/directory';

const VIEW_COLUMNS = `
  id,
  full_name,
  email,
  company_id,
  company_name,
  created_at,
  created_by_crm_user_id,
  is_active,
  primary_owner_id,
  primary_stage,
  secondary_owner_id,
  is_unassigned
`;

export async function fetchDirectoryRows(): Promise<{ data: DirectoryRow[]; error: string | null }> {
  const { data, error } = await supabase
    .from('v_directory_contacts')
    .select(VIEW_COLUMNS)
    .order('created_at', { ascending: false });

  if (error) return { data: [], error: error.message };
  return { data: (data || []) as DirectoryRow[], error: null };
}

export async function fetchAssignedRows(): Promise<{ data: DirectoryRow[]; error: string | null }> {
  const { data, error } = await supabase
    .from('v_directory_contacts')
    .select(VIEW_COLUMNS)
    .not('primary_owner_id', 'is', null)
    .order('full_name', { ascending: true });

  if (error) return { data: [], error: error.message };
  return { data: (data || []) as DirectoryRow[], error: null };
}
