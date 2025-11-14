/*
  # Create Brand Voice Settings Table

  1. New Tables
    - `brand_voice_settings`
      - `id` (uuid, primary key)
      - `brand_id` (uuid, foreign key to brands)
      - `tone` (text) - AI tone (professional, friendly, casual, etc.)
      - `style` (text) - Writing style (casual, professional, educational, etc.)
      - `keywords` (text[]) - Brand-specific keywords for AI
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `brand_voice_settings` table
    - Add policy for brands to read/write their own settings
*/

CREATE TABLE IF NOT EXISTS brand_voice_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  tone text NOT NULL DEFAULT 'professional',
  style text NOT NULL DEFAULT 'casual',
  keywords text[] DEFAULT ARRAY[]::text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(brand_id)
);

ALTER TABLE brand_voice_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brands can read own brand voice settings"
  ON brand_voice_settings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.brand_id = brand_voice_settings.brand_id
    )
  );

CREATE POLICY "Brands can insert own brand voice settings"
  ON brand_voice_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.brand_id = brand_voice_settings.brand_id
    )
  );

CREATE POLICY "Brands can update own brand voice settings"
  ON brand_voice_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.brand_id = brand_voice_settings.brand_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.brand_id = brand_voice_settings.brand_id
    )
  );

CREATE INDEX IF NOT EXISTS idx_brand_voice_settings_brand_id ON brand_voice_settings(brand_id);
