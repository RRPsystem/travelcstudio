/*
  # Fix agents RLS policy for admin/operator updates

  1. Changes
    - Drop existing "Operators can manage all agents" policy
    - Recreate with proper WITH CHECK clause for UPDATE operations
    - Ensures admins/operators can update and delete agent records

  2. Security
    - Only users with role 'operator' or 'admin' can manage all agents
    - WITH CHECK ensures the same validation on updates
*/

-- Drop the existing policy
DROP POLICY IF EXISTS "Operators can manage all agents" ON agents;

-- Recreate with proper WITH CHECK
CREATE POLICY "Operators can manage all agents"
  ON agents FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('operator', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('operator', 'admin')
    )
  );
