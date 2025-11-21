/*
  # External Builders & QuickStart Templates System

  1. New Tables
    - `external_builders`
      - Stores registered external template builders (like AI Website Studio)
      - `id` (uuid, primary key)
      - `name` (text, builder name)
      - `builder_url` (text, main builder website)
      - `api_endpoint` (text, API base URL)
      - `editor_url` (text, URL to editor interface)
      - `auth_token` (text, optional authentication token)
      - `is_active` (boolean, whether builder is active)
      - `version` (text, API version)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `builder_categories`
      - Stores template categories from external builders
      - `id` (uuid, primary key)
      - `builder_id` (uuid, foreign key to external_builders)
      - `category_slug` (text, e.g., 'gowild', 'tripex')
      - `display_name` (text, e.g., 'Gowild Website')
      - `description` (text, category description)
      - `total_pages` (integer, number of pages in category)
      - `preview_url` (text, preview image URL)
      - `tags` (jsonb, array of tags)
      - `features` (jsonb, array of features)
      - `recommended_pages` (jsonb, array of recommended page slugs)
      - `is_active` (boolean)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `quickstart_templates`
      - Operator-configured QuickStart templates
      - `id` (uuid, primary key)
      - `builder_id` (uuid, foreign key to external_builders)
      - `category_id` (uuid, foreign key to builder_categories)
      - `display_name` (text, e.g., 'Gowild Starter')
      - `description` (text)
      - `selected_pages` (jsonb, array of page slugs to include)
      - `is_active` (boolean)
      - `display_order` (integer)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Updates to Existing Tables
    - `websites` table gets new fields:
      - `template_source_type` (text, 'quickstart' | 'custom' | 'wordpress')
      - `quickstart_template_id` (uuid, reference to quickstart_templates)
      - `external_builder_id` (uuid, reference to external_builders)

  3. Security
    - Enable RLS on all new tables
    - Operators can manage external builders and QuickStart templates
    - Brands can view active templates
    - Service role has full access for API operations
*/

-- Create external_builders table
CREATE TABLE IF NOT EXISTS external_builders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  builder_url text NOT NULL,
  api_endpoint text NOT NULL,
  editor_url text,
  auth_token text,
  is_active boolean DEFAULT true,
  version text DEFAULT '1.0.0',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE external_builders ENABLE ROW LEVEL SECURITY;

-- Create builder_categories table
CREATE TABLE IF NOT EXISTS builder_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  builder_id uuid NOT NULL REFERENCES external_builders(id) ON DELETE CASCADE,
  category_slug text NOT NULL,
  display_name text NOT NULL,
  description text,
  total_pages integer DEFAULT 0,
  preview_url text,
  tags jsonb DEFAULT '[]'::jsonb,
  features jsonb DEFAULT '[]'::jsonb,
  recommended_pages jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(builder_id, category_slug)
);

ALTER TABLE builder_categories ENABLE ROW LEVEL SECURITY;

-- Create quickstart_templates table
CREATE TABLE IF NOT EXISTS quickstart_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  builder_id uuid NOT NULL REFERENCES external_builders(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES builder_categories(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  description text,
  selected_pages jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE quickstart_templates ENABLE ROW LEVEL SECURITY;

-- Add new columns to websites table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'websites' AND column_name = 'template_source_type'
  ) THEN
    ALTER TABLE websites ADD COLUMN template_source_type text DEFAULT 'custom';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'websites' AND column_name = 'quickstart_template_id'
  ) THEN
    ALTER TABLE websites ADD COLUMN quickstart_template_id uuid REFERENCES quickstart_templates(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'websites' AND column_name = 'external_builder_id'
  ) THEN
    ALTER TABLE websites ADD COLUMN external_builder_id uuid REFERENCES external_builders(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add constraint for template_source_type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'websites_template_source_type_check'
  ) THEN
    ALTER TABLE websites
    ADD CONSTRAINT websites_template_source_type_check
    CHECK (template_source_type IN ('quickstart', 'custom', 'wordpress'));
  END IF;
END $$;

-- RLS Policies for external_builders

-- Operators can manage builders
CREATE POLICY "Operators can view all external builders"
  ON external_builders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'operator'
    )
  );

CREATE POLICY "Operators can insert external builders"
  ON external_builders FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'operator'
    )
  );

CREATE POLICY "Operators can update external builders"
  ON external_builders FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'operator'
    )
  );

-- Service role has full access
CREATE POLICY "Service role can manage external builders"
  ON external_builders FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Brands can view active builders
CREATE POLICY "Brands can view active builders"
  ON external_builders FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'brand'
    )
  );

-- RLS Policies for builder_categories

-- Operators can manage categories
CREATE POLICY "Operators can view all builder categories"
  ON builder_categories FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'operator'
    )
  );

CREATE POLICY "Operators can insert builder categories"
  ON builder_categories FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'operator'
    )
  );

CREATE POLICY "Operators can update builder categories"
  ON builder_categories FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'operator'
    )
  );

-- Service role has full access
CREATE POLICY "Service role can manage builder categories"
  ON builder_categories FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Brands can view active categories
CREATE POLICY "Brands can view active categories"
  ON builder_categories FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'brand'
    )
  );

-- RLS Policies for quickstart_templates

-- Operators can manage QuickStart templates
CREATE POLICY "Operators can view all quickstart templates"
  ON quickstart_templates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'operator'
    )
  );

CREATE POLICY "Operators can insert quickstart templates"
  ON quickstart_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'operator'
    )
  );

CREATE POLICY "Operators can update quickstart templates"
  ON quickstart_templates FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'operator'
    )
  );

CREATE POLICY "Operators can delete quickstart templates"
  ON quickstart_templates FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'operator'
    )
  );

-- Service role has full access
CREATE POLICY "Service role can manage quickstart templates"
  ON quickstart_templates FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Brands can view active QuickStart templates
CREATE POLICY "Brands can view active quickstart templates"
  ON quickstart_templates FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'brand'
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_builder_categories_builder_id ON builder_categories(builder_id);
CREATE INDEX IF NOT EXISTS idx_builder_categories_active ON builder_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_quickstart_templates_builder_id ON quickstart_templates(builder_id);
CREATE INDEX IF NOT EXISTS idx_quickstart_templates_category_id ON quickstart_templates(category_id);
CREATE INDEX IF NOT EXISTS idx_quickstart_templates_active ON quickstart_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_websites_quickstart_template_id ON websites(quickstart_template_id);
CREATE INDEX IF NOT EXISTS idx_websites_external_builder_id ON websites(external_builder_id);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
DROP TRIGGER IF EXISTS update_external_builders_updated_at ON external_builders;
CREATE TRIGGER update_external_builders_updated_at
  BEFORE UPDATE ON external_builders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_builder_categories_updated_at ON builder_categories;
CREATE TRIGGER update_builder_categories_updated_at
  BEFORE UPDATE ON builder_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_quickstart_templates_updated_at ON quickstart_templates;
CREATE TRIGGER update_quickstart_templates_updated_at
  BEFORE UPDATE ON quickstart_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
