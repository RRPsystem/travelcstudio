/*
  # Add brand and operator roles to user_role enum - Step 1

  1. Changes
    - Add 'brand' role to user_role enum
    - Add 'operator' role to user_role enum
*/

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'brand';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'operator';
