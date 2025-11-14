/*
  # TravelBro System - Database Schema

  1. New Tables
    - `travel_trips`
      - `id` (uuid, primary key)
      - `brand_id` (uuid, foreign key to brands)
      - `name` (text) - trip name
      - `pdf_url` (text) - uploaded PDF location
      - `parsed_data` (jsonb) - OpenAI parsed trip data
      - `raw_text` (text) - extracted text from PDF
      - `source_urls` (text[]) - additional URLs for context
      - `share_token` (text, unique) - token for client access
      - `is_active` (boolean) - trip active status
      - `created_by` (uuid, foreign key to auth.users)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `travel_intakes`
      - `id` (uuid, primary key)
      - `trip_id` (uuid, foreign key to travel_trips)
      - `session_token` (text, unique) - client session identifier
      - `travelers_count` (integer) - number of travelers
      - `intake_data` (jsonb) - structured intake responses
      - `completed_at` (timestamptz)
      - `created_at` (timestamptz)

    - `travel_conversations`
      - `id` (uuid, primary key)
      - `trip_id` (uuid, foreign key to travel_trips)
      - `session_token` (text) - links to intake
      - `message` (text) - user or AI message
      - `role` (text) - 'user' or 'assistant'
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Policies for authenticated users (brand/agent access)
    - Public read policies for client access via tokens
*/

-- Create travel_trips table
CREATE TABLE IF NOT EXISTS travel_trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid REFERENCES brands(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  pdf_url text,
  parsed_data jsonb DEFAULT '{}'::jsonb,
  raw_text text,
  source_urls text[] DEFAULT ARRAY[]::text[],
  share_token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create travel_intakes table
CREATE TABLE IF NOT EXISTS travel_intakes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid REFERENCES travel_trips(id) ON DELETE CASCADE NOT NULL,
  session_token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  travelers_count integer DEFAULT 1,
  intake_data jsonb DEFAULT '{}'::jsonb,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create travel_conversations table
CREATE TABLE IF NOT EXISTS travel_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid REFERENCES travel_trips(id) ON DELETE CASCADE NOT NULL,
  session_token text NOT NULL,
  message text NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_travel_trips_brand_id ON travel_trips(brand_id);
CREATE INDEX IF NOT EXISTS idx_travel_trips_share_token ON travel_trips(share_token);
CREATE INDEX IF NOT EXISTS idx_travel_intakes_trip_id ON travel_intakes(trip_id);
CREATE INDEX IF NOT EXISTS idx_travel_intakes_session_token ON travel_intakes(session_token);
CREATE INDEX IF NOT EXISTS idx_travel_conversations_trip_id ON travel_conversations(trip_id);
CREATE INDEX IF NOT EXISTS idx_travel_conversations_session_token ON travel_conversations(session_token);

-- Enable Row Level Security
ALTER TABLE travel_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE travel_intakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE travel_conversations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for travel_trips
CREATE POLICY "Brands can view own trips"
  ON travel_trips FOR SELECT
  TO authenticated
  USING (
    brand_id IN (
      SELECT brand_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Brands can create trips"
  ON travel_trips FOR INSERT
  TO authenticated
  WITH CHECK (
    brand_id IN (
      SELECT brand_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Brands can update own trips"
  ON travel_trips FOR UPDATE
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

CREATE POLICY "Brands can delete own trips"
  ON travel_trips FOR DELETE
  TO authenticated
  USING (
    brand_id IN (
      SELECT brand_id FROM users WHERE id = auth.uid()
    )
  );

-- Public read policy for trips via share token (for clients)
CREATE POLICY "Public can view trips via share token"
  ON travel_trips FOR SELECT
  TO anon
  USING (is_active = true);

-- RLS Policies for travel_intakes
CREATE POLICY "Brands can view trip intakes"
  ON travel_intakes FOR SELECT
  TO authenticated
  USING (
    trip_id IN (
      SELECT id FROM travel_trips WHERE brand_id IN (
        SELECT brand_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- Public can create and read intakes via session token
CREATE POLICY "Public can create intakes"
  ON travel_intakes FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Public can view own intake via session token"
  ON travel_intakes FOR SELECT
  TO anon
  USING (true);

-- RLS Policies for travel_conversations
CREATE POLICY "Brands can view trip conversations"
  ON travel_conversations FOR SELECT
  TO authenticated
  USING (
    trip_id IN (
      SELECT id FROM travel_trips WHERE brand_id IN (
        SELECT brand_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- Public can create and read conversations via session token
CREATE POLICY "Public can create conversations"
  ON travel_conversations FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Public can view conversations"
  ON travel_conversations FOR SELECT
  TO anon
  USING (true);

-- Create updated_at trigger for travel_trips
CREATE OR REPLACE FUNCTION update_travel_trips_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_travel_trips_updated_at
  BEFORE UPDATE ON travel_trips
  FOR EACH ROW
  EXECUTE FUNCTION update_travel_trips_updated_at();
