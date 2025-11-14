/*
  # Add template ordering and theme labels

  1. New Columns
    - `sort_order` (integer) - For custom sorting of templates
    - `theme_label` (text) - For grouping templates by theme (e.g., "Golf", "Travel", "Business")

  2. Changes
    - Add sort_order column with default value
    - Add theme_label column (nullable)
    - Add index on sort_order for faster sorting
    - Add index on theme_label for filtering

  3. Notes
    - Existing templates will get default sort_order values
    - Theme label is optional and can be used to group related templates
*/

-- Add sort_order column for custom template ordering
ALTER TABLE pages
ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;

-- Add theme_label for grouping templates by theme
ALTER TABLE pages
ADD COLUMN IF NOT EXISTS theme_label text;

-- Create index on sort_order for better performance when sorting
CREATE INDEX IF NOT EXISTS idx_pages_sort_order 
ON pages(sort_order) 
WHERE is_template = true;

-- Create index on theme_label for filtering by theme
CREATE INDEX IF NOT EXISTS idx_pages_theme_label 
ON pages(theme_label) 
WHERE is_template = true;

-- Set initial sort_order values based on created_at (newest first)
UPDATE pages 
SET sort_order = subquery.row_num
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at DESC) as row_num
  FROM pages
  WHERE is_template = true
) as subquery
WHERE pages.id = subquery.id 
  AND pages.is_template = true
  AND pages.sort_order = 0;