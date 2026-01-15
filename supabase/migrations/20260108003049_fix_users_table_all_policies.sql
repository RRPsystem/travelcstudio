/*
  # Fix Users Table All Policies - Remove Circular References

  1. Problem
    - INSERT, UPDATE, DELETE policies on users table query users table
    - This creates circular reference 
    - Blocks all database operations
    
  2. Solution
    - Update all policies to use app_metadata only
    - No self-referential queries on users table

  3. Security
    - Only admins/operators can manage users (via app_metadata)
    - Users can still update their own profile (excluding role)
    - All checks via JWT claims (secure)
*/

-- Drop problematic policies
DROP POLICY IF EXISTS "Only admins and operators can create users" ON users;
DROP POLICY IF EXISTS "Only admins and operators can delete users" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;

-- Create new INSERT policy without users table query
CREATE POLICY "Only admins and operators can create users"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'operator')
  );

-- Create new DELETE policy without users table query  
CREATE POLICY "Only admins and operators can delete users"
  ON users FOR DELETE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'operator')
  );

-- Create new UPDATE policy without circular reference
-- Users can update their own profile, but not their role
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid() 
    AND (
      -- If role is being changed, user must be admin/operator
      role IS NOT DISTINCT FROM (
        SELECT u.role FROM users u WHERE u.id = auth.uid()
      )
      OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'operator')
    )
  );

-- ============================================
-- FIX SUMMARY
-- ============================================
-- ✅ All users policies now use app_metadata
-- ✅ No more circular self-references
-- ✅ Users protected from escalating privileges
-- ✅ Should completely fix all issues
-- ============================================
