/*
  # Add Missing RLS Policies
  
  1. Tables Affected
    - brand_travel_feeds (brand content feed configuration)
    - brand_travelideas (brand travel idea assignments)
    - pages (website pages and templates)
    
  2. Security Policies
    - Brands can manage their own travel feeds and ideas
    - Authenticated users can view pages
    - Brands can manage their own pages
    - Operators can manage all content
    - Public can view published pages and templates
*/

-- =====================================================
-- BRAND_TRAVEL_FEEDS POLICIES
-- =====================================================

-- Brands can view their own travel feeds
CREATE POLICY "Brands can view own travel feeds"
  ON brand_travel_feeds FOR SELECT
  TO authenticated
  USING (
    brand_id IN (
      SELECT brand_id FROM users WHERE id = auth.uid()
    )
  );

-- Brands can create travel feeds for their brand
CREATE POLICY "Brands can create own travel feeds"
  ON brand_travel_feeds FOR INSERT
  TO authenticated
  WITH CHECK (
    brand_id IN (
      SELECT brand_id FROM users WHERE id = auth.uid()
    )
  );

-- Brands can update their own travel feeds
CREATE POLICY "Brands can update own travel feeds"
  ON brand_travel_feeds FOR UPDATE
  TO authenticated
  USING (
    brand_id IN (
      SELECT brand_id FROM users WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    brand_id IN (
      SELECT brand_id FROM users WHERE id = auth.uid()
    )
  );

-- Brands can delete their own travel feeds
CREATE POLICY "Brands can delete own travel feeds"
  ON brand_travel_feeds FOR DELETE
  TO authenticated
  USING (
    brand_id IN (
      SELECT brand_id FROM users WHERE id = auth.uid()
    )
  );

-- Operators can manage all travel feeds
CREATE POLICY "Operators can manage all travel feeds"
  ON brand_travel_feeds FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'operator'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'operator'
    )
  );

-- =====================================================
-- BRAND_TRAVELIDEAS POLICIES
-- =====================================================

-- Brands can view their own travel ideas
CREATE POLICY "Brands can view own travel ideas"
  ON brand_travelideas FOR SELECT
  TO authenticated
  USING (
    brand_id IN (
      SELECT brand_id FROM users WHERE id = auth.uid()
    )
  );

-- Brands can create travel ideas for their brand
CREATE POLICY "Brands can create own travel ideas"
  ON brand_travelideas FOR INSERT
  TO authenticated
  WITH CHECK (
    brand_id IN (
      SELECT brand_id FROM users WHERE id = auth.uid()
    )
  );

-- Brands can update their own travel ideas
CREATE POLICY "Brands can update own travel ideas"
  ON brand_travelideas FOR UPDATE
  TO authenticated
  USING (
    brand_id IN (
      SELECT brand_id FROM users WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    brand_id IN (
      SELECT brand_id FROM users WHERE id = auth.uid()
    )
  );

-- Brands can delete their own travel ideas
CREATE POLICY "Brands can delete own travel ideas"
  ON brand_travelideas FOR DELETE
  TO authenticated
  USING (
    brand_id IN (
      SELECT brand_id FROM users WHERE id = auth.uid()
    )
  );

-- Operators can manage all travel ideas
CREATE POLICY "Operators can manage all travel ideas"
  ON brand_travelideas FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'operator'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'operator'
    )
  );

-- =====================================================
-- PAGES POLICIES
-- =====================================================

-- Public can view published pages and approved templates
CREATE POLICY "Public can view published pages and templates"
  ON pages FOR SELECT
  TO public
  USING (
    (status = 'published' AND is_template = false)
    OR (is_template = true AND is_approved_for_brands = true)
  );

-- Authenticated users can view all pages
CREATE POLICY "Authenticated users can view pages"
  ON pages FOR SELECT
  TO authenticated
  USING (true);

-- Brands can create pages for their brand
CREATE POLICY "Brands can create own pages"
  ON pages FOR INSERT
  TO authenticated
  WITH CHECK (
    brand_id IN (
      SELECT brand_id FROM users WHERE id = auth.uid()
    )
    OR brand_id IS NULL
  );

-- Brands can update their own pages
CREATE POLICY "Brands can update own pages"
  ON pages FOR UPDATE
  TO authenticated
  USING (
    brand_id IN (
      SELECT brand_id FROM users WHERE id = auth.uid()
    )
    OR owner_user_id = auth.uid()
  )
  WITH CHECK (
    brand_id IN (
      SELECT brand_id FROM users WHERE id = auth.uid()
    )
    OR owner_user_id = auth.uid()
  );

-- Brands can delete their own pages
CREATE POLICY "Brands can delete own pages"
  ON pages FOR DELETE
  TO authenticated
  USING (
    brand_id IN (
      SELECT brand_id FROM users WHERE id = auth.uid()
    )
    OR owner_user_id = auth.uid()
  );

-- Operators can manage all pages
CREATE POLICY "Operators can manage all pages"
  ON pages FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'operator'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'operator'
    )
  );
