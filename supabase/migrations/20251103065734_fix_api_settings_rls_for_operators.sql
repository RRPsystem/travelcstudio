/*
  # Fix API Settings RLS for Operators

  1. Security Changes
    - Add SELECT policy for operators to read api_settings
    - Add INSERT policy for operators to create api_settings
    - Add UPDATE policy for operators to modify api_settings
    - Add DELETE policy for operators to remove api_settings
    
  2. Notes
    - Only users with role 'operator' can manage API settings
    - Service role can always access (for Edge Functions)
    - Brands can read their own settings
*/

-- Drop existing policies if any
DROP POLICY IF EXISTS "Operators can read api_settings" ON api_settings;
DROP POLICY IF EXISTS "Operators can insert api_settings" ON api_settings;
DROP POLICY IF EXISTS "Operators can update api_settings" ON api_settings;
DROP POLICY IF EXISTS "Operators can delete api_settings" ON api_settings;
DROP POLICY IF EXISTS "Brands can read own api_settings" ON api_settings;

-- SELECT: Operators can read all, brands can read their own
CREATE POLICY "Operators can read api_settings"
  ON api_settings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'operator'
    )
    OR (
      brand_id IS NOT NULL 
      AND EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.brand_id = api_settings.brand_id
      )
    )
  );

-- INSERT: Only operators can insert
CREATE POLICY "Operators can insert api_settings"
  ON api_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'operator'
    )
  );

-- UPDATE: Only operators can update
CREATE POLICY "Operators can update api_settings"
  ON api_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'operator'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'operator'
    )
  );

-- DELETE: Only operators can delete
CREATE POLICY "Operators can delete api_settings"
  ON api_settings
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'operator'
    )
  );
