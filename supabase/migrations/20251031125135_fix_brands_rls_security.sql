/*
  # Fix Brands Table RLS Security

  ## Problem
  Current RLS policies allow ANY authenticated user to:
  - Update ANY brand's data (security risk!)
  - Delete ANY brand (security risk!)
  - Create new brands without authorization

  ## Solution
  Implement proper access control:
  - Brands can VIEW all brands (for listings, etc.)
  - Brands can only UPDATE/DELETE their OWN brand
  - Only admins/operators can CREATE new brands
  - Admins/operators have full access to all brands

  ## Changes
  1. Drop existing overly permissive policies
  2. Create granular policies per operation (SELECT, INSERT, UPDATE, DELETE)
  3. Implement role-based access control
  4. Ensure data isolation between brands

  ## Security Notes
  - Each brand is isolated and cannot modify other brands' data
  - Service role (backend) can still perform any operation
  - Admin and operator roles have elevated privileges
*/

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Allow authenticated users to view all brands" ON brands;
DROP POLICY IF EXISTS "Allow authenticated users to manage brands" ON brands;
DROP POLICY IF EXISTS "Allow all operations on brands for development" ON brands;

-- SELECT: All authenticated users can view all brands
-- (Needed for brand listings, dropdowns, etc.)
CREATE POLICY "Authenticated users can view all brands"
  ON brands
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: Only admins and operators can create new brands
CREATE POLICY "Only admins and operators can create brands"
  ON brands
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'operator')
    )
  );

-- UPDATE: Users can only update their own brand
-- Admins and operators can update any brand
CREATE POLICY "Users can update own brand"
  ON brands
  FOR UPDATE
  TO authenticated
  USING (
    -- User's own brand
    id = (SELECT brand_id FROM users WHERE id = auth.uid())
    OR
    -- Or user is admin/operator
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'operator')
    )
  )
  WITH CHECK (
    -- User's own brand
    id = (SELECT brand_id FROM users WHERE id = auth.uid())
    OR
    -- Or user is admin/operator
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'operator')
    )
  );

-- DELETE: Only admins and operators can delete brands
CREATE POLICY "Only admins and operators can delete brands"
  ON brands
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'operator')
    )
  );
