/*
  # Fix API Settings Circular Reference with Users Table

  1. Problem
    - api_settings policies query users table with EXISTS
    - Users table policy was just changed
    - This creates a circular dependency issue
    - Edge functions fail when trying to read api_settings

  2. Solution
    - Update api_settings policies to check app_metadata directly
    - Remove EXISTS queries on users table
    - Keep service_role access for edge functions

  3. Security
    - Only operators/admins (from app_metadata) can manage
    - Service role has full access (for edge functions)
*/

-- Drop ALL existing policies on api_settings
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'api_settings') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON api_settings';
    END LOOP;
END $$;

-- Create policies using app_metadata directly (no users table query)
CREATE POLICY "api_settings_select_operator"
  ON api_settings
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'operator')
  );

CREATE POLICY "api_settings_insert_operator"
  ON api_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'operator')
  );

CREATE POLICY "api_settings_update_operator"
  ON api_settings
  FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'operator')
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'operator')
  );

CREATE POLICY "api_settings_delete_operator"
  ON api_settings
  FOR DELETE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'operator')
  );

-- Service role policy (bypasses RLS, but add for clarity)
CREATE POLICY "api_settings_service_role_all"
  ON api_settings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- FIX SUMMARY
-- ============================================
-- ✅ Removed circular reference with users table
-- ✅ Uses app_metadata directly (secure)
-- ✅ Service role has full access
-- ✅ Edge functions will work now
-- ============================================
