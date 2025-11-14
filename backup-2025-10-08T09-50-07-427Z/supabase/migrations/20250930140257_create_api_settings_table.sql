/*
  # Create API Settings Table

  1. New Tables
    - `api_settings`
      - `id` (uuid, primary key)
      - `provider` (text) - Provider name (OpenAI, Google, Supabase, etc.)
      - `service_name` (text) - Service display name
      - `api_key` (text) - Encrypted API key or configuration value
      - `is_active` (boolean) - Whether the API is currently active
      - `last_tested` (timestamptz) - Last time the API was tested
      - `test_status` (text) - Status of last test: 'success', 'failed', 'pending', 'never'
      - `usage_count` (integer) - Number of API calls made
      - `usage_limit` (integer) - Maximum allowed calls
      - `monthly_cost` (numeric) - Current month cost in dollars
      - `endpoints` (jsonb) - Array of available endpoints
      - `metadata` (jsonb) - Additional configuration data
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `api_settings` table
    - Only operators can read/write API settings
*/

CREATE TABLE IF NOT EXISTS api_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  service_name text NOT NULL,
  api_key text,
  is_active boolean DEFAULT false,
  last_tested timestamptz,
  test_status text DEFAULT 'never',
  usage_count integer DEFAULT 0,
  usage_limit integer DEFAULT 0,
  monthly_cost numeric(10, 2) DEFAULT 0.00,
  endpoints jsonb DEFAULT '[]'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE api_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only operators can view API settings"
  ON api_settings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'operator'
    )
  );

CREATE POLICY "Only operators can insert API settings"
  ON api_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'operator'
    )
  );

CREATE POLICY "Only operators can update API settings"
  ON api_settings
  FOR UPDATE
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

CREATE POLICY "Only operators can delete API settings"
  ON api_settings
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'operator'
    )
  );

-- Insert default API configurations
INSERT INTO api_settings (provider, service_name, api_key, endpoints, metadata) VALUES
  ('OpenAI', 'OpenAI API', '', '["chat/completions", "images/generations"]'::jsonb, '{"description": "AI content generation and chat"}'::jsonb),
  ('Supabase', 'Supabase Project URL', '', '["database", "auth", "storage"]'::jsonb, '{"description": "Database and authentication", "type": "url"}'::jsonb),
  ('Supabase', 'Supabase Anon Key', '', '["public API access"]'::jsonb, '{"description": "Public API access key", "type": "anon_key"}'::jsonb),
  ('Google', 'Google Custom Search', '', '["customsearch/v1"]'::jsonb, '{"description": "Search integration"}'::jsonb),
  ('Google', 'Google Maps API', '', '["maps/api/place", "maps/api/directions"]'::jsonb, '{"description": "Maps and location services"}'::jsonb),
  ('Unsplash', 'Unsplash API', '', '["photos/random", "search/photos"]'::jsonb, '{"description": "Stock photos"}'::jsonb)
ON CONFLICT DO NOTHING;