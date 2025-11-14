/*
  # Add delete policy for brands on news_brand_assignments

  1. Changes
    - Add DELETE policy for brand users to delete their own assignments
    
  2. Security
    - Brands can only delete assignments for their own brand_id
    - Uses RLS to ensure data isolation
*/

-- Drop policy if it exists (ignore error if it doesn't)
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Brands can delete own assignments" ON news_brand_assignments;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Add delete policy for brands
CREATE POLICY "Brands can delete own assignments"
  ON news_brand_assignments
  FOR DELETE
  TO authenticated
  USING (
    brand_id IN (
      SELECT brand_id 
      FROM users 
      WHERE id = auth.uid() 
      AND role = 'brand'
    )
  );
