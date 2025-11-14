/*
  # Fix Roadmap Items Insert Policy
  
  1. Changes
    - Update the INSERT policy to allow users without brand_id to create items
    - Users can create items if:
      - They are the creator (created_by = auth.uid())
      - AND either:
        - brand_id matches their user.brand_id
        - OR both brand_id and user.brand_id are NULL
  
  2. Security
    - Maintains authentication requirement
    - Ensures users can only create items for their own brand (or NULL if they have no brand)
*/

-- Drop the old policy
DROP POLICY IF EXISTS "Brands and agents can create roadmap items" ON roadmap_items;

-- Create new policy that allows NULL brand_id
CREATE POLICY "Brands and agents can create roadmap items"
  ON roadmap_items FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid() AND
    (
      brand_id = (SELECT brand_id FROM users WHERE id = auth.uid())
      OR 
      (brand_id IS NULL AND (SELECT brand_id FROM users WHERE id = auth.uid()) IS NULL)
    )
  );
