/*
  # Fix Brand Assignments Publish Toggle

  This migration updates the RLS policy to allow brands to set assignments to 'pending' status
  when turning off the publish toggle.

  ## Changes

  1. **Update RLS policy on news_brand_assignments**
     - Allow brands to update status to 'pending', 'accepted', or 'rejected'
     - Previously only allowed 'accepted' or 'rejected'
     - This enables the publish toggle to work both ways (on and off)

  ## Security

  - Brands can only update their own assignments (checked via brand_id)
  - Cannot update mandatory assignments (status <> 'mandatory')
*/

-- Drop the old policy
DROP POLICY IF EXISTS "Brands can respond to assignments" ON news_brand_assignments;

-- Create updated policy that allows pending status
CREATE POLICY "Brands can respond to assignments"
  ON news_brand_assignments
  FOR UPDATE
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
