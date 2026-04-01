export type AssignmentStage =
  | 'COLD_CALLING'
  | 'TARGETING'
  | 'ASPIRATION'
  | 'ACHIEVEMENT';

export interface DirectoryRow {
  id: string;
  full_name: string | null;
  email: string | null;
  designation: string | null;
  phone: string | null;
  company_id: string | null;
  company_name: string | null;
  created_at: string | null;
  created_by_crm_user_id: string | null;
  is_active: boolean | null;

  primary_owner_id: string | null;
  primary_stage: AssignmentStage | null;
  secondary_owner_id: string | null;

  is_unassigned: boolean;
}
