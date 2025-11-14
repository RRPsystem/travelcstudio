/*
  # Completely Fix API Settings RLS
  
  1. Changes
    - Drop ALL existing policies on api_settings
    - Create simple policies that work with service_role and operator access
    - Use direct role check in policy
  
  2. Security
    - Service role has full access (for edge functions)
    - Operators have full access (for dashboard)
*/

-- Drop ALL existing policies
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'api_settings') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON api_settings';
    END LOOP;
END $$;

-- Grant usage on the table
GRANT ALL ON api_settings TO authenticated;
GRANT ALL ON api_settings TO service_role;

-- Create simple policies for operators
CREATE POLICY "api_settings_select_operator"
  ON api_settings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role = 'operator'
    )
  );

CREATE POLICY "api_settings_insert_operator"
  ON api_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role = 'operator'
    )
  );

CREATE POLICY "api_settings_update_operator"
  ON api_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role = 'operator'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role = 'operator'
    )
  );

CREATE POLICY "api_settings_delete_operator"
  ON api_settings
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role = 'operator'
    )
  );

-- Add policy for service_role (bypasses RLS but we add it for clarity)
CREATE POLICY "api_settings_service_role_all"
  ON api_settings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Grant SELECT on users table to authenticated so the policy can read it
GRANT SELECT ON users TO authenticated;
