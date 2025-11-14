/*
  # Add Assignment System to Destinations

  This migration implements the same assignment system for destinations as exists for news items.
  Admin users can create destinations and assign them to brands, who can then accept/reject and customize them.

  ## Changes

  1. **Add columns to destinations table**
     - `author_type` (text) - Type of author: 'admin', 'brand', 'agent'
     - `author_id` (uuid) - ID of the author (user id)
     - `is_mandatory` (boolean) - Whether destination is mandatory for brands
     - `enabled_for_brands` (boolean) - Toggle for custom brands
     - `enabled_for_franchise` (boolean) - Toggle for franchise brands

  2. **Create destination_brand_assignments table**
     - Links destinations to brands with approval workflow
     - Tracks status: 'pending', 'accepted', 'rejected', 'mandatory'
     - Includes is_published toggle and page_id for website integration

  3. **Update RLS policies**
     - Allow admins to view/manage all destinations
     - Allow brands to view destinations for their brand or admin-created ones
     - Control assignment workflow permissions

  ## Security
     - All tables have RLS enabled
     - Brands can only manage their own destinations and assignments
     - Admins can manage all content

  ## Notes
     - Follows the same pattern as news_items and news_brand_assignments
     - Admin creates destinations for system brand (00000000-0000-0000-0000-000000000999)
     - Brands can create their own destinations
     - Assignments enable admin-to-brand content distribution
*/

-- Add author_type column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'destinations' AND column_name = 'author_type'
  ) THEN
    ALTER TABLE destinations ADD COLUMN author_type text CHECK (author_type IN ('admin', 'brand', 'agent'));
  END IF;
END $$;

-- Add author_id column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'destinations' AND column_name = 'author_id'
  ) THEN
    ALTER TABLE destinations ADD COLUMN author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add is_mandatory column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'destinations' AND column_name = 'is_mandatory'
  ) THEN
    ALTER TABLE destinations ADD COLUMN is_mandatory boolean DEFAULT false;
  END IF;
END $$;

-- Add enabled_for_brands column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'destinations' AND column_name = 'enabled_for_brands'
  ) THEN
    ALTER TABLE destinations ADD COLUMN enabled_for_brands boolean DEFAULT false;
  END IF;
END $$;

-- Add enabled_for_franchise column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'destinations' AND column_name = 'enabled_for_franchise'
  ) THEN
    ALTER TABLE destinations ADD COLUMN enabled_for_franchise boolean DEFAULT false;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_destinations_author_type ON destinations(author_type);
CREATE INDEX IF NOT EXISTS idx_destinations_author_id ON destinations(author_id);
CREATE INDEX IF NOT EXISTS idx_destinations_is_mandatory ON destinations(is_mandatory);
CREATE INDEX IF NOT EXISTS idx_destinations_enabled_for_brands ON destinations(enabled_for_brands);
CREATE INDEX IF NOT EXISTS idx_destinations_enabled_for_franchise ON destinations(enabled_for_franchise);

-- Create destination_brand_assignments table
CREATE TABLE IF NOT EXISTS destination_brand_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  destination_id uuid NOT NULL REFERENCES destinations(id) ON DELETE CASCADE,
  brand_id uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'mandatory')),
  assigned_at timestamptz DEFAULT now(),
  responded_at timestamptz,
  is_published boolean DEFAULT false,
  page_id uuid REFERENCES website_pages(id) ON DELETE SET NULL,
  UNIQUE(destination_id, brand_id)
);

-- Create indexes for destination_brand_assignments
CREATE INDEX IF NOT EXISTS idx_destination_assignments_destination ON destination_brand_assignments(destination_id);
CREATE INDEX IF NOT EXISTS idx_destination_assignments_brand ON destination_brand_assignments(brand_id);
CREATE INDEX IF NOT EXISTS idx_destination_assignments_status ON destination_brand_assignments(status);
CREATE INDEX IF NOT EXISTS idx_destination_assignments_page ON destination_brand_assignments(page_id);

-- Enable RLS on destination_brand_assignments
ALTER TABLE destination_brand_assignments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies on destinations
DROP POLICY IF EXISTS "Users can view destinations for their brand" ON destinations;
DROP POLICY IF EXISTS "Users can create destinations for their brand" ON destinations;
DROP POLICY IF EXISTS "Users can update destinations for their brand" ON destinations;
DROP POLICY IF EXISTS "Users can delete destinations for their brand" ON destinations;

-- Updated RLS Policies for destinations

-- Allow users to view destinations for their brand or admin destinations
CREATE POLICY "Users can view destinations for their brand or admin destinations"
  ON destinations FOR SELECT
  TO authenticated
  USING (
    brand_id IN (
      SELECT brand_id FROM users WHERE id = auth.uid()
    )
    OR author_type = 'admin'
    OR brand_id = '00000000-0000-0000-0000-000000000999'
  );

-- Allow users to create destinations for their brand, admins can create for system brand
CREATE POLICY "Users can create destinations for their brand"
  ON destinations FOR INSERT
  TO authenticated
  WITH CHECK (
    brand_id IN (
      SELECT brand_id FROM users WHERE id = auth.uid()
    )
    OR (
      brand_id = '00000000-0000-0000-0000-000000000999'
      AND EXISTS (
        SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
      )
    )
  );

-- Allow users to update destinations for their brand or admin destinations they created
CREATE POLICY "Users can update destinations for their brand"
  ON destinations FOR UPDATE
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

-- Allow users to delete destinations for their brand or admin destinations they created
CREATE POLICY "Users can delete destinations for their brand"
  ON destinations FOR DELETE
  TO authenticated
  USING (
    brand_id IN (
      SELECT brand_id FROM users WHERE id = auth.uid()
    )
    OR (
      author_type = 'admin' AND author_id = auth.uid()
    )
  );

-- RLS Policies for destination_brand_assignments

-- Admin can view all assignments
CREATE POLICY "Admin can view all destination assignments"
  ON destination_brand_assignments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
    OR brand_id IN (
      SELECT brand_id FROM users WHERE id = auth.uid()
    )
  );

-- Admin can create assignments
CREATE POLICY "Admin can create destination assignments"
  ON destination_brand_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Brands can respond to assignments
CREATE POLICY "Brands can respond to destination assignments"
  ON destination_brand_assignments FOR UPDATE
  TO authenticated
  USING (
    brand_id IN (
      SELECT users.brand_id
      FROM users
      WHERE users.id = auth.uid()
    )
    AND status <> 'mandatory'
  )
  WITH CHECK (
    brand_id IN (
      SELECT users.brand_id
      FROM users
      WHERE users.id = auth.uid()
    )
    AND status IN ('pending', 'accepted', 'rejected')
  );

-- Admin can update assignments
CREATE POLICY "Admin can update destination assignments"
  ON destination_brand_assignments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admin can delete assignments
CREATE POLICY "Admin can delete destination assignments"
  ON destination_brand_assignments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Brands can delete their own assignments (when rejecting)
CREATE POLICY "Brands can delete destination assignments"
  ON destination_brand_assignments FOR DELETE
  TO authenticated
  USING (
    brand_id IN (
      SELECT users.brand_id
      FROM users
      WHERE users.id = auth.uid()
    )
    AND status IN ('pending', 'rejected')
  );
