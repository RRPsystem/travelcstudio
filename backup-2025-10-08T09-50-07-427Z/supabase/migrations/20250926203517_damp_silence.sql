/*
  # Add missing news articles

  1. New Data
    - Add sample news articles for The Travel Club brand
    - Add admin articles that are brand approved
    - Set proper brand_id relationships

  2. Articles Added
    - Brand articles for The Travel Club
    - Admin articles with brand access
    - Various statuses and permissions
*/

-- Insert news articles for The Travel Club brand
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
-- Brand articles for The Travel Club
(
  '550e8400-e29b-41d4-a716-446655440040',
  'test 8',
  'test-8',
  '{"content": "Sample content for test 8 article"}',
  'published',
  true,
  false,
  true,
  'brand',
  '550e8400-e29b-41d4-a716-446655440001',
  '2025-09-24T10:00:00Z'
),
(
  '550e8400-e29b-41d4-a716-446655440041',
  'test Alex',
  'test-alex',
  '{"content": "Sample content for test Alex article"}',
  'published',
  true,
  false,
  true,
  'brand',
  '550e8400-e29b-41d4-a716-446655440001',
  '2025-09-24T11:00:00Z'
),
(
  '550e8400-e29b-41d4-a716-446655440042',
  'Summer Destinations Guide',
  'summer-destinations-guide',
  '{"content": "Complete guide to summer travel destinations"}',
  'published',
  true,
  false,
  true,
  'brand',
  '550e8400-e29b-41d4-a716-446655440001',
  '2025-09-24T12:00:00Z'
),
-- Admin articles that are brand approved
(
  '550e8400-e29b-41d4-a716-446655440043',
  'Admin Travel Tips',
  'admin-travel-tips',
  '{"content": "Professional travel tips from admin"}',
  'published',
  true,
  true,
  true,
  'admin',
  NULL,
  '2025-09-23T10:00:00Z'
),
(
  '550e8400-e29b-41d4-a716-446655440044',
  'Best Travel Destinations 2025',
  'best-travel-destinations-2025',
  '{"content": "Top destinations for 2025 travel"}',
  'published',
  true,
  true,
  true,
  'admin',
  NULL,
  '2025-09-23T11:00:00Z'
)
ON CONFLICT (id) DO NOTHING;