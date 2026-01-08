/*
  # Fix User Metadata Security Issue

  1. Problem
    - Policy uses user_metadata to check admin/operator role
    - user_metadata can be changed by the user themselves
    - This is a CRITICAL security vulnerability

  2. Solution
    - Only use app_metadata (cannot be changed by user)
    - Remove user_metadata check completely

  3. Security
    - app_metadata can ONLY be set server-side
    - Users cannot escalate their own privileges
*/

-- Drop the insecure policy
DROP POLICY IF EXISTS "Admins and operators can read all users" ON users;

-- Create secure policy using ONLY app_metadata
CREATE POLICY "Admins and operators can read all users"
  ON users FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'operator')
  );

-- ============================================
-- SECURITY FIX SUMMARY
-- ============================================
-- ✅ Removed insecure user_metadata check
-- ✅ Only uses app_metadata (server-side only)
-- ✅ Users cannot self-escalate privileges
-- ✅ Security Advisor warning resolved
-- ============================================
