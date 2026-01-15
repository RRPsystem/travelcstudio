/*
  # Simplify WordPress Templates Structure
  
  1. Changes
    - Rename `name` to `template_name` (page name: Home, Over Ons, Contact)
    - `category` = main template name (Traveler, Amerika) - what brands choose
    - Add `category_preview_url` for the main template preview image
    - Keep it simple: category groups pages together
    
  2. Structure
    Category "Traveler" (with preview)
      ├── Home (page)
      ├── Over Ons (page)
      └── Contact (page)
    
  3. Benefits
    - Simple and clear structure
    - Easy to understand: category = template, template_name = page
    - Preview image at category level
    - Brands choose category, get all pages
*/

-- Rename 'name' to 'template_name' for clarity
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wordpress_templates' AND column_name = 'name'
  ) THEN
    ALTER TABLE wordpress_templates 
    RENAME COLUMN name TO template_name;
  END IF;
END $$;

-- Add category_preview_url to store preview at category level
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wordpress_templates' AND column_name = 'category_preview_url'
  ) THEN
    ALTER TABLE wordpress_templates 
    ADD COLUMN category_preview_url text;
  END IF;
END $$;

-- Update existing data: copy preview_image_url to category_preview_url for first item of each category
UPDATE wordpress_templates wt1
SET category_preview_url = wt1.preview_image_url
WHERE wt1.id IN (
  SELECT DISTINCT ON (category) id
  FROM wordpress_templates
  WHERE category IS NOT NULL AND category != 'general'
  ORDER BY category, created_at
);

-- Add helpful comments
COMMENT ON COLUMN wordpress_templates.category IS 'Template collection name (e.g., Traveler, Amerika) - this is what brands choose';
COMMENT ON COLUMN wordpress_templates.template_name IS 'Individual page name within the template (e.g., Home, Over Ons, Contact)';
COMMENT ON COLUMN wordpress_templates.category_preview_url IS 'Preview image for the entire template category - shown when selecting template';
COMMENT ON COLUMN wordpress_templates.preview_image_url IS 'Preview image for individual page (optional)';
