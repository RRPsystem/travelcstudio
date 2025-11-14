/*
  # Add RLS Policies for Website Pages Table

  1. Changes
    - Add SELECT policy for all authenticated users to view website pages
    - Add INSERT policy for brand users to create pages in their websites
    - Add UPDATE policy for brand users to update pages in their websites
    - Add DELETE policy for brand users to delete pages in their websites
  
  2. Security
    - Authenticated users can view all website pages
    - Only brand owners can modify pages in their websites
*/

-- Allow authenticated users to view website pages
CREATE POLICY "Authenticated users can view website pages"
  ON website_pages FOR SELECT
  TO authenticated
  USING (true);

-- Allow brand users to create pages in their websites
CREATE POLICY "Brand users can create website pages"
  ON website_pages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM websites
      INNER JOIN users ON users.brand_id = websites.brand_id
      WHERE websites.id = website_pages.website_id
      AND users.id = auth.uid()
    )
  );

-- Allow brand users to update pages in their websites
CREATE POLICY "Brand users can update website pages"
  ON website_pages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM websites
      INNER JOIN users ON users.brand_id = websites.brand_id
      WHERE websites.id = website_pages.website_id
      AND users.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM websites
      INNER JOIN users ON users.brand_id = websites.brand_id
      WHERE websites.id = website_pages.website_id
      AND users.id = auth.uid()
    )
  );

-- Allow brand users to delete pages in their websites
CREATE POLICY "Brand users can delete website pages"
  ON website_pages FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM websites
      INNER JOIN users ON users.brand_id = websites.brand_id
      WHERE websites.id = website_pages.website_id
      AND users.id = auth.uid()
    )
  );
