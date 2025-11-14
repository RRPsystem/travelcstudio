/*
  # Restore Missing Articles Data

  1. Re-insert Articles
    - Admin articles (test2, Admin vliegen)
    - Brand articles (test 8, test Alex, Great Barrier Reef)

  2. Ensure Data Consistency
    - Check if articles exist before inserting
    - Use proper brand_id references
    - Set correct author_type values
*/

-- Re-insert admin articles
INSERT INTO news_articles (
  id, 
  title, 
  slug, 
  content,
  status, 
  brand_approved, 
  brand_mandatory, 
  website_visible, 
  author_type,
  created_at
) 
SELECT 
  '550e8400-e29b-41d4-a716-446655440030',
  'test2',
  'test2',
  '{"text": "Test artikel 2 inhoud"}',
  'Brand Toegang',
  false,
  true,
  false,
  'admin',
  '2025-09-24T10:00:00Z'
WHERE NOT EXISTS (SELECT 1 FROM news_articles WHERE slug = 'test2');

INSERT INTO news_articles (
  id, 
  title, 
  slug, 
  content,
  status, 
  brand_approved, 
  brand_mandatory, 
  website_visible, 
  author_type,
  created_at
) 
SELECT 
  '550e8400-e29b-41d4-a716-446655440031',
  'Admin vliegen',
  'admin-vliegen',
  '{"text": "Admin artikel over vliegen"}',
  'Brand Toegang',
  true,
  true,
  true,
  'admin',
  '2025-09-24T11:00:00Z'
WHERE NOT EXISTS (SELECT 1 FROM news_articles WHERE slug = 'admin-vliegen');

-- Re-insert brand articles for The Travel Club
INSERT INTO news_articles (
  id, 
  title, 
  slug, 
  content,
  status, 
  brand_approved, 
  brand_mandatory, 
  website_visible, 
  author_type,
  brand_id,
  author_brand_id,
  created_at
) 
SELECT 
  '550e8400-e29b-41d4-a716-446655440032',
  'test 8',
  'test-8',
  '{"text": "Test artikel 8 door The Travel Club"}',
  'Live',
  true,
  false,
  true,
  'brand',
  '550e8400-e29b-41d4-a716-446655440001',
  '550e8400-e29b-41d4-a716-446655440001',
  '2025-09-24T12:00:00Z'
WHERE NOT EXISTS (SELECT 1 FROM news_articles WHERE slug = 'test-8');

INSERT INTO news_articles (
  id, 
  title, 
  slug, 
  content,
  status, 
  brand_approved, 
  brand_mandatory, 
  website_visible, 
  author_type,
  brand_id,
  author_brand_id,
  created_at
) 
SELECT 
  '550e8400-e29b-41d4-a716-446655440033',
  'test Alex',
  'test-alex',
  '{"text": "Test artikel door Alex van The Travel Club"}',
  'Live',
  true,
  false,
  true,
  'brand',
  '550e8400-e29b-41d4-a716-446655440001',
  '550e8400-e29b-41d4-a716-446655440001',
  '2025-09-24T13:00:00Z'
WHERE NOT EXISTS (SELECT 1 FROM news_articles WHERE slug = 'test-alex');

INSERT INTO news_articles (
  id, 
  title, 
  slug, 
  content,
  status, 
  brand_approved, 
  brand_mandatory, 
  website_visible, 
  author_type,
  brand_id,
  author_brand_id,
  created_at
) 
SELECT 
  '550e8400-e29b-41d4-a716-446655440034',
  'Great Barrier Reef',
  'great-barrier-reef',
  '{"text": "Artikel over Great Barrier Reef"}',
  'Brand Toegang',
  true,
  true,
  true,
  'brand',
  '550e8400-e29b-41d4-a716-446655440001',
  '550e8400-e29b-41d4-a716-446655440001',
  '2025-09-23T14:00:00Z'
WHERE NOT EXISTS (SELECT 1 FROM news_articles WHERE slug = 'great-barrier-reef');

-- Verify data
SELECT 
  title,
  author_type,
  brand_approved,
  brand_mandatory,
  website_visible,
  created_at
FROM news_articles 
ORDER BY created_at DESC;