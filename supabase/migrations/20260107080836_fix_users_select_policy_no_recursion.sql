/*
  # Fix Users SELECT Policy - Remove Circular Reference

  1. Problem
    - Current policy has EXISTS subquery that reads users table
    - This causes infinite recursion
    - Edge functions can't read user data
    
  2. Solution
    - Remove circular EXISTS clause
    - Use separate policies for different roles
    - No subqueries on same table
*/

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can read own data and operators can read all" ON users;

-- Create simple policy for users to read own data
CREATE POLICY "Users can read own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Create separate policy for admins/operators using JWT claims
-- This avoids circular reference by checking JWT role claim
CREATE POLICY "Admins and operators can read all users"
  ON users FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' IN ('admin', 'operator')
    OR
    (auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' IN ('admin', 'operator')
  );

-- ============================================
-- SUMMARY
-- ============================================
-- Fixed circular reference issue:
-- ✅ Users can read own data (no recursion)
-- ✅ Admins/operators can read all (via JWT)
-- ✅ No infinite recursion
-- ✅ Edge functions will work
-- ============================================