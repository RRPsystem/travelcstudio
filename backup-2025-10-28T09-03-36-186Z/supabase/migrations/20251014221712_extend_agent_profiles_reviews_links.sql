/*
  # Extend Agent Profiles with Reviews, Links and Location

  1. Changes to `agents` table
    - Replace `location` with `city` and `province` for better URL structure
    - Add `rrp_id` (text) - unique ID for travel connections
    - Add `custom_links` (jsonb) - array of custom links for sidebar menu
  
  2. New Tables
    - `agent_reviews` - Customer reviews for agents
      - `id` (uuid, primary key)
      - `agent_id` (uuid, foreign key to agents)
      - `reviewer_name` (text) - name of reviewer
      - `reviewer_location` (text) - optional location
      - `rating` (integer 1-5) - star rating
      - `review_text` (text) - review content
      - `trip_title` (text) - optional trip name
      - `travel_date` (text) - when they traveled
      - `is_verified` (boolean) - verified purchase
      - `is_published` (boolean) - show on profile
      - `created_at` (timestamptz)

  3. Storage
    - Create `agent_photos` bucket for profile images

  4. Security
    - Enable RLS on `agent_reviews` table
    - Public can view published reviews
    - Agents and operators can manage reviews
    - Public can upload to agent_photos bucket
    - Storage policies for agent photos
*/

-- Update agents table with new fields
DO $$
BEGIN
  -- Add city field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agents' AND column_name = 'city'
  ) THEN
    ALTER TABLE agents ADD COLUMN city text;
  END IF;

  -- Add province field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agents' AND column_name = 'province'
  ) THEN
    ALTER TABLE agents ADD COLUMN province text;
  END IF;

  -- Add rrp_id field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agents' AND column_name = 'rrp_id'
  ) THEN
    ALTER TABLE agents ADD COLUMN rrp_id text;
  END IF;

  -- Add custom_links field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agents' AND column_name = 'custom_links'
  ) THEN
    ALTER TABLE agents ADD COLUMN custom_links jsonb DEFAULT '[]';
  END IF;

  -- Migrate existing location data to city field if location exists
  UPDATE agents 
  SET city = location 
  WHERE location IS NOT NULL AND city IS NULL;
END $$;

-- Create agent_reviews table
CREATE TABLE IF NOT EXISTS agent_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  reviewer_name text NOT NULL,
  reviewer_location text,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text text NOT NULL,
  trip_title text,
  travel_date text,
  is_verified boolean DEFAULT false,
  is_published boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on agent_reviews
ALTER TABLE agent_reviews ENABLE ROW LEVEL SECURITY;

-- Public can view published reviews
DROP POLICY IF EXISTS "Public can view published reviews" ON agent_reviews;
CREATE POLICY "Public can view published reviews"
  ON agent_reviews FOR SELECT
  TO anon, authenticated
  USING (is_published = true);

-- Agents can manage their own reviews
DROP POLICY IF EXISTS "Agents can manage their reviews" ON agent_reviews;
CREATE POLICY "Agents can manage their reviews"
  ON agent_reviews FOR ALL
  TO authenticated
  USING (
    agent_id IN (
      SELECT a.id FROM agents a
      INNER JOIN users u ON u.brand_id = a.brand_id
      WHERE u.id = auth.uid()
    )
  );

-- Operators can manage all reviews
DROP POLICY IF EXISTS "Operators can manage all reviews" ON agent_reviews;
CREATE POLICY "Operators can manage all reviews"
  ON agent_reviews FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'operator'
    )
  );

-- Create storage bucket for agent photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('agent-photos', 'agent-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for agent photos
DROP POLICY IF EXISTS "Public can view agent photos" ON storage.objects;
CREATE POLICY "Public can view agent photos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'agent-photos');

DROP POLICY IF EXISTS "Authenticated users can upload agent photos" ON storage.objects;
CREATE POLICY "Authenticated users can upload agent photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'agent-photos');

DROP POLICY IF EXISTS "Users can update their agent photos" ON storage.objects;
CREATE POLICY "Users can update their agent photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'agent-photos');

DROP POLICY IF EXISTS "Users can delete their agent photos" ON storage.objects;
CREATE POLICY "Users can delete their agent photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'agent-photos');