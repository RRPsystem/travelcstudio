/*
  # Create System Templates Brand

  1. Changes
    - Creates a system company for template management
    - Creates a special "System Templates" brand for admin template management
    - This brand is used by admins to create template pages that other brands can use
    - Sets a special flag `is_system_brand` to identify it

  2. Security
    - Only operators and admins can access this brand
*/

-- Add is_system_brand column to brands table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'brands' AND column_name = 'is_system_brand'
  ) THEN
    ALTER TABLE brands ADD COLUMN is_system_brand boolean DEFAULT false;
  END IF;
END $$;

-- Create System company if it doesn't exist
INSERT INTO companies (
  id,
  name,
  category,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'System',
  'internal',
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

-- Create System Templates brand if it doesn't exist
INSERT INTO brands (
  id,
  company_id,
  name,
  slug,
  is_system_brand,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'System Templates',
  'system-templates',
  true,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can access system brand" ON brands;
DROP POLICY IF EXISTS "Admins can manage system brand pages" ON pages;
DROP POLICY IF EXISTS "Admins can manage system brand menus" ON menus;
DROP POLICY IF EXISTS "Admins can manage system brand layouts" ON layouts;

-- Allow admins to access system brand
CREATE POLICY "Admins can access system brand"
  ON brands
  FOR ALL
  TO authenticated
  USING (
    is_system_brand = true 
    AND EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'operator')
    )
  );

-- Allow admins to create/edit pages in system brand
CREATE POLICY "Admins can manage system brand pages"
  ON pages
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM brands
      WHERE brands.id = pages.brand_id
      AND brands.is_system_brand = true
    )
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'operator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM brands
      WHERE brands.id = pages.brand_id
      AND brands.is_system_brand = true
    )
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'operator')
    )
  );

-- Allow admins to manage system brand menus
CREATE POLICY "Admins can manage system brand menus"
  ON menus
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM brands
      WHERE brands.id = menus.brand_id
      AND brands.is_system_brand = true
    )
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'operator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM brands
      WHERE brands.id = menus.brand_id
      AND brands.is_system_brand = true
    )
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'operator')
    )
  );

-- Allow admins to manage system brand layouts (footers)
CREATE POLICY "Admins can manage system brand layouts"
  ON layouts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM brands
      WHERE brands.id = layouts.brand_id
      AND brands.is_system_brand = true
    )
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'operator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM brands
      WHERE brands.id = layouts.brand_id
      AND brands.is_system_brand = true
    )
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'operator')
    )
  );