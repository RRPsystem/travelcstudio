/*
  # Fix Template Insert Policy for Dummy Brand ID

  ## Overview
  This migration fixes the template insert policy to allow both NULL brand_id 
  and the dummy brand_id used by the builder ('00000000-0000-0000-0000-000000000999').

  ## Changes
  
  1. Policy Updates
    - Update "Admins can create page templates" policy to accept dummy brand_id
    - Keep the existing NULL check for backward compatibility
    
  ## Security
    - Still requires admin role for template creation
    - Only affects template creation, not brand pages
    - Maintains RLS security for all other operations
*/

-- Drop the existing policy
DROP POLICY IF EXISTS "Admins can create page templates" ON pages;

-- Recreate with updated logic to allow dummy brand_id
CREATE POLICY "Admins can create page templates"
  ON pages FOR INSERT
  TO authenticated
  WITH CHECK (
    is_template = true AND
    (brand_id IS NULL OR brand_id = '00000000-0000-0000-0000-000000000999') AND
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );
