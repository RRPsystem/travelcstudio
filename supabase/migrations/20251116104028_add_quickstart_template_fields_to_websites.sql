/*
  # Add Quick Start Template Fields to Websites

  1. Changes
    - Add `template_name` column for storing template type (gotur/tripix)
    - Add `pages` JSONB column for storing page data from template editor
    - These fields support the Quick Start Templates integration

  2. Notes
    - Existing `content` field remains for backward compatibility
    - `pages` field stores array of page objects with html, name, path, etc.
*/

-- Add template_name column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'websites' AND column_name = 'template_name'
  ) THEN
    ALTER TABLE websites ADD COLUMN template_name text;
  END IF;
END $$;

-- Add pages JSONB column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'websites' AND column_name = 'pages'
  ) THEN
    ALTER TABLE websites ADD COLUMN pages jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;
