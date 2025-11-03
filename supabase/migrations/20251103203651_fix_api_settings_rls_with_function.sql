/*
  # Fix API Settings RLS with Helper Function
  
  1. Changes
    - Create helper function to check if current user is operator
    - Drop existing operator policies
    - Create new policies using the helper function
  
  2. Security
    - Function runs with SECURITY DEFINER to bypass RLS on users table
    - Only checks role, doesn't expose sensitive data
*/

-- Create helper function to check if user is operator
CREATE OR REPLACE FUNCTION is_operator()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role = 'operator'
  );
END;
$$;

-- Drop existing operator policies
DROP POLICY IF EXISTS "Operators can read all api_settings" ON api_settings;
DROP POLICY IF EXISTS "Operators can insert api_settings" ON api_settings;
DROP POLICY IF EXISTS "Operators can update api_settings" ON api_settings;
DROP POLICY IF EXISTS "Operators can delete api_settings" ON api_settings;

-- Create new policies using helper function
CREATE POLICY "Operators can read all api_settings"
  ON api_settings
  FOR SELECT
  TO authenticated
  USING (is_operator());

CREATE POLICY "Operators can insert api_settings"
  ON api_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (is_operator());

CREATE POLICY "Operators can update api_settings"
  ON api_settings
  FOR UPDATE
  TO authenticated
  USING (is_operator())
  WITH CHECK (is_operator());

CREATE POLICY "Operators can delete api_settings"
  ON api_settings
  FOR DELETE
  TO authenticated
  USING (is_operator());
