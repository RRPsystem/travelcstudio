/*
  # Add closing_text field to news_items

  1. Changes
    - Add `closing_text` column to `news_items` table
    - This field stores the closing/concluding text for news articles

  2. Notes
    - Field is optional (nullable)
    - Uses text type for flexible content length
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'news_items' AND column_name = 'closing_text'
  ) THEN
    ALTER TABLE news_items ADD COLUMN closing_text text;
  END IF;
END $$;