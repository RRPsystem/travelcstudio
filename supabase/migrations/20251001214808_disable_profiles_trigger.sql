/*
  # Disable Profiles Trigger

  1. Purpose
    - Remove the handle_new_user trigger that creates profiles
    - The application uses the users table, not profiles
    - Prevents "Database error querying schema" during login

  2. Changes
    - Drop the trigger on auth.users
    - Keep the profiles table for potential future use
*/

-- Drop the trigger that creates profiles on user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Optionally drop the function too (can be recreated if needed)
-- DROP FUNCTION IF EXISTS handle_new_user();
