-- =============================================================================
-- MIGRATION 0005: Fix tg_contact_assignments_defaults trigger
-- =============================================================================
-- The trigger referenced NEW.assigned_to and NEW.assigned_by which do not
-- exist as columns on contact_assignments (the real columns are
-- assigned_to_crm_user_id and assigned_by_crm_user_id). This caused:
--   ERROR: record "new" has no field "assigned_to"
-- on every INSERT into contact_assignments (i.e. every assign-contact action).
--
-- Fix: remove the dead sync blocks for the non-existent alias columns.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.tg_contact_assignments_defaults()
RETURNS trigger
LANGUAGE plpgsql
AS $$
begin
  -- Set assigned_by_crm_user_id from session if not supplied
  if new.assigned_by_crm_user_id is null then
    new.assigned_by_crm_user_id := public.current_crm_user_id();
  end if;

  if new.assigned_at is null then
    new.assigned_at := now();
  end if;

  -- Normalize role and default if missing
  if new.assignment_role is null then
    new.assignment_role := 'primary';
  else
    new.assignment_role := lower(new.assignment_role);
  end if;

  return new;
end;
$$;
