/*
  # WordPress Template Integration

  1. New Tables
    - `wordpress_sources`
      - `id` (uuid, primary key)
      - `name` (text) - Friendly name for this WordPress source
      - `url` (text) - Base URL of WordPress site
      - `api_key` (text, optional) - For authenticated requests
      - `is_active` (boolean) - Enable/disable this source
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `wordpress_templates`
      - `id` (uuid, primary key)
      - `wordpress_source_id` (uuid, foreign key)
      - `wp_page_id` (text) - WordPress page/post ID
      - `name` (text) - Template name
      - `description` (text, optional)
      - `preview_image_url` (text, optional)
      - `category` (text) - 'agency', 'tours', 'luxury', etc.
      - `color_scheme` (jsonb, optional) - Default colors
      - `is_active` (boolean) - Show to brands or not
      - `order_index` (integer) - Display order
      - `cached_html` (text, optional) - Cached template HTML
      - `cache_updated_at` (timestamptz, optional)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Changes to existing tables
    - `websites` table:
      - Add `source_type` (text) - 'custom', 'external_builder', 'wordpress_template'
      - Add `source_url` (text, optional) - URL to source
      - Add `source_template_id` (uuid, optional) - Reference to wordpress_templates
      - Add `template_customizations` (jsonb, optional) - Brand's customizations
  
  3. Security
    - Enable RLS on new tables
    - Operators can manage WordPress sources and templates
    - Brands can read active templates
    - Service role can update cached_html
*/

-- Create wordpress_sources table
CREATE TABLE IF NOT EXISTS wordpress_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  url text NOT NULL,
  api_key text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create wordpress_templates table
CREATE TABLE IF NOT EXISTS wordpress_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wordpress_source_id uuid REFERENCES wordpress_sources(id) ON DELETE CASCADE,
  wp_page_id text NOT NULL,
  name text NOT NULL,
  description text,
  preview_image_url text,
  category text DEFAULT 'general',
  color_scheme jsonb,
  is_active boolean DEFAULT true,
  order_index integer DEFAULT 0,
  cached_html text,
  cache_updated_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(wordpress_source_id, wp_page_id)
);

-- Add columns to websites table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'websites' AND column_name = 'source_type'
  ) THEN
    ALTER TABLE websites ADD COLUMN source_type text DEFAULT 'custom';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'websites' AND column_name = 'source_url'
  ) THEN
    ALTER TABLE websites ADD COLUMN source_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'websites' AND column_name = 'source_template_id'
  ) THEN
    ALTER TABLE websites ADD COLUMN source_template_id uuid REFERENCES wordpress_templates(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'websites' AND column_name = 'template_customizations'
  ) THEN
    ALTER TABLE websites ADD COLUMN template_customizations jsonb;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE wordpress_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE wordpress_templates ENABLE ROW LEVEL SECURITY;

-- Policies for wordpress_sources
CREATE POLICY "Operators can manage WordPress sources"
  ON wordpress_sources FOR ALL
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

-- Policies for wordpress_templates
CREATE POLICY "Operators can manage WordPress templates"
  ON wordpress_templates FOR ALL
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

CREATE POLICY "Brands can read active WordPress templates"
  ON wordpress_templates FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'brand'
    )
  );

CREATE POLICY "Service role can update cached HTML"
  ON wordpress_templates FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
DROP TRIGGER IF EXISTS update_wordpress_sources_updated_at ON wordpress_sources;
CREATE TRIGGER update_wordpress_sources_updated_at
  BEFORE UPDATE ON wordpress_sources
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_wordpress_templates_updated_at ON wordpress_templates;
CREATE TRIGGER update_wordpress_templates_updated_at
  BEFORE UPDATE ON wordpress_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default WordPress source (AI Travel Studio templates)
INSERT INTO wordpress_sources (name, url, is_active)
VALUES ('AI Travel Studio Templates', 'https://templates.aitravelstudio.com', true)
ON CONFLICT DO NOTHING;