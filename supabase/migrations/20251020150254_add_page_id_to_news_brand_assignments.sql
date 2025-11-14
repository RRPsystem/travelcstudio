/*
  # Add page_id to news_brand_assignments table

  1. Changes
    - Add `page_id` column to `news_brand_assignments` table
      - Links each news assignment to its corresponding website_pages entry
      - Allows Brand users to edit news content via Builder using page_id
    
  2. Purpose
    - Enable proper saving of news content through the Builder
    - Replace the old news_slug approach with page_id approach
    - Connect news assignments directly to their page representations
*/

-- Add page_id column to news_brand_assignments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'news_brand_assignments' AND column_name = 'page_id'
  ) THEN
    ALTER TABLE news_brand_assignments 
    ADD COLUMN page_id uuid REFERENCES website_pages(id) ON DELETE SET NULL;
    
    CREATE INDEX IF NOT EXISTS idx_news_brand_assignments_page_id 
    ON news_brand_assignments(page_id);
  END IF;
END $$;
