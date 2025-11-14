/*
  # Add tags column to news_items table

  1. Changes
    - Add `tags` column to news_items table as text array
    - This allows categorizing and filtering news items by tags
    - Examples: ['vakantie', 'tips', 'bestemming', 'aanbieding']

  2. Notes
    - Using text[] (PostgreSQL array) for simple tag storage
    - Tags can be used for filtering and grouping news items
    - Default is empty array
*/

-- Add tags column to news_items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'news_items' AND column_name = 'tags'
  ) THEN
    ALTER TABLE news_items ADD COLUMN tags text[] DEFAULT '{}';
  END IF;
END $$;

-- Create index for faster tag queries
CREATE INDEX IF NOT EXISTS idx_news_items_tags ON news_items USING GIN (tags);
