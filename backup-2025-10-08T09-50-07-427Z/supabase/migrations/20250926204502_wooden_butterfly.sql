/*
  # Add missing brand articles

  1. New Data
    - Add brand articles for The Travel Club
    - Add admin articles that are brand approved
    - Ensure proper UUIDs and relationships

  2. Articles Added
    - Brand articles: "test 8", "test Alex" 
    - Admin articles: "Admin Travel Tips", "Best Destinations 2025"
*/

-- Insert brand articles for The Travel Club
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
) VALUES 
(
  '550e8400-e29b-41d4-a716-446655440040',
  'test 8',
  'test-8',
  '{"text": "Dit is test artikel 8 geschreven door The Travel Club brand."}',
  'published',
  true,
  false,
  true,
  'brand',
  '550e8400-e29b-41d4-a716-446655440001',
  '550e8400-e29b-41d4-a716-446655440001',
  '2025-09-24T10:00:00Z'
),
(
  '550e8400-e29b-41d4-a716-446655440041',
  'test Alex',
  'test-alex',
  '{"text": "Dit is test artikel van Alex voor The Travel Club."}',
  'published',
  true,
  false,
  true,
  'brand',
  '550e8400-e29b-41d4-a716-446655440001',
  '550e8400-e29b-41d4-a716-446655440001',
  '2025-09-24T11:00:00Z'
),
(
  '550e8400-e29b-41d4-a716-446655440042',
  'Summer Destinations Guide',
  'summer-destinations-guide',
  '{"text": "Complete gids voor zomerbestemmingen 2025."}',
  'published',
  true,
  false,
  true,
  'brand',
  '550e8400-e29b-41d4-a716-446655440001',
  '550e8400-e29b-41d4-a716-446655440001',
  '2025-09-24T12:00:00Z'
)
ON CONFLICT (id) DO NOTHING;

-- Insert admin articles that are brand approved
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
  created_at
) VALUES
(
  '550e8400-e29b-41d4-a716-446655440050',
  'Admin Travel Tips',
  'admin-travel-tips',
  '{"text": "Professionele reistips van onze experts."}',
  'published',
  true,
  true,
  true,
  'admin',
  NULL,
  '2025-09-24T08:00:00Z'
),
(
  '550e8400-e29b-41d4-a716-446655440051',
  'Best Destinations 2025',
  'best-destinations-2025',
  '{"text": "De beste reisbestemmingen voor 2025."}',
  'published',
  true,
  true,
  true,
  'admin',
  NULL,
  '2025-09-24T09:00:00Z'
)
ON CONFLICT (id) DO NOTHING;