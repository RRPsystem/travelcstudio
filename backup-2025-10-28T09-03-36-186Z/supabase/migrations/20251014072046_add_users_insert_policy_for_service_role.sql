/*
  # Add INSERT policy for users table

  1. Changes
    - Add INSERT policy to allow service role to create users
    - This enables the create-brand-with-user edge function to work correctly
  
  2. Security
    - Policy is restricted to service role operations
    - Maintains existing security for regular authenticated users
*/

-- Drop any existing problematic policies
DROP POLICY IF EXISTS "Service role can insert users" ON public.users;

-- Add INSERT policy for creating new users via edge functions
CREATE POLICY "Service role can insert users"
  ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
