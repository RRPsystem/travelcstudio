/*
  # Fix Users Table RLS Security

  ## Problem
  Current RLS policies allow authenticated users to read ALL user data,
  but there's no policy for UPDATE, DELETE, or INSERT operations.

  ## Solution
  Implement proper access control:
  - Users can VIEW all users (needed for user lists, role checks, etc.)
  - Users can only UPDATE their OWN profile
  - Only admins/operators can CREATE new users
  - Only admins/operators can DELETE users

  ## Changes
  1. Keep existing SELECT policy (all authenticated can view)
  2. Add UPDATE policy (own profile only)
  3. Add INSERT policy (admins/operators only)
  4. Add DELETE policy (admins/operators only)

  ## Security Notes
  - Users cannot escalate their own privileges
  - Service role (backend) can still perform any operation via Edge Functions
  - Password changes handled through Supabase Auth (not this table)
*/

-- UPDATE: Users can only update their own profile
-- Cannot change their own role (security!)
CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND
    -- Prevent users from changing their own role
    role = (SELECT role FROM users WHERE id = auth.uid())
  );

-- INSERT: Only admins, operators, and service_role can create users
-- Note: Normal user signup is handled via Supabase Auth + Edge Functions
CREATE POLICY "Only admins and operators can create users"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'operator')
    )
  );

-- DELETE: Only admins and operators can delete users
CREATE POLICY "Only admins and operators can delete users"
  ON users
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'operator')
    )
  );
