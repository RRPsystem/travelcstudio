/*
  # Fix GoWild Preview URL - HTTP naar HTTPS
  
  1. Changes
    - Update preview_url van HTTP naar HTTPS voor GoWild template
    - Dit lost de Mixed Content warning op in browsers
*/

UPDATE builder_categories
SET 
  preview_url = 'https://www.traveltemplate.nl/wp-content/uploads/2025/11/gowilds.png',
  updated_at = now()
WHERE category_slug = 'gowild'
  AND preview_url LIKE 'http://%';
