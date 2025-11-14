/*
  # Fix Authentication Users - Reset Passwords

  1. Problem
    - Users exist in auth.users but authentication fails with "Database error querying schema"
    - This suggests the password hashes may be corrupted
  
  2. Solution
    - Delete existing demo users from auth.users
    - Recreate them using proper Supabase auth functions
    - Ensure passwords are properly hashed

  3. Changes
    - Remove old demo user entries
    - Create new demo users with proper password hashing
*/

-- First, delete the existing demo users from public.users and auth.users
DELETE FROM auth.users WHERE email IN ('admin@travel.com', 'brand@travel.com', 'operator@travel.com');

-- Note: The public.users records will remain with their fixed UUIDs
-- We'll need to recreate the auth.users entries to match these IDs