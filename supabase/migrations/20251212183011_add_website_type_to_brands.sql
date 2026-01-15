/*
  # Add website type to brands
  
  1. Changes
    - Add `website_type` column to brands table
    - Possible values: 'wordpress', 'external_builder', 'quickstart', 'internal'
    - Default to 'internal' for existing brands
  
  2. Purpose
    - Track which website/builder system each brand uses
    - Determines whether to open internal editor or external builder for news/content
*/

-- Add website_type column to brands
ALTER TABLE brands 
ADD COLUMN IF NOT EXISTS website_type text 
DEFAULT 'internal' 
CHECK (website_type IN ('wordpress', 'external_builder', 'quickstart', 'internal'));

-- Add helpful comment
COMMENT ON COLUMN brands.website_type IS 'Type of website system: wordpress, external_builder, quickstart, or internal';