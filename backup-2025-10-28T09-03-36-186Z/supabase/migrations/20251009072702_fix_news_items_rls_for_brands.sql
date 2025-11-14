/*
  # Fix News Items RLS Policies for Brands

  ## Changes
  
  This migration fixes the RLS policies to ensure brands can still create and manage their own news items.
  
  1. **Update RLS Policies**
     - Allow brands to view their own news items
     - Allow brands to create news items for their brand
     - Allow brands to update their own news items
     - Allow brands to delete their own news items
     - Allow admins to view all news items
  
  ## Security
     - Brands can only access news for their own brand_id
     - Admins can access all news items
     - System maintains proper isolation between brands
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view news for their brand or admin news" ON news_items;
DROP POLICY IF EXISTS "Users can create news for their brand" ON news_items;
DROP POLICY IF EXISTS "Users can update news for their brand" ON news_items;
DROP POLICY IF EXISTS "Users can delete news for their brand" ON news_items;

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
      AND brand_id = '00000000-0000-0000-0000-000000000001'
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
    )
    -- OR admins can create for system brand
    OR (
      brand_id = '00000000-0000-0000-0000-000000000001'
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
    )
    -- OR admins can update their own admin news
    OR (
      author_type = 'admin' 
      AND author_id = auth.uid()
      AND brand_id = '00000000-0000-0000-0000-000000000001'
    )
  )
  WITH CHECK (
    -- Same checks for the updated data
    (
      brand_id IN (
        SELECT brand_id FROM users WHERE id = auth.uid()
      )
      AND brand_id IS NOT NULL
    )
    OR (
      author_type = 'admin' 
      AND author_id = auth.uid()
      AND brand_id = '00000000-0000-0000-0000-000000000001'
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
    )
    -- OR admins can delete their own admin news
    OR (
      author_type = 'admin' 
      AND author_id = auth.uid()
      AND brand_id = '00000000-0000-0000-0000-000000000001'
    )
  );
