/*
  # Add is_published Column to News Brand Assignments

  This migration adds the is_published column to track whether a brand wants to publish a news item on their website.

  ## Changes

  1. **Add column to news_brand_assignments table**
     - `is_published` - Boolean to track if brand wants to publish this news
     - Defaults to false
     - Only applies to approved or mandatory news items

  ## Notes
     - Brands can only publish news that is approved or mandatory
     - This column controls whether the news appears on the brand's public website
*/

-- Add is_published column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'news_brand_assignments' AND column_name = 'is_published'
  ) THEN
    ALTER TABLE news_brand_assignments ADD COLUMN is_published boolean DEFAULT false;
  END IF;
END $$;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_news_brand_assignments_is_published ON news_brand_assignments(is_published);
