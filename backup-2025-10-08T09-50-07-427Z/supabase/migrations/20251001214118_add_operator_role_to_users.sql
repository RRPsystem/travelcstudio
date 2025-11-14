/*
  # Add Operator Role to Users Table

  1. Purpose
    - Allow 'operator' role in users table
    - Enable operator user creation

  2. Changes
    - Update check constraint to include 'operator' role
*/

-- Drop existing constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- Add new constraint with operator role
ALTER TABLE users ADD CONSTRAINT users_role_check 
  CHECK (role = ANY (ARRAY['admin'::text, 'brand'::text, 'operator'::text]));
