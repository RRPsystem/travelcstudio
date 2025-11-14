/*
  # Remove handle_new_user Function Completely

  1. Purpose
    - Drop the handle_new_user function that causes "Database error querying schema"
    - The function tries to use 'medewerker'::user_role which doesn't exist
    - The application uses the users table, not profiles

  2. Changes
    - Drop handle_new_user function
    - This prevents any potential auth hooks from calling it
*/

-- Drop the function completely
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
