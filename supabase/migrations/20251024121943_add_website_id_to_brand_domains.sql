/*
  # Link Custom Domains to Websites
  
  ## Overview
  Adds the missing link between custom domains and websites to enable proper routing.
  
  ## Changes
  
  1. **Modify brand_domains table**
    - Add `website_id` column (foreign key to websites table)
    - Add index for faster lookups
    - Website ID is optional (can be NULL) to support brands without websites yet
  
  2. **Notes**
    - When a domain is linked to a website_id, the website-viewer will render that specific website
    - When website_id is NULL, the viewer falls back to brand_id + pages table (current behavior)
    - This allows gradual migration from pages to websites system
*/

-- Add website_id column to brand_domains
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'brand_domains' AND column_name = 'website_id'
  ) THEN
    ALTER TABLE brand_domains
    ADD COLUMN website_id uuid REFERENCES websites(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_brand_domains_website_id ON brand_domains(website_id);

-- Add helpful comment
COMMENT ON COLUMN brand_domains.website_id IS 'Optional: Links domain to a specific website. If NULL, falls back to brand_id for page lookups.';