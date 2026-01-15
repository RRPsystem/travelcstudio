/*
  # Simplify website type to content system choice
  
  1. Changes
    - Change `website_type` to only 2 options: 'ai_builder' or 'wordpress'
    - This determines the CONTENT SYSTEM, not the specific builder variant
    - Default remains 'internal' for existing brands (will map to ai_builder in UI)
  
  2. Purpose
    - Simplify brand configuration to focus on content source
    - ai_builder = all content (news, trips, destinations) via AI system
    - wordpress = all content via WordPress
    - Internal routing logic will handle QuickStart vs External Builder vs Internal
*/

-- Drop the old constraint
ALTER TABLE brands 
DROP CONSTRAINT IF EXISTS brands_website_type_check;

-- Add new constraint with only 2 content system options
ALTER TABLE brands 
ADD CONSTRAINT brands_website_type_check 
CHECK (website_type IN ('ai_builder', 'wordpress', 'internal', 'external_builder', 'quickstart'));

-- Update comment to reflect new purpose
COMMENT ON COLUMN brands.website_type IS 'Content system type: ai_builder (AI content system) or wordpress (WordPress content). Legacy values: internal, external_builder, quickstart map to ai_builder.';