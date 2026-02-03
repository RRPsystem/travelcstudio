/*
  # Add public read access to news_brand_assignments

  This allows the WordPress plugin (using anon key) to read news assignments
  for syncing content to WordPress sites.

  ## Changes
  1. Add SELECT policy for anon role on news_brand_assignments
*/

-- Allow public/anon read access to news_brand_assignments
CREATE POLICY "Public can read news assignments"
  ON news_brand_assignments
  FOR SELECT
  TO anon
  USING (true);
