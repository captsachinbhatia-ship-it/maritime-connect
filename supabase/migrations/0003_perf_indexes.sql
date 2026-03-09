-- =============================================================================
-- MIGRATION 0003: Performance indexes
-- =============================================================================
-- All indexes use IF NOT EXISTS so this migration is safe to re-run.
-- Apply during a low-traffic window. None of these lock tables for writes
-- in PostgreSQL 11+ (CREATE INDEX CONCURRENTLY is preferred for large tables).
--
-- For large production tables (contacts, contact_assignments) use:
--   CREATE INDEX CONCURRENTLY IF NOT EXISTS ...
-- CONCURRENTLY cannot run inside a transaction block, so remove the
-- BEGIN/COMMIT wrappers if using that form.
--
-- Rollback (drop all indexes added here):
--   DROP INDEX IF EXISTS idx_crm_users_auth_user_id;
--   DROP INDEX IF EXISTS idx_contact_assignments_active_lookup;
--   DROP INDEX IF EXISTS idx_contacts_full_name_trgm;
--   DROP INDEX IF EXISTS idx_contact_import_staging_batch_id;
--
-- Verification:
--   SELECT indexname, indexdef FROM pg_indexes
--   WHERE tablename IN ('crm_users','contact_assignments','contacts','contact_import_staging')
--   AND indexname LIKE 'idx_%';
-- =============================================================================

-- ----------------------------------------------------------------
-- P1-4: crm_users.auth_user_id — unique index
-- ----------------------------------------------------------------
-- Every mutating service function does a live lookup:
--   SELECT id FROM crm_users WHERE auth_user_id = auth.uid()
-- Without an index this is a full table scan on every INSERT/UPDATE.
-- This should be UNIQUE — one CRM user per Google identity.
CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_users_auth_user_id
  ON crm_users (auth_user_id);

-- ----------------------------------------------------------------
-- P1-1: contact_assignments — partial composite index for active records
-- ----------------------------------------------------------------
-- Common query pattern across assignments.ts, adminAssignments.ts, assignPrimary.ts:
--   WHERE contact_id = $1 AND status = 'ACTIVE' AND ended_at IS NULL
--   [AND assignment_role = 'PRIMARY' | 'SECONDARY']
--
-- A partial index on status/ended_at eliminates the majority of CLOSED rows
-- from the index, keeping it small as history accumulates.
CREATE INDEX IF NOT EXISTS idx_contact_assignments_active_lookup
  ON contact_assignments (contact_id, assignment_role)
  WHERE status = 'ACTIVE' AND ended_at IS NULL;

-- ----------------------------------------------------------------
-- P1-2: contacts.full_name — trigram index for ILIKE search
-- ----------------------------------------------------------------
-- listContactsByStage() uses .ilike('full_name', '%search%').
-- Without pg_trgm a leading-wildcard ILIKE is a full table scan.
-- Requires the pg_trgm extension (enabled by default in Supabase).
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_contacts_full_name_trgm
  ON contacts USING gin (full_name gin_trgm_ops);

-- ----------------------------------------------------------------
-- P1-3: contact_import_staging.batch_id — B-tree index
-- ----------------------------------------------------------------
-- fetchStagingRows() and validateImportBatch() both filter by batch_id.
-- During a bulk import session this table is hit many times per batch.
CREATE INDEX IF NOT EXISTS idx_contact_import_staging_batch_id
  ON contact_import_staging (batch_id);
