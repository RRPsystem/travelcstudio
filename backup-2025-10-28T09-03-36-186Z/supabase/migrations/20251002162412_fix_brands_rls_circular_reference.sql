/*
  # Fix circular RLS reference between users and brands

  1. Changes
    - Drop the problematic "Admins can access system brand" policy that causes circular reference
    - Keep the simple policies that allow authenticated users to view/manage brands
    
  2. Reason
    - The "Admins can access system brand" policy does an EXISTS check on users table
    - This causes a circular reference when users table queries brands with a JOIN
    - Results in query hanging/timeout
*/

-- Drop the problematic policy
DROP POLICY IF EXISTS "Admins can access system brand" ON brands;

-- Keep existing simple policies:
-- 1. "Allow all operations on brands for development" (public, ALL)
-- 2. "Allow authenticated users to view all brands" (authenticated, SELECT)
-- 3. "Allow authenticated users to manage brands" (authenticated, ALL)
