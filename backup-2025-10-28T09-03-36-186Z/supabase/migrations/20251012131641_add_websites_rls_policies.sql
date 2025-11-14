/*
  # Add RLS Policies for Websites Table

  1. Changes
    - Add SELECT policy for all authenticated users to view websites
    - Add INSERT policy for brand users to create websites
    - Add UPDATE policy for brand users to update their own websites
    - Add DELETE policy for brand users to delete their own websites
  
  2. Security
    - Authenticated users can view all websites
    - Only brand owners can modify their websites
*/

-- Allow authenticated users to view websites
CREATE POLICY "Authenticated users can view websites"
  ON websites FOR SELECT
  TO authenticated
  USING (true);

-- Allow brand users to create websites
CREATE POLICY "Brand users can create websites"
  ON websites FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.brand_id = brand_id
    )
  );

-- Allow brand users to update their own websites
CREATE POLICY "Brand users can update own websites"
  ON websites FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.brand_id = websites.brand_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.brand_id = websites.brand_id
    )
  );

-- Allow brand users to delete their own websites
CREATE POLICY "Brand users can delete own websites"
  ON websites FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.brand_id = websites.brand_id
    )
  );
