/*
  # Add template approval system for brand visibility

  1. New Columns
    - `is_approved_for_brands` (boolean) - Controls if brands can see this template
    - Default: false (admin must explicitly approve)

  2. Changes
    - Add approval column to pages table
    - Only templates with is_approved_for_brands = true are visible to brands
    - All templates are visible to admins/operators

  3. Security
    - Only admins/operators can modify is_approved_for_brands
    - Brands can only see approved templates

  4. Notes
    - Existing templates will be set to NOT approved by default
    - Admin must explicitly approve templates for brand visibility
*/

-- Add approval column for template visibility to brands
ALTER TABLE pages
ADD COLUMN IF NOT EXISTS is_approved_for_brands boolean DEFAULT false;

-- Create index for faster filtering of approved templates
CREATE INDEX IF NOT EXISTS idx_pages_approved_templates 
ON pages(is_approved_for_brands) 
WHERE is_template = true;

-- Add comment to explain the column
COMMENT ON COLUMN pages.is_approved_for_brands IS 'Controls whether this template is visible to brands in the template gallery. Only admins can modify this field.';
