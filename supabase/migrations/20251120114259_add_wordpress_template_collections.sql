/*
  # WordPress Template Collections System

  1. New Tables
    - `wordpress_template_collections`
      - Groups related templates together (e.g., "Modern Luxury Set")
      - Brands can select one complete collection
      - Ensures consistent design across all pages
    
    - Updates to `wordpress_templates`
      - Add collection_id reference
      - Add template_type (home, destination, news, contact, etc.)

  2. Benefits
    - Easy brand selection: Choose one set, get all pages
    - Consistent design: All pages match in style
    - Scalable: Add new collections without naming chaos
    - Preview entire set before choosing

  3. Security
    - Enable RLS on collections table
    - Operators can manage collections
    - Brands can view and select
*/

-- WordPress Template Collections
CREATE TABLE IF NOT EXISTS wordpress_template_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  preview_image_url text,
  color_scheme jsonb DEFAULT '{}',
  style_tags text[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  order_index int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_template_collections_active ON wordpress_template_collections(is_active, order_index);

-- Add collection reference to wordpress_templates
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wordpress_templates' AND column_name = 'collection_id'
  ) THEN
    ALTER TABLE wordpress_templates 
    ADD COLUMN collection_id uuid REFERENCES wordpress_template_collections(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wordpress_templates' AND column_name = 'template_type'
  ) THEN
    ALTER TABLE wordpress_templates 
    ADD COLUMN template_type text DEFAULT 'page' CHECK (template_type IN ('home', 'destination', 'news', 'trip', 'contact', 'about', 'page', 'custom'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_wordpress_templates_collection ON wordpress_templates(collection_id);
CREATE INDEX IF NOT EXISTS idx_wordpress_templates_type ON wordpress_templates(template_type);

-- Brand Template Collection Selection (which set did brand choose?)
CREATE TABLE IF NOT EXISTS brand_template_selections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid REFERENCES brands(id) ON DELETE CASCADE NOT NULL,
  collection_id uuid REFERENCES wordpress_template_collections(id) ON DELETE CASCADE NOT NULL,
  selected_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  UNIQUE(brand_id, collection_id)
);

CREATE INDEX IF NOT EXISTS idx_brand_selections_brand ON brand_template_selections(brand_id);
CREATE INDEX IF NOT EXISTS idx_brand_selections_collection ON brand_template_selections(collection_id);

-- Enable RLS
ALTER TABLE wordpress_template_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_template_selections ENABLE ROW LEVEL SECURITY;

-- RLS Policies for collections
CREATE POLICY "Anyone authenticated can view collections"
  ON wordpress_template_collections FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Operators can manage collections"
  ON wordpress_template_collections FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'operator'))
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'operator'));

-- RLS Policies for brand selections
CREATE POLICY "Brands can view own selections"
  ON brand_template_selections FOR SELECT
  TO authenticated
  USING (brand_id IN (SELECT brand_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Brands can insert own selections"
  ON brand_template_selections FOR INSERT
  TO authenticated
  WITH CHECK (brand_id IN (SELECT brand_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Brands can update own selections"
  ON brand_template_selections FOR UPDATE
  TO authenticated
  USING (brand_id IN (SELECT brand_id FROM users WHERE id = auth.uid()))
  WITH CHECK (brand_id IN (SELECT brand_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Operators can view all selections"
  ON brand_template_selections FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'operator'));

-- Function to get collection completeness
CREATE OR REPLACE FUNCTION get_collection_completeness(collection_uuid uuid)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_templates', COUNT(*),
    'template_types', jsonb_agg(DISTINCT template_type),
    'has_home', EXISTS(SELECT 1 FROM wordpress_templates WHERE collection_id = collection_uuid AND template_type = 'home'),
    'has_destination', EXISTS(SELECT 1 FROM wordpress_templates WHERE collection_id = collection_uuid AND template_type = 'destination'),
    'has_news', EXISTS(SELECT 1 FROM wordpress_templates WHERE collection_id = collection_uuid AND template_type = 'news'),
    'has_contact', EXISTS(SELECT 1 FROM wordpress_templates WHERE collection_id = collection_uuid AND template_type = 'contact')
  )
  INTO result
  FROM wordpress_templates
  WHERE collection_id = collection_uuid;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_collections_updated_at ON wordpress_template_collections;
CREATE TRIGGER update_collections_updated_at
  BEFORE UPDATE ON wordpress_template_collections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();