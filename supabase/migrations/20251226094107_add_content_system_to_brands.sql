/*
  # Add content_system column to brands table
  
  This migration adds a content_system column to track whether a brand uses:
  - 'internal' - The internal website builder (Option A)
  - 'wordpress' - WordPress integration (Option B)
  
  1. Changes
    - Add content_system column to brands table
    - Set default to 'internal' for existing brands
    - Update brands with wordpress_url to 'wordpress'
*/

-- Add content_system column
ALTER TABLE brands 
ADD COLUMN IF NOT EXISTS content_system text DEFAULT 'internal'
CHECK (content_system IN ('internal', 'wordpress'));

-- Set wordpress mode for brands that have wordpress_url configured
UPDATE brands 
SET content_system = 'wordpress' 
WHERE wordpress_url IS NOT NULL AND wordpress_url != '';

-- Add comment to explain the column
COMMENT ON COLUMN brands.content_system IS 'Content management system: internal (builder) or wordpress';
