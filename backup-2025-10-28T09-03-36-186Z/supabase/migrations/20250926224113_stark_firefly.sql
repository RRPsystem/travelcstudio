/*
  # Add missing brand articles for testing

  1. Brand Articles
    - Add "test 8" and "test Alex" for The Travel Club
    - Add "Great Barrier Reef" for testing

  2. Admin Articles  
    - Add admin articles that are brand approved
    - These should show in the "Admin Artikelen" tab
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
  '{"text": "Test artikel 8 content voor The Travel Club"}',
  'Live',
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
  '{"text": "Test Alex artikel content voor The Travel Club"}',
  'Live',
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
  'Great Barrier Reef',
  'great-barrier-reef',
  '{"text": "Great Barrier Reef artikel content"}',
  'Live',
  true,
  false,
  true,
  'brand',
  '550e8400-e29b-41d4-a716-446655440001',
  '550e8400-e29b-41d4-a716-446655440001',
  '2025-09-23T15:00:00Z'
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
  '{"text": "Professional travel tips from admin team"}',
  'Published',
  true,
  true,
  true,
  'admin',
  NULL,
  '2025-09-24T09:00:00Z'
),
(
  '550e8400-e29b-41d4-a716-446655440051',
  'Best Travel Destinations 2025',
  'best-travel-destinations-2025',
  '{"text": "Top destinations for 2025 travel season"}',
  'Published',
  true,
  true,
  true,
  'admin',
  NULL,
  '2025-09-23T14:00:00Z'
)
ON CONFLICT (id) DO NOTHING;