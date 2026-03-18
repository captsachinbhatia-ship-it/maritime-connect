-- Fix: contacts_select_restrict_to_admin_or_assignee was missing
-- the created_by_crm_user_id check. Because this is a RESTRICTIVE policy,
-- ALL restrictive policies must pass. Without the creator check, users who
-- created contacts but weren't yet assigned to them couldn't see those
-- contacts — causing the Daily Report "contacts added" count to show 0.

DROP POLICY IF EXISTS contacts_select_restrict_to_admin_or_assignee ON contacts;

CREATE POLICY contacts_select_restrict_to_admin_or_assignee
  ON contacts
  AS RESTRICTIVE
  FOR SELECT
  USING (
    is_admin()
    OR created_by_crm_user_id = current_crm_user_id()
    OR EXISTS (
      SELECT 1 FROM contact_assignments ca
      WHERE ca.contact_id = contacts.id
        AND ca.status = 'ACTIVE'
        AND ca.ended_at IS NULL
        AND ca.assigned_to_crm_user_id = current_crm_user_id()
    )
  );
