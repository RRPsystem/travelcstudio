/*
  # Add WordPress Credentials to Brands
  
  1. Changes
    - Add `wordpress_url` (text) - Base URL of brand's WordPress site
    - Add `wordpress_username` (text) - WordPress username for API access
    - Add `wordpress_app_password` (text, encrypted) - WordPress Application Password
    - Add `wordpress_connected` (boolean) - Whether WordPress is connected and verified
  
  2. Purpose
    - Allow brands with `website_type = 'wordpress'` to connect their WordPress site
    - Store credentials securely for syncing pages from WordPress
    - Enable automatic page synchronization from WordPress to Bolt
  
  3. Security
    - Credentials are only accessible by the brand owner
    - Use WordPress Application Passwords (not regular passwords)
*/

-- Add WordPress credential fields to brands table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'brands' AND column_name = 'wordpress_url'
  ) THEN
    ALTER TABLE brands ADD COLUMN wordpress_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'brands' AND column_name = 'wordpress_username'
  ) THEN
    ALTER TABLE brands ADD COLUMN wordpress_username text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'brands' AND column_name = 'wordpress_app_password'
  ) THEN
    ALTER TABLE brands ADD COLUMN wordpress_app_password text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'brands' AND column_name = 'wordpress_connected'
  ) THEN
    ALTER TABLE brands ADD COLUMN wordpress_connected boolean DEFAULT false;
  END IF;
END $$;

-- Add comments
COMMENT ON COLUMN brands.wordpress_url IS 'Base URL of brand''s WordPress site (e.g., https://example.com)';
COMMENT ON COLUMN brands.wordpress_username IS 'WordPress username for REST API authentication';
COMMENT ON COLUMN brands.wordpress_app_password IS 'WordPress Application Password for secure API access';
COMMENT ON COLUMN brands.wordpress_connected IS 'Whether WordPress connection is verified and working';
