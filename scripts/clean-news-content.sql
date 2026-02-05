-- Clean builder HTML from news_items content field
-- Run this in Supabase SQL Editor

-- First, check which items have builder HTML
SELECT id, title, 
       LEFT(content::text, 100) as content_preview
FROM news_items 
WHERE content::text LIKE '%<style%' 
   OR content::text LIKE '%wb-block%' 
   OR content::text LIKE '%Reset & Base Styles%'
   OR content::text LIKE '%canvas-area%';

-- Then run this to clear the content field for affected items (content is JSON type)
UPDATE news_items 
SET content = NULL
WHERE content::text LIKE '%<style%' 
   OR content::text LIKE '%wb-block%' 
   OR content::text LIKE '%Reset & Base Styles%'
   OR content::text LIKE '%canvas-area%';
