/*
  # Update Roadmap Category Constraint to Dutch
  
  1. Changes
    - Drop old category constraint (feature, improvement, bug_fix, integration)
    - Add new constraint with Dutch categories:
      - ai_tools (AI Tools)
      - website (Website)
      - traveldingen (Traveldingen)
      - uitbreiding (Uitbreiding)
      - bug_probleem (Bug/Probleem)
      - content (Content)
    - Migrate existing data to new categories
  
  2. Security
    - Maintains data integrity with proper category validation
*/

-- Drop the old constraint
ALTER TABLE roadmap_items DROP CONSTRAINT IF EXISTS roadmap_items_category_check;

-- Migrate existing data to new Dutch categories
UPDATE roadmap_items SET category = 'ai_tools' WHERE category = 'feature';
UPDATE roadmap_items SET category = 'uitbreiding' WHERE category = 'improvement';
UPDATE roadmap_items SET category = 'bug_probleem' WHERE category = 'bug_fix';
UPDATE roadmap_items SET category = 'website' WHERE category = 'integration';

-- Add new constraint with Dutch categories
ALTER TABLE roadmap_items ADD CONSTRAINT roadmap_items_category_check 
  CHECK (category IN ('ai_tools', 'website', 'traveldingen', 'uitbreiding', 'bug_probleem', 'content'));
