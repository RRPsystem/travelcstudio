/*
  # Add metadata column to pages table for content type detection

  1. Changes
    - Add `metadata` JSONB column to `pages` table with default empty object
    - Add GIN index on metadata column for efficient JSON queries
    - Update existing pages to set metadata type based on slug patterns

  2. Metadata Structure
    ```json
    {
      "type": "destination" | "news" | "blog" | "page",
      "category": "string",
      "featured": boolean,
      "author": "string",
      "tags": ["string"]
    }
    ```

  3. Purpose
    - Enable better content detection for template integration
    - Allow filtering by content type
    - Support dynamic content loading in templates
    - Track additional page metadata for analytics
*/

-- Add metadata column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pages' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE pages ADD COLUMN metadata JSONB DEFAULT '{}';
  END IF;
END $$;

-- Create GIN index for efficient JSON queries
CREATE INDEX IF NOT EXISTS idx_pages_metadata ON pages USING GIN (metadata);

-- Update existing pages with type detection based on slug patterns
UPDATE pages
SET metadata = jsonb_set(
  COALESCE(metadata, '{}'::jsonb),
  '{type}',
  CASE
    WHEN slug LIKE 'destination-%' THEN '"destination"'
    WHEN slug LIKE 'news-%' THEN '"news"'
    WHEN slug LIKE 'blog-%' THEN '"blog"'
    ELSE '"page"'
  END::jsonb
)
WHERE metadata IS NULL OR NOT metadata ? 'type';

-- Add comment to column
COMMENT ON COLUMN pages.metadata IS 'JSONB metadata for content type detection and additional properties';