/*
  # Add System-Wide Twilio Settings

  1. Changes
    - Add `brand_id` to `api_settings` (nullable for system-wide settings)
    - Add system-wide Twilio credentials (brand_id = NULL)
    - Brands can optionally override with their own credentials
    - Webhook will check brand-specific first, then fall back to system-wide

  2. Security
    - Operators can manage system-wide settings
    - Brands can only manage their own settings
*/

-- Add brand_id column (nullable for system-wide)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'api_settings' AND column_name = 'brand_id'
  ) THEN
    ALTER TABLE api_settings ADD COLUMN brand_id uuid REFERENCES brands(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add index for brand lookups
CREATE INDEX IF NOT EXISTS idx_api_settings_brand_id ON api_settings(brand_id);

-- Add unique constraint: one provider+service per brand (or system-wide)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'api_settings_provider_service_brand_unique'
  ) THEN
    ALTER TABLE api_settings 
    ADD CONSTRAINT api_settings_provider_service_brand_unique 
    UNIQUE (provider, service_name, brand_id);
  END IF;
END $$;

-- Drop existing policies
DO $$
BEGIN
  DROP POLICY IF EXISTS "Operators can manage api settings" ON api_settings;
  DROP POLICY IF EXISTS "Brands can view their api settings" ON api_settings;
  DROP POLICY IF EXISTS "Chatbot can read api settings" ON api_settings;
END $$;

-- Operators can manage all settings (system-wide and brand-specific)
CREATE POLICY "Operators can manage all api settings"
  ON api_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'operator'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'operator'
    )
  );

-- Brands can view their own settings + system-wide settings
CREATE POLICY "Brands can view api settings"
  ON api_settings FOR SELECT
  TO authenticated
  USING (
    brand_id IN (
      SELECT brand_id FROM users WHERE id = auth.uid()
    )
    OR brand_id IS NULL
  );

-- Brands can update only their own settings
CREATE POLICY "Brands can manage own api settings"
  ON api_settings FOR ALL
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

-- Service role and anon can read all (for webhooks/functions)
CREATE POLICY "Service role can read api settings"
  ON api_settings FOR SELECT
  TO service_role, anon
  USING (true);