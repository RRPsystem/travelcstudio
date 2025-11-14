/*
  # Add RLS policies for trip_participants table

  1. Changes
    - Add INSERT policy for brands to add participants to their own trips
    - Add SELECT policy for brands to view participants of their own trips
    - Add UPDATE policy for brands to update participants of their own trips
    - Add DELETE policy for brands to delete participants of their own trips
  
  2. Security
    - Brands can only manage participants for trips in their brand
*/

-- Enable RLS if not already enabled
ALTER TABLE trip_participants ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Brands can insert participants for own trips" ON trip_participants;
DROP POLICY IF EXISTS "Brands can view participants for own trips" ON trip_participants;
DROP POLICY IF EXISTS "Brands can update participants for own trips" ON trip_participants;
DROP POLICY IF EXISTS "Brands can delete participants for own trips" ON trip_participants;

-- INSERT: Brands can add participants to their own trips
CREATE POLICY "Brands can insert participants for own trips"
  ON trip_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (
    brand_id IN (
      SELECT brand_id FROM users WHERE id = auth.uid()
    )
  );

-- SELECT: Brands can view participants of their own trips
CREATE POLICY "Brands can view participants for own trips"
  ON trip_participants
  FOR SELECT
  TO authenticated
  USING (
    brand_id IN (
      SELECT brand_id FROM users WHERE id = auth.uid()
    )
  );

-- UPDATE: Brands can update participants of their own trips
CREATE POLICY "Brands can update participants for own trips"
  ON trip_participants
  FOR UPDATE
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

-- DELETE: Brands can delete participants of their own trips
CREATE POLICY "Brands can delete participants for own trips"
  ON trip_participants
  FOR DELETE
  TO authenticated
  USING (
    brand_id IN (
      SELECT brand_id FROM users WHERE id = auth.uid()
    )
  );