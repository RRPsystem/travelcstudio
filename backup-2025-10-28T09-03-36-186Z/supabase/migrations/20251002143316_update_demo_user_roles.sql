/*
  # Update demo users with correct roles - Step 2

  1. Changes
    - Update brand@travel.com to 'brand' role
    - Update operator@travel.com to 'operator' role
*/

UPDATE profiles 
SET role = 'brand' 
WHERE email = 'brand@travel.com';

UPDATE profiles 
SET role = 'operator' 
WHERE email = 'operator@travel.com';
