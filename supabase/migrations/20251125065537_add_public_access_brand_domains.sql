/*
  # Add public read access to brand_domains for subdomain routing
  
  1. Changes
    - Add SELECT policy for anonymous users on brand_domains table
    - Allows public access to verified domains for website routing
  
  2. Security
    - Only SELECT access granted
    - Only for verified domains
    - Required for subdomain website viewing
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'brand_domains' 
    AND policyname = 'Public can view verified domains'
  ) THEN
    CREATE POLICY "Public can view verified domains"
      ON brand_domains
      FOR SELECT
      TO anon
      USING (status = 'verified');
  END IF;
END $$;
