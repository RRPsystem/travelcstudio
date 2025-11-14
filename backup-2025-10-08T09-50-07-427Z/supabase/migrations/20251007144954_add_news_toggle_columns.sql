/*
  # Add Toggle Columns for News Items

  This migration adds columns to track whether news is enabled for brands, franchises, and if mandatory.

  ## Changes

  1. **Add columns to news_items table**
     - `enabled_for_brands` - Toggle for custom brands
     - `enabled_for_franchise` - Toggle for franchise brands
     - Both default to false

  ## Notes
     - These columns control which brands see the news items
     - is_mandatory column already exists from previous migration
*/

-- Add enabled_for_brands column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'news_items' AND column_name = 'enabled_for_brands'
  ) THEN
    ALTER TABLE news_items ADD COLUMN enabled_for_brands boolean DEFAULT false;
  END IF;
END $$;

-- Add enabled_for_franchise column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'news_items' AND column_name = 'enabled_for_franchise'
  ) THEN
    ALTER TABLE news_items ADD COLUMN enabled_for_franchise boolean DEFAULT false;
  END IF;
END $$;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_news_items_enabled_for_brands ON news_items(enabled_for_brands);
CREATE INDEX IF NOT EXISTS idx_news_items_enabled_for_franchise ON news_items(enabled_for_franchise);
