/*
  # Fix All Circular User Table References

  1. Problem
    - Multiple tables have policies that query users table with EXISTS
    - This creates circular dependency with new users SELECT policy
    - Affects: content_placements, template_field_mappings, ai_content_generations
    
  2. Solution
    - Update all policies to check app_metadata directly
    - Remove all EXISTS queries on users table
    - Use (auth.jwt() -> 'app_metadata' ->> 'role') pattern

  3. Security
    - Only operators/admins from app_metadata can access
    - No change in security level, just implementation
*/

-- Fix content_placements policies
DROP POLICY IF EXISTS "Operators can view all placements" ON content_placements;

CREATE POLICY "Operators can view all placements"
  ON content_placements FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'operator'));

-- Fix template_field_mappings policies
DROP POLICY IF EXISTS "Operators can manage all mappings" ON template_field_mappings;

CREATE POLICY "Operators can manage all mappings"
  ON template_field_mappings FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'operator'))
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'operator'));

-- Fix ai_content_generations policies  
DROP POLICY IF EXISTS "Operators can view all generations" ON ai_content_generations;

CREATE POLICY "Operators can view all generations"
  ON ai_content_generations FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'operator'));

-- ============================================
-- FIX SUMMARY
-- ============================================
-- ✅ Fixed content_placements
-- ✅ Fixed template_field_mappings
-- ✅ Fixed ai_content_generations
-- ✅ All use app_metadata now (no users table query)
-- ✅ No more circular references
-- ============================================
