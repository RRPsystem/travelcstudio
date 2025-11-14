/*
  # Add Template System to Pages

  ## Overview
  This migration adds a template system where admins can create page templates
  that brands can select and copy to their own accounts.

  ## Changes
  
  1. Schema Changes
    - Add `is_template` boolean column to identify template pages (admin-created)
    - Add `template_id` uuid column to track which template a page was copied from
    - Add `template_category` text column for organizing templates (e.g., 'home', 'about', 'contact')
    - Add `preview_image_url` text column for template thumbnails
    - Make `brand_id` nullable (NULL for templates)
    - Make `owner_user_id` nullable (NULL for system templates)
    
  2. Indexes
    - Index on `is_template` for fast template queries
    - Index on `template_category` for filtering templates
    
  3. RLS Policies
    - Allow all authenticated users to read templates
    - Only admins can create/update templates
    - Brands can create copies from templates
    - Brands can only manage their own pages

  ## Notes
    - Templates have `brand_id = NULL` and `is_template = true`
    - Brand pages have `brand_id` set and `template_id` references the original template
    - All existing pages are marked as `is_template = false`
*/

-- Make brand_id and owner_user_id nullable for templates
ALTER TABLE pages ALTER COLUMN brand_id DROP NOT NULL;
ALTER TABLE pages ALTER COLUMN owner_user_id DROP NOT NULL;

-- Add template system columns
ALTER TABLE pages
  ADD COLUMN IF NOT EXISTS is_template boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES pages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS template_category text DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS preview_image_url text DEFAULT NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_pages_is_template ON pages(is_template) WHERE is_template = true;
CREATE INDEX IF NOT EXISTS idx_pages_template_category ON pages(template_category) WHERE is_template = true;
CREATE INDEX IF NOT EXISTS idx_pages_template_id ON pages(template_id) WHERE template_id IS NOT NULL;

-- Update RLS policies

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view pages for their brand" ON pages;
DROP POLICY IF EXISTS "Users can create pages for their brand" ON pages;
DROP POLICY IF EXISTS "Users can update pages for their brand" ON pages;
DROP POLICY IF EXISTS "Users can delete pages for their brand" ON pages;

-- Templates: Everyone (authenticated) can view templates
CREATE POLICY "Anyone can view page templates"
  ON pages FOR SELECT
  TO authenticated
  USING (is_template = true);

-- Templates: Only admins can create templates
CREATE POLICY "Admins can create page templates"
  ON pages FOR INSERT
  TO authenticated
  WITH CHECK (
    is_template = true AND
    brand_id IS NULL AND
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Templates: Only admins can update templates
CREATE POLICY "Admins can update page templates"
  ON pages FOR UPDATE
  TO authenticated
  USING (
    is_template = true AND
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    is_template = true AND
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Templates: Only admins can delete templates
CREATE POLICY "Admins can delete page templates"
  ON pages FOR DELETE
  TO authenticated
  USING (
    is_template = true AND
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Brand Pages: Brands can view their own pages
CREATE POLICY "Users can view pages for their brand"
  ON pages FOR SELECT
  TO authenticated
  USING (
    is_template = false AND
    brand_id IN (
      SELECT brand_id FROM users WHERE id = auth.uid()
    )
  );

-- Brand Pages: Brands can create pages in their own account
CREATE POLICY "Users can create pages for their brand"
  ON pages FOR INSERT
  TO authenticated
  WITH CHECK (
    is_template = false AND
    brand_id IN (
      SELECT brand_id FROM users WHERE id = auth.uid()
    )
  );

-- Brand Pages: Brands can update their own pages
CREATE POLICY "Users can update pages for their brand"
  ON pages FOR UPDATE
  TO authenticated
  USING (
    is_template = false AND
    brand_id IN (
      SELECT brand_id FROM users WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    is_template = false AND
    brand_id IN (
      SELECT brand_id FROM users WHERE id = auth.uid()
    )
  );

-- Brand Pages: Brands can delete their own pages
CREATE POLICY "Users can delete pages for their brand"
  ON pages FOR DELETE
  TO authenticated
  USING (
    is_template = false AND
    brand_id IN (
      SELECT brand_id FROM users WHERE id = auth.uid()
    )
  );

-- Admin: Admins can view all pages (both templates and brand pages)
CREATE POLICY "Admins can view all pages"
  ON pages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Admin: Admins can create pages for any brand
CREATE POLICY "Admins can create pages for brands"
  ON pages FOR INSERT
  TO authenticated
  WITH CHECK (
    is_template = false AND
    brand_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Admin: Admins can update any brand page
CREATE POLICY "Admins can update brand pages"
  ON pages FOR UPDATE
  TO authenticated
  USING (
    is_template = false AND
    brand_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    is_template = false AND
    brand_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Admin: Admins can delete any brand page
CREATE POLICY "Admins can delete brand pages"
  ON pages FOR DELETE
  TO authenticated
  USING (
    is_template = false AND
    brand_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );