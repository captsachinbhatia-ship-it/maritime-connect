-- =============================================================================
-- MIGRATION 0004: Backfill contact_phones from contacts.phone (legacy field)
-- =============================================================================
-- Problem: Older contacts were created before the contact_phones table existed.
-- They only have data in contacts.phone (a flat text field). The
-- contacts_with_primary_phone view and all phone display logic now reads from
-- contact_phones first, falling back to contacts.phone. Contacts with no
-- contact_phones row show blank phone in the UI.
--
-- This migration inserts a PRIMARY phone row in contact_phones for every
-- contact that has contacts.phone but no existing contact_phones row.
-- It is idempotent — safe to re-run.
--
-- Rollback:
--   -- Remove backfilled rows (those created by this migration are marked
--   -- with a comment in notes; alternatively track by created_at timestamp).
--   DELETE FROM contact_phones
--   WHERE id IN (
--     SELECT cp.id FROM contact_phones cp
--     JOIN contacts c ON c.id = cp.contact_id
--     WHERE cp.phone_type = 'primary'
--       AND cp.phone = c.phone        -- same value as legacy field
--       AND cp.created_at >= '<migration_run_timestamp>'
--   );
--
-- Pre-flight check (run this first to see scope):
--   SELECT COUNT(*) AS contacts_needing_backfill
--   FROM contacts c
--   WHERE c.phone IS NOT NULL
--     AND c.phone <> ''
--     AND NOT EXISTS (
--       SELECT 1 FROM contact_phones cp WHERE cp.contact_id = c.id
--     );
--
-- Verification (run after):
--   SELECT
--     (SELECT COUNT(*) FROM contacts WHERE phone IS NOT NULL AND phone <> '') AS contacts_with_legacy_phone,
--     (SELECT COUNT(DISTINCT contact_id) FROM contact_phones WHERE phone_type = 'primary') AS contacts_with_phone_row,
--     (SELECT COUNT(*) FROM contacts c
--      WHERE c.phone IS NOT NULL AND c.phone <> ''
--        AND NOT EXISTS (SELECT 1 FROM contact_phones cp WHERE cp.contact_id = c.id)
--     ) AS remaining_gap;
--   -- remaining_gap should be 0 after this migration.
-- =============================================================================

INSERT INTO contact_phones (contact_id, phone, country_code, phone_type, is_primary)
SELECT
  c.id          AS contact_id,
  c.phone       AS phone,
  c.country_code AS country_code,
  'primary'     AS phone_type,
  true          AS is_primary
FROM contacts c
WHERE
  c.phone IS NOT NULL
  AND c.phone <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM contact_phones cp
    WHERE cp.contact_id = c.id
  );

-- Log how many rows were inserted
DO $$
DECLARE
  inserted_count integer;
BEGIN
  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RAISE NOTICE 'contact_phones backfill: % rows inserted', inserted_count;
END $$;
