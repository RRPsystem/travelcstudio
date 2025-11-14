/*
  # Add TravelBRO Domain to Brands

  ## Overview
  Adds dedicated TravelBRO domain field to brands table for branded chat links.

  ## Changes
  1. New Column
    - `travelbro_domain` (text, unique) - Custom domain for TravelBRO chat links
    - Optional field, brands can use default domain or set custom one
    - Example: chat.jouwreisbureau.nl → /travelbro/{token} links use this domain

  ## Notes
  - This is separate from website domains (brand_domains table)
  - Only for TravelBRO chat interface links
  - When set, all generated share links use this domain
  - No DNS verification needed (handled by brand's DNS)
*/

-- Add travelbro_domain column to brands table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'brands' AND column_name = 'travelbro_domain'
  ) THEN
    ALTER TABLE brands ADD COLUMN travelbro_domain text UNIQUE;

    -- Add constraint for valid domain format
    ALTER TABLE brands ADD CONSTRAINT valid_travelbro_domain
      CHECK (travelbro_domain IS NULL OR travelbro_domain ~* '^[a-z0-9]([a-z0-9\-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9\-]{0,61}[a-z0-9])?)*$');
  END IF;
END $$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_brands_travelbro_domain ON brands(travelbro_domain) WHERE travelbro_domain IS NOT NULL;

-- Add comment
COMMENT ON COLUMN brands.travelbro_domain IS 'Custom domain for TravelBRO chat links (e.g., chat.reisbureau.nl)';
