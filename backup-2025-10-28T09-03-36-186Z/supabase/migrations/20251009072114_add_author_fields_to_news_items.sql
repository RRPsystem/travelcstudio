/*
  # Add Author Fields to News Items

  ## Changes
  
  1. **Add columns to news_items table**
     - `author_type` (text) - Type of author: 'admin', 'brand', 'agent'
     - `author_id` (uuid) - ID of the author (user id)
     - `is_mandatory` (boolean) - Whether news is mandatory for brands
  
  2. **Security**
     - Update RLS policies to allow admins to view all news
     - Allow viewing news items based on author_type
  
  ## Notes
     - Admin users (author_type = 'admin') create news for the system brand
     - Brand users create news for their own brand
     - Agent users can create news on behalf of brands
*/

-- Add author_type column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'news_items' AND column_name = 'author_type'
  ) THEN
    ALTER TABLE news_items ADD COLUMN author_type text CHECK (author_type IN ('admin', 'brand', 'agent'));
  END IF;
END $$;

-- Add author_id column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'news_items' AND column_name = 'author_id'
  ) THEN
    ALTER TABLE news_items ADD COLUMN author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add is_mandatory column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'news_items' AND column_name = 'is_mandatory'
  ) THEN
    ALTER TABLE news_items ADD COLUMN is_mandatory boolean DEFAULT false;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_news_items_author_type ON news_items(author_type);
CREATE INDEX IF NOT EXISTS idx_news_items_author_id ON news_items(author_id);
CREATE INDEX IF NOT EXISTS idx_news_items_is_mandatory ON news_items(is_mandatory);

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view published news for their brand" ON news_items;
DROP POLICY IF EXISTS "Users can create news for their brand" ON news_items;
DROP POLICY IF EXISTS "Users can update news for their brand" ON news_items;
DROP POLICY IF EXISTS "Users can delete news for their brand" ON news_items;

-- Updated RLS Policies for news_items

-- Allow admins to view all news (including admin-created news)
CREATE POLICY "Users can view news for their brand or admin news"
  ON news_items FOR SELECT
  TO authenticated
  USING (
    brand_id IN (
      SELECT brand_id FROM users WHERE id = auth.uid()
    )
    OR author_type = 'admin'
    OR brand_id = '00000000-0000-0000-0000-000000000001'
  );

-- Allow users to create news for their brand, admins can create for system brand
CREATE POLICY "Users can create news for their brand"
  ON news_items FOR INSERT
  TO authenticated
  WITH CHECK (
    brand_id IN (
      SELECT brand_id FROM users WHERE id = auth.uid()
    )
    OR (
      brand_id = '00000000-0000-0000-0000-000000000001'
      AND EXISTS (
        SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
      )
    )
  );

-- Allow users to update news for their brand or admin news they created
CREATE POLICY "Users can update news for their brand"
  ON news_items FOR UPDATE
  TO authenticated
  USING (
    brand_id IN (
      SELECT brand_id FROM users WHERE id = auth.uid()
    )
    OR (
      author_type = 'admin' AND author_id = auth.uid()
    )
  )
  WITH CHECK (
    brand_id IN (
      SELECT brand_id FROM users WHERE id = auth.uid()
    )
    OR (
      author_type = 'admin' AND author_id = auth.uid()
    )
  );

-- Allow users to delete news for their brand or admin news they created
CREATE POLICY "Users can delete news for their brand"
  ON news_items FOR DELETE
  TO authenticated
  USING (
    brand_id IN (
      SELECT brand_id FROM users WHERE id = auth.uid()
    )
    OR (
      author_type = 'admin' AND author_id = auth.uid()
    )
  );
