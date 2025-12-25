/*
  # WordPress Template Selector System

  1. New Tables
    - `wordpress_site_templates`
      - `id` (uuid, primary key)
      - `name` (text) - Template naam
      - `description` (text) - Korte beschrijving
      - `preview_image_url` (text) - Foto van template
      - `example_site_url` (text) - Link naar voorbeeld website
      - `is_active` (boolean) - Of template beschikbaar is
      - `display_order` (integer) - Volgorde van weergave

    - `wordpress_template_selections`
      - `id` (uuid, primary key)
      - `brand_id` (uuid, foreign key) - Welke brand
      - `template_id` (uuid, foreign key) - Welke template
      - `status` (text) - pending_setup, in_progress, active, cancelled
      - `operator_id` (uuid, foreign key) - Welke operator doet setup
      - `operator_notes` (text) - Notities van operator

    - `wordpress_pages_cache`
      - `id` (uuid, primary key)
      - `brand_id` (uuid, foreign key)
      - `wordpress_page_id` (bigint) - ID in WordPress
      - `title`, `slug`, `page_url`, `edit_url` (text)
      - `status` (text) - publish, draft, etc

  2. Security
    - Enable RLS on all tables
    - Operators can manage templates
    - Brands can view/select templates
    - Brands can only see their own pages
*/

-- WordPress Site Templates tabel (wat operator aanbiedt)
CREATE TABLE IF NOT EXISTS wordpress_site_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  preview_image_url text,
  example_site_url text,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- WordPress Template Selections (wat brand kiest)
CREATE TABLE IF NOT EXISTS wordpress_template_selections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES wordpress_site_templates(id) ON DELETE CASCADE,
  status text DEFAULT 'pending_setup' CHECK (status IN ('pending_setup', 'in_progress', 'active', 'cancelled')),
  selected_at timestamptz DEFAULT now(),
  setup_started_at timestamptz,
  setup_completed_at timestamptz,
  operator_id uuid REFERENCES users(id) ON DELETE SET NULL,
  operator_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(brand_id)
);

-- WordPress Pages Cache (pagina's van WordPress site van brand)
CREATE TABLE IF NOT EXISTS wordpress_pages_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  wordpress_page_id bigint NOT NULL,
  title text NOT NULL,
  slug text NOT NULL,
  page_url text NOT NULL,
  edit_url text NOT NULL,
  status text DEFAULT 'publish',
  last_synced_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(brand_id, wordpress_page_id)
);

-- Indexes voor performance
CREATE INDEX IF NOT EXISTS idx_wp_template_selections_brand ON wordpress_template_selections(brand_id);
CREATE INDEX IF NOT EXISTS idx_wp_template_selections_status ON wordpress_template_selections(status);
CREATE INDEX IF NOT EXISTS idx_wp_template_selections_operator ON wordpress_template_selections(operator_id);
CREATE INDEX IF NOT EXISTS idx_wp_pages_cache_brand ON wordpress_pages_cache(brand_id);
CREATE INDEX IF NOT EXISTS idx_wp_pages_cache_sync ON wordpress_pages_cache(last_synced_at);

-- Enable RLS
ALTER TABLE wordpress_site_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE wordpress_template_selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE wordpress_pages_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policies voor wordpress_site_templates
CREATE POLICY "Operators can manage WordPress templates"
  ON wordpress_site_templates FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'operator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'operator')
    )
  );

CREATE POLICY "Brands can view active WordPress templates"
  ON wordpress_site_templates FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'brand'
    )
  );

-- RLS Policies voor wordpress_template_selections
CREATE POLICY "Operators can view all template selections"
  ON wordpress_template_selections FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'operator')
    )
  );

CREATE POLICY "Operators can update template selections"
  ON wordpress_template_selections FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'operator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'operator')
    )
  );

CREATE POLICY "Brands can view own template selection"
  ON wordpress_template_selections FOR SELECT
  TO authenticated
  USING (
    brand_id IN (
      SELECT brand_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Brands can insert template selection"
  ON wordpress_template_selections FOR INSERT
  TO authenticated
  WITH CHECK (
    brand_id IN (
      SELECT brand_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Brands can update own pending selection"
  ON wordpress_template_selections FOR UPDATE
  TO authenticated
  USING (
    brand_id IN (
      SELECT brand_id FROM users WHERE id = auth.uid()
    )
    AND status = 'pending_setup'
  )
  WITH CHECK (
    brand_id IN (
      SELECT brand_id FROM users WHERE id = auth.uid()
    )
  );

-- RLS Policies voor wordpress_pages_cache
CREATE POLICY "Operators can manage all WordPress pages cache"
  ON wordpress_pages_cache FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'operator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'operator')
    )
  );

CREATE POLICY "Brands can view own WordPress pages"
  ON wordpress_pages_cache FOR SELECT
  TO authenticated
  USING (
    brand_id IN (
      SELECT brand_id FROM users WHERE id = auth.uid()
    )
  );

-- Updated at triggers
CREATE OR REPLACE FUNCTION update_wordpress_template_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER wordpress_site_templates_updated_at
  BEFORE UPDATE ON wordpress_site_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_wordpress_template_updated_at();

CREATE TRIGGER wordpress_template_selections_updated_at
  BEFORE UPDATE ON wordpress_template_selections
  FOR EACH ROW
  EXECUTE FUNCTION update_wordpress_template_updated_at();

CREATE TRIGGER wordpress_pages_cache_updated_at
  BEFORE UPDATE ON wordpress_pages_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_wordpress_template_updated_at();
