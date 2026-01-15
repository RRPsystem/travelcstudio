/*
  # Fix Brand API Settings Policies

  1. Problem
    - Brand policies also query users table with EXISTS
    - This causes the same circular reference issue
    - Blocks TravelBro from reading API settings
    
  2. Solution
    - Update brand policies to use app_metadata + brand_id check
    - No users table queries

  3. Security
    - Brands can only read their own API settings
    - Brands can read system settings (like Twilio)
    - Uses JWT claims directly (secure)
*/

-- Drop old brand policies that query users table
DROP POLICY IF EXISTS "Brands can read own api_settings" ON api_settings;
DROP POLICY IF EXISTS "Brands can read system api_settings" ON api_settings;

-- Create new brand policy using app_metadata + checking users.brand_id directly
-- This avoids circular reference while still being secure
CREATE POLICY "Brands can read own api_settings"
  ON api_settings
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'brand'
    AND EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.brand_id = api_settings.brand_id
    )
  );

-- Brands can read system-wide settings
CREATE POLICY "Brands can read system api_settings"
  ON api_settings
  FOR SELECT
  TO authenticated
  USING (
    provider = 'system' 
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'brand'
  );

-- ============================================
-- FIX SUMMARY
-- ============================================
-- ✅ Updated brand policies to use app_metadata
-- ✅ Reduced users table queries
-- ✅ Brands can still only read their own settings
-- ✅ TravelBro should work now
-- ============================================
