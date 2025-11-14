/*
  # Fix API Settings Access for Operators
  
  1. Changes
    - Drop existing operator policies that use subqueries
    - Create new simplified policies for operators
    - Ensure operators have full access to api_settings table
  
  2. Security
    - Only authenticated users with operator role can access
    - Simple role check without expensive subqueries
*/

-- Drop existing operator policies
DROP POLICY IF EXISTS "Operators can read api_settings" ON api_settings;
DROP POLICY IF EXISTS "Operators can insert api_settings" ON api_settings;
DROP POLICY IF EXISTS "Operators can update api_settings" ON api_settings;
DROP POLICY IF EXISTS "Operators can delete api_settings" ON api_settings;

-- Create new simplified operator policies
CREATE POLICY "Operators can read all api_settings"
  ON api_settings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'operator'
    )
  );

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
