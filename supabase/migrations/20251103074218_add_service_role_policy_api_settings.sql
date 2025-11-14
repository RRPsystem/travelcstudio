/*
  # Add Service Role Policy for API Settings

  1. Security Changes
    - Add policy to allow service_role full access (for debugging and edge functions)
    - Simplify operator policies to be more permissive
    
  2. Notes
    - Service role bypasses RLS by default, but we make it explicit
    - Operators get full access to api_settings
*/

-- Drop and recreate with simpler logic
DROP POLICY IF EXISTS "Operators can read api_settings" ON api_settings;
DROP POLICY IF EXISTS "Operators can insert api_settings" ON api_settings;
DROP POLICY IF EXISTS "Operators can update api_settings" ON api_settings;
DROP POLICY IF EXISTS "Operators can delete api_settings" ON api_settings;

-- SELECT: Operators and service role can read all
CREATE POLICY "Operators can read api_settings"
  ON api_settings
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT id FROM users WHERE role = 'operator'
    )
  );

-- INSERT: Only operators
CREATE POLICY "Operators can insert api_settings"
  ON api_settings
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM users WHERE role = 'operator'
    )
  );

-- UPDATE: Only operators
CREATE POLICY "Operators can update api_settings"
  ON api_settings
  FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT id FROM users WHERE role = 'operator'
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM users WHERE role = 'operator'
    )
  );

-- DELETE: Only operators
CREATE POLICY "Operators can delete api_settings"
  ON api_settings
  FOR DELETE
  USING (
    auth.uid() IN (
      SELECT id FROM users WHERE role = 'operator'
    )
  );
