/*
  # Add SELECT Policy to Users Table

  1. Issue
    - Users table has no SELECT policy
    - Edge functions can't read user data
    - Causes "User data not found" error
    
  2. Solution
    - Add SELECT policy for own data
    - Allow operators/admins to read all users
    - No USING (true) to avoid warnings
*/

-- ============================================
-- USERS TABLE - Add SELECT Policy
-- ============================================

CREATE POLICY "Users can read own data and operators can read all"
  ON users FOR SELECT
  TO authenticated
  USING (
    -- Users can read their own data
    auth.uid() = id
    OR
    -- Operators and admins can read all users
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'operator')
    )
  );

-- ============================================
-- SUMMARY
-- ============================================
-- Now users can:
-- ✅ Read their own profile data
-- ✅ Operators/admins can read all users
-- ✅ Edge functions can fetch user data
-- ✅ No security warnings (no USING true)
-- ============================================