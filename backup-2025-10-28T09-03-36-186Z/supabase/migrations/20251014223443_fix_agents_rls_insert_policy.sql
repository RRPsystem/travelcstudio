/*
  # Fix Agents RLS Insert Policy

  1. Changes
    - Add policy for authenticated users to insert their own agent profile
    - Users can create agent profile with their own email
    - Service role can insert any agent profile

  2. Security
    - Users can only create profile with their own email
    - Must be authenticated
    - Service role has full access for admin operations
*/

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can create their own agent profile" ON agents;

-- Allow authenticated users to insert their own agent profile
CREATE POLICY "Users can create their own agent profile"
  ON agents FOR INSERT
  TO authenticated
  WITH CHECK (
    email = auth.jwt()->>'email'
  );

-- Ensure service role can insert (for admin operations)
DROP POLICY IF EXISTS "Service role can insert agents" ON agents;
CREATE POLICY "Service role can insert agents"
  ON agents FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Update the update policy to also check email ownership
DROP POLICY IF EXISTS "Brand users can manage their agents" ON agents;
CREATE POLICY "Brand users can manage their agents"
  ON agents FOR ALL
  TO authenticated
  USING (
    brand_id IN (
      SELECT brand_id FROM users WHERE id = auth.uid()
    )
    OR
    email = auth.jwt()->>'email'
  )
  WITH CHECK (
    brand_id IN (
      SELECT brand_id FROM users WHERE id = auth.uid()
    )
    OR
    email = auth.jwt()->>'email'
  );