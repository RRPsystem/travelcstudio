/*
  # Cleanup Duplicate User Policies

  ## Problem
  There are two UPDATE policies on the users table:
  1. "Allow users to update their own profile" (old, less secure)
  2. "Users can update own profile" (new, prevents role escalation)

  ## Solution
  Remove the old policy and keep the new secure one.

  ## Security Notes
  - The new policy prevents users from changing their own role
  - Only the secure policy will remain
*/

-- Drop the old, less secure policy
DROP POLICY IF EXISTS "Allow users to update their own profile" ON users;
