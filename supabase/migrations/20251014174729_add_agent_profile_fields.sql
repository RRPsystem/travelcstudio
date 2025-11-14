/*
  # Add Agent Profile Fields

  1. Changes to `agents` table
    - Add `slug` (text, unique) - for URL-friendly profile links
    - Add `bio` (text) - agent biography/description
    - Add `profile_image_url` (text) - profile photo
    - Add `location` (text) - city/region
    - Add `specializations` (text[]) - travel specializations (e.g., "Azië", "Cultuurreizen")
    - Add `years_experience` (integer) - years in travel industry
    - Add `rating` (decimal) - average rating
    - Add `review_count` (integer) - number of reviews
    - Add `is_top_advisor` (boolean) - featured advisor badge
    - Add `specialist_since` (text) - year they became specialist
    - Add `certifications` (text[]) - certificates (e.g., "Thailand Specialist Certificaat")
    - Add `phone_visible` (boolean) - show phone on profile
    - Add `whatsapp_enabled` (boolean) - enable WhatsApp contact
    - Add `is_published` (boolean) - profile visibility

  2. Security
    - Enable RLS on `agents` table
    - Add policy for public read access to published profiles
    - Add policy for brand users to manage their agents
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agents' AND column_name = 'slug'
  ) THEN
    ALTER TABLE agents ADD COLUMN slug text UNIQUE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agents' AND column_name = 'bio'
  ) THEN
    ALTER TABLE agents ADD COLUMN bio text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agents' AND column_name = 'profile_image_url'
  ) THEN
    ALTER TABLE agents ADD COLUMN profile_image_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agents' AND column_name = 'location'
  ) THEN
    ALTER TABLE agents ADD COLUMN location text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agents' AND column_name = 'specializations'
  ) THEN
    ALTER TABLE agents ADD COLUMN specializations text[] DEFAULT '{}';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agents' AND column_name = 'years_experience'
  ) THEN
    ALTER TABLE agents ADD COLUMN years_experience integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agents' AND column_name = 'rating'
  ) THEN
    ALTER TABLE agents ADD COLUMN rating decimal(2,1) DEFAULT 0.0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agents' AND column_name = 'review_count'
  ) THEN
    ALTER TABLE agents ADD COLUMN review_count integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agents' AND column_name = 'is_top_advisor'
  ) THEN
    ALTER TABLE agents ADD COLUMN is_top_advisor boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agents' AND column_name = 'specialist_since'
  ) THEN
    ALTER TABLE agents ADD COLUMN specialist_since text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agents' AND column_name = 'certifications'
  ) THEN
    ALTER TABLE agents ADD COLUMN certifications text[] DEFAULT '{}';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agents' AND column_name = 'phone_visible'
  ) THEN
    ALTER TABLE agents ADD COLUMN phone_visible boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agents' AND column_name = 'whatsapp_enabled'
  ) THEN
    ALTER TABLE agents ADD COLUMN whatsapp_enabled boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agents' AND column_name = 'is_published'
  ) THEN
    ALTER TABLE agents ADD COLUMN is_published boolean DEFAULT false;
  END IF;
END $$;

ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view published agent profiles" ON agents;
CREATE POLICY "Public can view published agent profiles"
  ON agents FOR SELECT
  TO anon, authenticated
  USING (is_published = true);

DROP POLICY IF EXISTS "Brand users can manage their agents" ON agents;
CREATE POLICY "Brand users can manage their agents"
  ON agents FOR ALL
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

DROP POLICY IF EXISTS "Operators can manage all agents" ON agents;
CREATE POLICY "Operators can manage all agents"
  ON agents FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'operator'
    )
  );