/*
  # Unify Template System - Version 3
  
  1. Changes
    - Drop the newly created website_templates table
    - Rename wordpress_templates to website_page_templates
    - Rename wordpress_sources to template_sources  
    - Add template_type field to support both WordPress and External Builder
    - Add external_page_id field for external builder page references
  
  2. Security
    - Maintain existing RLS policies with updated table names
*/

-- Drop the newly created website_templates table
DROP TABLE IF EXISTS website_templates CASCADE;

-- Drop old constraint from wordpress_templates before renaming
ALTER TABLE IF EXISTS wordpress_templates DROP CONSTRAINT IF EXISTS wordpress_templates_template_type_check;

-- Rename tables if they haven't been renamed yet
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'wordpress_sources') THEN
    ALTER TABLE wordpress_sources RENAME TO template_sources;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'wordpress_templates') THEN
    ALTER TABLE wordpress_templates RENAME TO website_page_templates;
  END IF;
END $$;

-- Drop any existing constraints that might conflict
ALTER TABLE IF EXISTS website_page_templates DROP CONSTRAINT IF EXISTS check_template_source;
ALTER TABLE IF EXISTS website_page_templates DROP CONSTRAINT IF EXISTS website_page_templates_template_type_check;
ALTER TABLE IF EXISTS website_page_templates DROP CONSTRAINT IF EXISTS wordpress_templates_wordpress_source_id_wp_page_id_key;

-- Update website_page_templates structure
DO $$
BEGIN
  -- Add template_type column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'website_page_templates' AND column_name = 'template_type'
  ) THEN
    ALTER TABLE website_page_templates ADD COLUMN template_type text;
  END IF;

  -- Add external_page_id column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'website_page_templates' AND column_name = 'external_page_id'
  ) THEN
    ALTER TABLE website_page_templates 
    ADD COLUMN external_page_id uuid REFERENCES pages(id) ON DELETE CASCADE;
  END IF;

  -- Add category_preview_url if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'website_page_templates' AND column_name = 'category_preview_url'
  ) THEN
    ALTER TABLE website_page_templates ADD COLUMN category_preview_url text;
  END IF;

  -- Rename name to template_name if needed
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'website_page_templates' AND column_name = 'name'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'website_page_templates' AND column_name = 'template_name'
  ) THEN
    ALTER TABLE website_page_templates RENAME COLUMN name TO template_name;
  END IF;

  -- Rename wordpress_source_id to template_source_id if needed
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'website_page_templates' AND column_name = 'wordpress_source_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'website_page_templates' AND column_name = 'template_source_id'
  ) THEN
    ALTER TABLE website_page_templates RENAME COLUMN wordpress_source_id TO template_source_id;
  END IF;
END $$;

-- Fix existing data: set template_type to 'wordpress' for all rows that don't have a valid type
UPDATE website_page_templates 
SET template_type = 'wordpress' 
WHERE template_type IS NULL OR template_type NOT IN ('wordpress', 'external_builder');

-- Make template_source_id nullable
ALTER TABLE website_page_templates ALTER COLUMN template_source_id DROP NOT NULL;

-- Add check constraint for template_type
ALTER TABLE website_page_templates 
ADD CONSTRAINT website_page_templates_template_type_check 
CHECK (template_type IN ('wordpress', 'external_builder'));

-- Create composite unique constraints based on template_type
DROP INDEX IF EXISTS website_page_templates_wordpress_unique;
CREATE UNIQUE INDEX website_page_templates_wordpress_unique 
ON website_page_templates(template_source_id, wp_page_id)
WHERE template_type = 'wordpress' AND template_source_id IS NOT NULL;

DROP INDEX IF EXISTS website_page_templates_builder_unique;
CREATE UNIQUE INDEX website_page_templates_builder_unique 
ON website_page_templates(external_page_id)
WHERE template_type = 'external_builder' AND external_page_id IS NOT NULL;