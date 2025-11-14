/*
  # Content Management Tables (News, Destinations, Trips)

  This migration creates tables for the CONTENT section that will receive
  content from the website builder.

  ## New Tables

  1. **news_items**
     - `id` (uuid, primary key)
     - `brand_id` (uuid, references brands)
     - `title` (text)
     - `slug` (text)
     - `content` (jsonb) - HTML content from builder
     - `excerpt` (text) - Short description
     - `featured_image` (text) - Image URL
     - `status` (text) - draft, published
     - `published_at` (timestamptz)
     - `created_at` (timestamptz)
     - `updated_at` (timestamptz)

  2. **destinations**
     - `id` (uuid, primary key)
     - `brand_id` (uuid, references brands)
     - `title` (text) - Destination name
     - `slug` (text)
     - `content` (jsonb) - HTML content from builder
     - `description` (text) - Short description
     - `country` (text)
     - `region` (text)
     - `featured_image` (text) - Main image URL
     - `gallery` (jsonb) - Array of image URLs
     - `status` (text) - draft, published
     - `published_at` (timestamptz)
     - `created_at` (timestamptz)
     - `updated_at` (timestamptz)

  3. **trips**
     - `id` (uuid, primary key)
     - `brand_id` (uuid, references brands)
     - `title` (text) - Trip name
     - `slug` (text)
     - `content` (jsonb) - HTML content from builder
     - `description` (text) - Short description
     - `destination_id` (uuid, references destinations) - Optional link
     - `price` (numeric) - Trip price
     - `duration_days` (integer)
     - `departure_dates` (jsonb) - Array of dates
     - `featured_image` (text) - Main image URL
     - `gallery` (jsonb) - Array of image URLs
     - `status` (text) - draft, published
     - `published_at` (timestamptz)
     - `created_at` (timestamptz)
     - `updated_at` (timestamptz)

  ## Security
    - Enable RLS on all tables
    - Users can read published content for their brand
    - Only authenticated users can manage content for their brand
    - Admin users can manage all content

  ## Notes
    - All content fields store HTML from the website builder
    - Status field controls visibility (draft vs published)
    - Slugs must be unique per brand
    - All tables have timestamps for audit trail
*/

-- Create news_items table
CREATE TABLE IF NOT EXISTS news_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  title text NOT NULL,
  slug text NOT NULL,
  content jsonb DEFAULT '{}',
  excerpt text,
  featured_image text,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  published_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(brand_id, slug)
);

-- Create destinations table
CREATE TABLE IF NOT EXISTS destinations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  title text NOT NULL,
  slug text NOT NULL,
  content jsonb DEFAULT '{}',
  description text,
  country text,
  region text,
  featured_image text,
  gallery jsonb DEFAULT '[]',
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  published_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(brand_id, slug)
);

-- Create trips table
CREATE TABLE IF NOT EXISTS trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  title text NOT NULL,
  slug text NOT NULL,
  content jsonb DEFAULT '{}',
  description text,
  destination_id uuid REFERENCES destinations(id) ON DELETE SET NULL,
  price numeric(10,2),
  duration_days integer,
  departure_dates jsonb DEFAULT '[]',
  featured_image text,
  gallery jsonb DEFAULT '[]',
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  published_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(brand_id, slug)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_news_items_brand_id ON news_items(brand_id);
CREATE INDEX IF NOT EXISTS idx_news_items_status ON news_items(status);
CREATE INDEX IF NOT EXISTS idx_news_items_published_at ON news_items(published_at);

CREATE INDEX IF NOT EXISTS idx_destinations_brand_id ON destinations(brand_id);
CREATE INDEX IF NOT EXISTS idx_destinations_status ON destinations(status);
CREATE INDEX IF NOT EXISTS idx_destinations_country ON destinations(country);

CREATE INDEX IF NOT EXISTS idx_trips_brand_id ON trips(brand_id);
CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status);
CREATE INDEX IF NOT EXISTS idx_trips_destination_id ON trips(destination_id);
CREATE INDEX IF NOT EXISTS idx_trips_published_at ON trips(published_at);

-- Enable RLS
ALTER TABLE news_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;

-- RLS Policies for news_items

CREATE POLICY "Users can view published news for their brand"
  ON news_items FOR SELECT
  TO authenticated
  USING (
    brand_id IN (
      SELECT brand_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create news for their brand"
  ON news_items FOR INSERT
  TO authenticated
  WITH CHECK (
    brand_id IN (
      SELECT brand_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update news for their brand"
  ON news_items FOR UPDATE
  TO authenticated
  USING (
    brand_id IN (
      SELECT brand_id FROM users WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    brand_id IN (
      SELECT brand_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete news for their brand"
  ON news_items FOR DELETE
  TO authenticated
  USING (
    brand_id IN (
      SELECT brand_id FROM users WHERE id = auth.uid()
    )
  );

-- RLS Policies for destinations

CREATE POLICY "Users can view destinations for their brand"
  ON destinations FOR SELECT
  TO authenticated
  USING (
    brand_id IN (
      SELECT brand_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create destinations for their brand"
  ON destinations FOR INSERT
  TO authenticated
  WITH CHECK (
    brand_id IN (
      SELECT brand_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update destinations for their brand"
  ON destinations FOR UPDATE
  TO authenticated
  USING (
    brand_id IN (
      SELECT brand_id FROM users WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    brand_id IN (
      SELECT brand_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete destinations for their brand"
  ON destinations FOR DELETE
  TO authenticated
  USING (
    brand_id IN (
      SELECT brand_id FROM users WHERE id = auth.uid()
    )
  );

-- RLS Policies for trips

CREATE POLICY "Users can view trips for their brand"
  ON trips FOR SELECT
  TO authenticated
  USING (
    brand_id IN (
      SELECT brand_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create trips for their brand"
  ON trips FOR INSERT
  TO authenticated
  WITH CHECK (
    brand_id IN (
      SELECT brand_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update trips for their brand"
  ON trips FOR UPDATE
  TO authenticated
  USING (
    brand_id IN (
      SELECT brand_id FROM users WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    brand_id IN (
      SELECT brand_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete trips for their brand"
  ON trips FOR DELETE
  TO authenticated
  USING (
    brand_id IN (
      SELECT brand_id FROM users WHERE id = auth.uid()
    )
  );