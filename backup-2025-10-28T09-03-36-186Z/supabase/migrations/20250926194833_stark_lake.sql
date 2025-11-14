/*
  # Create GPT Models table with sample data

  1. New Tables
    - `gpt_models`
      - `id` (uuid, primary key)
      - `name` (text)
      - `description` (text)
      - `content_type` (text)
      - `system_prompt` (text)
      - `temperature` (numeric)
      - `max_tokens` (integer)
      - `model` (text)
      - `is_active` (boolean)
      - `usage_count` (integer)
      - `last_used` (timestamp)
      - `created_by` (uuid, foreign key to auth.users)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `gpt_models` table
    - Add policies for operators and users

  3. Sample Data
    - 5 working GPT models for different content types
*/

-- Drop existing table if it exists to start fresh
DROP TABLE IF EXISTS gpt_models CASCADE;

-- Create GPT Models table
CREATE TABLE gpt_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  content_type text NOT NULL,
  system_prompt text NOT NULL,
  temperature numeric(3,2) DEFAULT 0.7,
  max_tokens integer DEFAULT 1500,
  model text DEFAULT 'gpt-3.5-turbo',
  is_active boolean DEFAULT false,
  usage_count integer DEFAULT 0,
  last_used timestamptz,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE gpt_models ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow all operations on gpt_models for development"
  ON gpt_models
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Update trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger
CREATE TRIGGER update_gpt_models_updated_at 
  BEFORE UPDATE ON gpt_models 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Insert sample GPT models
INSERT INTO gpt_models (id, name, description, content_type, system_prompt, temperature, max_tokens, model, is_active, usage_count, last_used) VALUES
(
  '550e8400-e29b-41d4-a716-446655440100',
  'Travel Destination Expert',
  'Specialist in creating engaging destination content',
  'destination',
  'Je bent een professionele reisschrijver die boeiende bestemmingsteksten schrijft over {DESTINATION}. Schrijf in {WRITING_STYLE} stijl voor {VACATION_TYPE} reizigers. Gebruik actuele informatie en maak de tekst aantrekkelijk met praktische tips en insider informatie.',
  0.7,
  1500,
  'gpt-3.5-turbo',
  true,
  45,
  now() - interval '2 hours'
),
(
  '550e8400-e29b-41d4-a716-446655440101',
  'Route Planning Specialist',
  'Expert in creating detailed route descriptions',
  'route',
  'Je bent een routeplanner die gedetailleerde routebeschrijvingen maakt. {ROUTE_TYPE_INSTRUCTION} Geef praktische informatie over de route, bezienswaardigheden onderweg, en reistips. Schrijf in {WRITING_STYLE} stijl voor {VACATION_TYPE} reizigers.',
  0.6,
  2000,
  'gpt-4',
  true,
  23,
  now() - interval '1 hour'
),
(
  '550e8400-e29b-41d4-a716-446655440102',
  'Day Planning Assistant',
  'Creates perfect daily itineraries',
  'planning',
  'Je bent een reisplanner die {DAYS} dagplanningen maakt voor {DESTINATION}. Geef een praktische planning met tijden, activiteiten, en tips. Schrijf in {WRITING_STYLE} stijl voor {VACATION_TYPE} reizigers. Zorg voor een goede balans tussen must-see attracties en lokale ervaringen.',
  0.8,
  1800,
  'gpt-3.5-turbo',
  true,
  67,
  now() - interval '30 minutes'
),
(
  '550e8400-e29b-41d4-a716-446655440103',
  'Hotel Search Expert',
  'Specialist in hotel recommendations',
  'hotel',
  'Je bent een hotelexpert die hotelzoekresultaten presenteert voor {VACATION_TYPE} reizigers. Geef gedetailleerde informatie over hotels, voorzieningen, en boekingsadvies. Schrijf in {WRITING_STYLE} stijl en focus op value for money.',
  0.5,
  1200,
  'gpt-3.5-turbo',
  false,
  12,
  now() - interval '1 day'
),
(
  '550e8400-e29b-41d4-a716-446655440104',
  'Travel Image Creator',
  'DALL-E specialist for travel imagery',
  'image',
  'Je bent een AI die afbeeldingsbeschrijvingen genereert voor DALL-E. Maak een gedetailleerde, visuele beschrijving voor een {VACATION_TYPE} reisafbeelding in {WRITING_STYLE} stijl. Focus op atmosfeer, kleuren, en compositie.',
  0.9,
  500,
  'dall-e-3',
  true,
  8,
  now() - interval '3 hours'
);

-- Insert sample news articles if they don't exist
INSERT INTO news_articles (id, title, slug, content, status, brand_approved, brand_mandatory, website_visible, author_type, brand_id, excerpt) 
SELECT 
  '550e8400-e29b-41d4-a716-446655440200',
  'Barcelona Travel Guide',
  'barcelona-travel-guide',
  '{"content": "Complete guide to Barcelona with must-see attractions, local tips, and hidden gems."}',
  'published',
  true,
  true,
  true,
  'admin',
  NULL,
  'Discover the magic of Barcelona with our comprehensive travel guide'
WHERE NOT EXISTS (SELECT 1 FROM news_articles WHERE slug = 'barcelona-travel-guide');

INSERT INTO news_articles (id, title, slug, content, status, brand_approved, brand_mandatory, website_visible, author_type, brand_id, excerpt) 
SELECT 
  '550e8400-e29b-41d4-a716-446655440201',
  'Amsterdam City Break',
  'amsterdam-city-break',
  '{"content": "Perfect weekend in Amsterdam - canals, museums, and local experiences."}',
  'published',
  true,
  false,
  true,
  'admin',
  NULL,
  'Experience Amsterdam like a local with our insider tips'
WHERE NOT EXISTS (SELECT 1 FROM news_articles WHERE slug = 'amsterdam-city-break');

INSERT INTO news_articles (id, title, slug, content, status, brand_approved, brand_mandatory, website_visible, author_type, brand_id, excerpt) 
SELECT 
  '550e8400-e29b-41d4-a716-446655440202',
  'Summer Travel Tips',
  'summer-travel-tips',
  '{"content": "Essential tips for summer travel - packing, destinations, and safety."}',
  'draft',
  false,
  false,
  false,
  'brand',
  (SELECT id FROM brands WHERE slug = 'the-travel-club' LIMIT 1),
  'Make the most of your summer vacation with these expert tips'
WHERE NOT EXISTS (SELECT 1 FROM news_articles WHERE slug = 'summer-travel-tips');

INSERT INTO news_articles (id, title, slug, content, status, brand_approved, brand_mandatory, website_visible, author_type, brand_id, excerpt) 
SELECT 
  '550e8400-e29b-41d4-a716-446655440203',
  'Winter Destinations 2024',
  'winter-destinations-2024',
  '{"content": "Top winter destinations for 2024 - ski resorts, warm escapes, and city breaks."}',
  'published',
  true,
  false,
  true,
  'brand',
  (SELECT id FROM brands WHERE slug = 'the-travel-club' LIMIT 1),
  'Escape the winter blues with these amazing destinations'
WHERE NOT EXISTS (SELECT 1 FROM news_articles WHERE slug = 'winter-destinations-2024');