/*
  # Add Agent Role to Users Table

  1. Changes
    - Adds 'agent' to the allowed roles in users table
    - Updates the role check constraint
    
  2. Security
    - Maintains role-based access control
    - Agent role can access agent-specific features
*/

-- Drop existing constraint
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;

-- Add new constraint with 'agent' role included
ALTER TABLE public.users 
ADD CONSTRAINT users_role_check 
CHECK (role = ANY (ARRAY['admin'::text, 'brand'::text, 'operator'::text, 'agent'::text]));
