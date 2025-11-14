/*
  # Fix trips delete policy

  The current delete policy is too restrictive for brand-owned trips.
  This migration allows brands to delete their own trips regardless of author fields.

  ## Changes
  - Drop existing delete policy
  - Create new policy that allows brands to delete trips with their brand_id
*/

-- Drop existing delete policy
DROP POLICY IF EXISTS "Users can delete trips for their brand" ON trips;

-- Create new delete policy that allows brands to delete their own trips
CREATE POLICY "Users can delete trips for their brand"
  ON trips FOR DELETE
  TO authenticated
  USING (
    brand_id IN (
      SELECT brand_id FROM users WHERE id = auth.uid()
    )
  );