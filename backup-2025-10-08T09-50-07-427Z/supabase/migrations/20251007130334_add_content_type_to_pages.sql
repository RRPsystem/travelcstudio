/*
  # Add content_type to pages table

  1. Changes
    - Add `content_type` column to `pages` table with default 'page'
    - Update existing rows to set content_type based on naming patterns
    - This allows us to distinguish between regular pages and news items stored in pages table

  2. Notes
    - Default content_type is 'page'
    - News items can be identified and filtered separately
*/

-- Add content_type column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pages' AND column_name = 'content_type'
  ) THEN
    ALTER TABLE pages ADD COLUMN content_type text DEFAULT 'page';
  END IF;
END $$;

-- Update any pages that might be news items (based on slug patterns containing 'nb' or 'news')
UPDATE pages 
SET content_type = 'news'
WHERE (slug LIKE '%-nb' OR slug LIKE 'news-%' OR slug LIKE 'nieuw-%' OR title ILIKE '%NB%')
  AND content_type = 'page';

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_pages_content_type ON pages(content_type);
