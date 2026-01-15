/*
  # Add URL columns and status to websites table

  1. Changes
    - Add `preview_url` TEXT column for subdomain URLs
    - Add `live_url` TEXT column for custom domain URLs
    - Add `status` TEXT column with CHECK constraint
    - Add indexes for efficient URL queries
    - Update existing websites to have preview URLs based on brand slug

  2. Status Values
    - `draft`: Website created but not published
    - `preview`: Published to preview subdomain
    - `live`: Published to custom domain

  3. URL Structure
    - Preview: `{brand-slug}.ai-websitestudio.nl`
    - Live: Custom domain from brand settings
*/

-- Add columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'websites' AND column_name = 'preview_url'
  ) THEN
    ALTER TABLE websites ADD COLUMN preview_url TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'websites' AND column_name = 'live_url'
  ) THEN
    ALTER TABLE websites ADD COLUMN live_url TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'websites' AND column_name = 'status'
  ) THEN
    ALTER TABLE websites ADD COLUMN status TEXT DEFAULT 'draft';
  END IF;
END $$;

-- Add constraint for status values if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'websites_status_check'
  ) THEN
    ALTER TABLE websites 
    ADD CONSTRAINT websites_status_check 
    CHECK (status IN ('draft', 'preview', 'live'));
  END IF;
END $$;

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_websites_preview_url ON websites(preview_url);
CREATE INDEX IF NOT EXISTS idx_websites_live_url ON websites(live_url);
CREATE INDEX IF NOT EXISTS idx_websites_status ON websites(status);

-- Update existing websites with preview URLs based on brand slug
UPDATE websites w
SET preview_url = b.slug || '.ai-websitestudio.nl',
    status = CASE 
      WHEN w.published_at IS NOT NULL THEN 'preview'
      ELSE 'draft'
    END
FROM brands b
WHERE w.brand_id = b.id
  AND (w.preview_url IS NULL OR w.preview_url = '');

-- Add comments
COMMENT ON COLUMN websites.preview_url IS 'Preview subdomain URL: {brand-slug}.ai-websitestudio.nl';
COMMENT ON COLUMN websites.live_url IS 'Custom domain URL configured in brand settings';
COMMENT ON COLUMN websites.status IS 'Website publication status: draft, preview, or live';