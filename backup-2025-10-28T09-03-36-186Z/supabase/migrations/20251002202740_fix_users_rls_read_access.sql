/*
  # Fix Users Table RLS for Read Access

  1. Changes
    - Drop existing restrictive SELECT policy
    - Create new policy that allows authenticated users to read from users table
    - This allows the app to fetch user profile data after login

  2. Security
    - Only authenticated users can read
    - Users can still only update their own records
*/

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Allow users to view their own profile" ON users;

-- Create a more permissive read policy for authenticated users
CREATE POLICY "Authenticated users can read users table"
  ON users
  FOR SELECT
  TO authenticated
  USING (true);
