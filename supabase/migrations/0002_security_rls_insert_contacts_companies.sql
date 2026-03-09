-- =============================================================================
-- MIGRATION 0002: Fix RLS INSERT policies on contacts and companies
-- =============================================================================
-- Problem: Non-admin authenticated users cannot INSERT into contacts or
-- companies. This silently breaks bulk import and the Add Contact modal for
-- all non-admin users.
--
-- Root cause: The existing INSERT policies either do not exist or are scoped
-- to is_admin() only.
--
-- Fix: Allow any authenticated user who has a valid crm_users row to INSERT.
-- The crm_users check ensures the caller has been properly bootstrapped via
-- link_google_user_to_crm_user (i.e. they are an @aqmaritime.com employee).
--
-- Rollback:
--   DROP POLICY IF EXISTS "crm_users_can_insert_contacts" ON contacts;
--   DROP POLICY IF EXISTS "crm_users_can_insert_companies" ON companies;
--   -- Then re-apply the previous admin-only policy if it existed.
--
-- Verification:
--   Log in as a non-admin user and create a contact via UI.
--   Run: SELECT COUNT(*) FROM contacts ORDER BY created_at DESC LIMIT 1;
--   Confirm the row appears with the correct created_by.
-- =============================================================================

-- ----------------------------------------------------------------
-- contacts: INSERT policy
-- ----------------------------------------------------------------
-- Drop any existing INSERT policy that may conflict (name may vary).
-- Inspect existing policies first in production:
--   SELECT policyname FROM pg_policies WHERE tablename = 'contacts' AND cmd = 'INSERT';
DROP POLICY IF EXISTS "crm_users_can_insert_contacts" ON contacts;
DROP POLICY IF EXISTS "Allow authenticated users to insert contacts" ON contacts;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON contacts;

CREATE POLICY "crm_users_can_insert_contacts"
ON contacts
FOR INSERT
WITH CHECK (
  auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1
    FROM crm_users
    WHERE crm_users.auth_user_id = auth.uid()
  )
);

-- ----------------------------------------------------------------
-- companies: INSERT policy
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "crm_users_can_insert_companies" ON companies;
DROP POLICY IF EXISTS "Allow authenticated users to insert companies" ON companies;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON companies;

CREATE POLICY "crm_users_can_insert_companies"
ON companies
FOR INSERT
WITH CHECK (
  auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1
    FROM crm_users
    WHERE crm_users.auth_user_id = auth.uid()
  )
);

-- ----------------------------------------------------------------
-- contact_import_staging: INSERT policy (for bulk import staging)
-- ----------------------------------------------------------------
-- Staging rows are inserted by the calling user before the RPC runs.
-- Without this, insertStagingRows() fails for non-admins.
DROP POLICY IF EXISTS "crm_users_can_insert_staging" ON contact_import_staging;

CREATE POLICY "crm_users_can_insert_staging"
ON contact_import_staging
FOR INSERT
WITH CHECK (
  auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1
    FROM crm_users
    WHERE crm_users.auth_user_id = auth.uid()
  )
);

-- ----------------------------------------------------------------
-- contact_assignments: INSERT policy
-- ----------------------------------------------------------------
-- createContact() immediately creates an assignment after the contact row.
-- If this policy is missing, the assignment silently fails (logged but not
-- fatal), leaving the contact orphaned with no owner.
DROP POLICY IF EXISTS "crm_users_can_insert_assignments" ON contact_assignments;

CREATE POLICY "crm_users_can_insert_assignments"
ON contact_assignments
FOR INSERT
WITH CHECK (
  auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1
    FROM crm_users
    WHERE crm_users.auth_user_id = auth.uid()
  )
);

-- ----------------------------------------------------------------
-- contact_phones: INSERT policy
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "crm_users_can_insert_contact_phones" ON contact_phones;

CREATE POLICY "crm_users_can_insert_contact_phones"
ON contact_phones
FOR INSERT
WITH CHECK (
  auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1
    FROM crm_users
    WHERE crm_users.auth_user_id = auth.uid()
  )
);
