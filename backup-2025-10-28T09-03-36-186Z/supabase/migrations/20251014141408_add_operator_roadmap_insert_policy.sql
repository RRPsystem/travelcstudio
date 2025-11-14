/*
  # Add operator insert policy for roadmap items

  1. Changes
    - Add policy allowing operators to insert roadmap items without brand_id requirement
    - Operators can create items for any brand or as system-wide items
  
  2. Security
    - Only authenticated operators can use this policy
    - Maintains existing policies for brands/agents
*/

-- Add operator insert policy
CREATE POLICY "Operators can create roadmap items"
  ON roadmap_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'operator'
    )
  );