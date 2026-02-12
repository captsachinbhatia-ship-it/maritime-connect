import { supabase } from '@/lib/supabaseClient';
import { AssignmentStage } from '@/types/directory';

export interface DashboardMetrics {
  total: number;
  assigned: number;
  unassigned: number;
  byStage: Record<AssignmentStage, number>;
  byPrimaryOwner: Record<string, number>;
}

export async function fetchDashboardMetrics(): Promise<{ data: DashboardMetrics | null; error: string | null }> {
  const { data, error } = await supabase
    .from('v_directory_contacts')
    .select('primary_owner_id, primary_stage, is_unassigned');

  if (error) return { data: null, error: error.message };

  const rows = (data || []) as Array<{
    primary_owner_id: string | null;
    primary_stage: AssignmentStage | null;
    is_unassigned: boolean;
  }>;

  const byStage: Record<AssignmentStage, number> = {
    COLD_CALLING: 0,
    ASPIRATION: 0,
    ACHIEVEMENT: 0,
    INACTIVE: 0,
  };

  const byPrimaryOwner: Record<string, number> = {};

  let total = 0;
  let assigned = 0;
  let unassigned = 0;

  for (const r of rows) {
    total += 1;

    if (r.is_unassigned || !r.primary_owner_id) {
      unassigned += 1;
      byPrimaryOwner['UNASSIGNED'] = (byPrimaryOwner['UNASSIGNED'] || 0) + 1;
    } else {
      assigned += 1;
      byPrimaryOwner[r.primary_owner_id] = (byPrimaryOwner[r.primary_owner_id] || 0) + 1;
    }

    if (r.primary_stage && byStage[r.primary_stage] !== undefined) {
      byStage[r.primary_stage] += 1;
    }
  }

  return { data: { total, assigned, unassigned, byStage, byPrimaryOwner }, error: null };
}
