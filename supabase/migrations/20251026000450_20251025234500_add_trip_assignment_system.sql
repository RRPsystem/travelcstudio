/*
  # Add Assignment System to Trips

  This migration implements the same assignment system for trips as exists for news items and destinations.
  Admin users can create trips and assign them to brands, who can then accept/reject and customize them.

  ## Changes

  1. **Add columns to trips table**
     - `author_type` (text) - Type of author: 'admin', 'brand', 'agent'
     - `author_id` (uuid) - ID of the author (user id)
     - `is_mandatory` (boolean) - Whether trip is mandatory for brands
     - `enabled_for_brands` (boolean) - Toggle for custom brands
     - `enabled_for_franchise` (boolean) - Toggle for franchise brands

  2. **Create trip_brand_assignments table**
     - Links trips to brands with approval workflow
     - Tracks status: 'pending', 'accepted', 'rejected', 'mandatory'
     - Includes is_published toggle and page_id for website integration

  3. **Update RLS policies**
     - Allow admins to view/manage all trips
     - Allow brands to view trips for their brand or admin-created ones
     - Control assignment workflow permissions

  ## Security
     - All tables have RLS enabled
     - Brands can only manage their own trips and assignments
     - Admins can manage all content

  ## Notes
     - Follows the same pattern as news_items and destinations
     - Admin creates trips for system brand (00000000-0000-0000-0000-000000000999)
     - Brands can create their own trips
     - Assignments enable admin-to-brand content distribution
*/

-- Add author_type column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'author_type'
  ) THEN
    ALTER TABLE trips ADD COLUMN author_type text CHECK (author_type IN ('admin', 'brand', 'agent'));
  END IF;
END $$;

-- Add author_id column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'author_id'
  ) THEN
    ALTER TABLE trips ADD COLUMN author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add is_mandatory column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'is_mandatory'
  ) THEN
    ALTER TABLE trips ADD COLUMN is_mandatory boolean DEFAULT false;
  END IF;
END $$;

-- Add enabled_for_brands column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'enabled_for_brands'
  ) THEN
    ALTER TABLE trips ADD COLUMN enabled_for_brands boolean DEFAULT false;
  END IF;
END $$;

-- Add enabled_for_franchise column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'enabled_for_franchise'
  ) THEN
    ALTER TABLE trips ADD COLUMN enabled_for_franchise boolean DEFAULT false;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_trips_author_type ON trips(author_type);
CREATE INDEX IF NOT EXISTS idx_trips_author_id ON trips(author_id);
CREATE INDEX IF NOT EXISTS idx_trips_is_mandatory ON trips(is_mandatory);
CREATE INDEX IF NOT EXISTS idx_trips_enabled_for_brands ON trips(enabled_for_brands);
CREATE INDEX IF NOT EXISTS idx_trips_enabled_for_franchise ON trips(enabled_for_franchise);

-- Create trip_brand_assignments table
CREATE TABLE IF NOT EXISTS trip_brand_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  brand_id uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'mandatory')),
  assigned_at timestamptz DEFAULT now(),
  responded_at timestamptz,
  is_published boolean DEFAULT false,
  page_id uuid REFERENCES website_pages(id) ON DELETE SET NULL,
  UNIQUE(trip_id, brand_id)
);

-- Create indexes for trip_brand_assignments
CREATE INDEX IF NOT EXISTS idx_trip_assignments_trip ON trip_brand_assignments(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_assignments_brand ON trip_brand_assignments(brand_id);
CREATE INDEX IF NOT EXISTS idx_trip_assignments_status ON trip_brand_assignments(status);
CREATE INDEX IF NOT EXISTS idx_trip_assignments_page ON trip_brand_assignments(page_id);

-- Enable RLS on trip_brand_assignments
ALTER TABLE trip_brand_assignments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies on trips
DROP POLICY IF EXISTS "Users can view trips for their brand" ON trips;
DROP POLICY IF EXISTS "Users can create trips for their brand" ON trips;
DROP POLICY IF EXISTS "Users can update trips for their brand" ON trips;
DROP POLICY IF EXISTS "Users can delete trips for their brand" ON trips;

-- Updated RLS Policies for trips

-- Allow users to view trips for their brand or admin trips
CREATE POLICY "Users can view trips for their brand or admin trips"
  ON trips FOR SELECT
  TO authenticated
  USING (
    brand_id IN (
      SELECT brand_id FROM users WHERE id = auth.uid()
    )
    OR author_type = 'admin'
    OR brand_id = '00000000-0000-0000-0000-000000000999'
  );

-- Allow users to create trips for their brand, admins can create for system brand
CREATE POLICY "Users can create trips for their brand"
  ON trips FOR INSERT
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

-- Allow users to update trips for their brand or admin trips they created
CREATE POLICY "Users can update trips for their brand"
  ON trips FOR UPDATE
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

-- Allow users to delete trips for their brand or admin trips they created
CREATE POLICY "Users can delete trips for their brand"
  ON trips FOR DELETE
  TO authenticated
  USING (
    brand_id IN (
      SELECT brand_id FROM users WHERE id = auth.uid()
    )
    OR (
      author_type = 'admin' AND author_id = auth.uid()
    )
  );

-- RLS Policies for trip_brand_assignments

-- Admin can view all assignments
CREATE POLICY "Admin can view all trip assignments"
  ON trip_brand_assignments FOR SELECT
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
CREATE POLICY "Admin can create trip assignments"
  ON trip_brand_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Brands can respond to assignments
CREATE POLICY "Brands can respond to trip assignments"
  ON trip_brand_assignments FOR UPDATE
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
CREATE POLICY "Admin can update trip assignments"
  ON trip_brand_assignments FOR UPDATE
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
CREATE POLICY "Admin can delete trip assignments"
  ON trip_brand_assignments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Brands can delete their own assignments (when rejecting)
CREATE POLICY "Brands can delete trip assignments"
  ON trip_brand_assignments FOR DELETE
  TO authenticated
  USING (
    brand_id IN (
      SELECT users.brand_id
      FROM users
      WHERE users.id = auth.uid()
    )
    AND status IN ('pending', 'rejected')
  );
