/*
  # Fix News Items RLS for Dummy Brand ID

  ## Overview
  This migration updates the news_items RLS policies to accept the dummy brand_id
  used by the builder ('00000000-0000-0000-0000-000000000999') instead of the
  old dummy brand_id ('00000000-0000-0000-0000-000000000001').

  ## Changes
  
  1. Policy Updates
    - Update all policies to use brand_id = '00000000-0000-0000-0000-000000000999'
    - This aligns with the brand_id used by TemplateManager and NewsManagement
    
  ## Security
    - Still requires admin role for admin news creation
    - Brands can only access their own news
    - Maintains RLS security for all operations
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view news for their brand or admin news" ON news_items;
DROP POLICY IF EXISTS "Users can create news for their brand" ON news_items;
DROP POLICY IF EXISTS "Users can update their own news" ON news_items;
DROP POLICY IF EXISTS "Users can delete their own news" ON news_items;

-- Policy 1: Allow users to view news for their brand OR admin-created news
CREATE POLICY "Users can view news for their brand or admin news"
  ON news_items FOR SELECT
  TO authenticated
  USING (
    -- Users can see news for their brand
    brand_id IN (
      SELECT brand_id FROM users WHERE id = auth.uid()
    )
    -- OR admin-created news from system brand
    OR (
      author_type = 'admin' 
      AND brand_id = '00000000-0000-0000-0000-000000000999'
    )
  );

-- Policy 2: Allow users to create news for their brand
CREATE POLICY "Users can create news for their brand"
  ON news_items FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Regular users can create for their brand
    (
      brand_id IN (
        SELECT brand_id FROM users WHERE id = auth.uid()
      )
      AND brand_id IS NOT NULL
      AND brand_id != '00000000-0000-0000-0000-000000000999'
    )
    -- OR admins can create for system brand
    OR (
      brand_id = '00000000-0000-0000-0000-000000000999'
      AND EXISTS (
        SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
      )
    )
  );

-- Policy 3: Allow users to update their own news
CREATE POLICY "Users can update their own news"
  ON news_items FOR UPDATE
  TO authenticated
  USING (
    -- Users can update news for their brand
    (
      brand_id IN (
        SELECT brand_id FROM users WHERE id = auth.uid()
      )
      AND brand_id IS NOT NULL
      AND brand_id != '00000000-0000-0000-0000-000000000999'
    )
    -- OR admins can update their own admin news
    OR (
      author_type = 'admin' 
      AND author_id = auth.uid()
      AND brand_id = '00000000-0000-0000-0000-000000000999'
    )
  )
  WITH CHECK (
    -- Same checks for the updated data
    (
      brand_id IN (
        SELECT brand_id FROM users WHERE id = auth.uid()
      )
      AND brand_id IS NOT NULL
      AND brand_id != '00000000-0000-0000-0000-000000000999'
    )
    OR (
      author_type = 'admin' 
      AND author_id = auth.uid()
      AND brand_id = '00000000-0000-0000-0000-000000000999'
    )
  );

-- Policy 4: Allow users to delete their own news
CREATE POLICY "Users can delete their own news"
  ON news_items FOR DELETE
  TO authenticated
  USING (
    -- Users can delete news for their brand
    (
      brand_id IN (
        SELECT brand_id FROM users WHERE id = auth.uid()
      )
      AND brand_id IS NOT NULL
      AND brand_id != '00000000-0000-0000-0000-000000000999'
    )
    -- OR admins can delete their own admin news
    OR (
      author_type = 'admin' 
      AND author_id = auth.uid()
      AND brand_id = '00000000-0000-0000-0000-000000000999'
    )
  );
