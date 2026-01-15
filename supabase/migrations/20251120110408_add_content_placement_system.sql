/*
  # Content Placement System

  1. New Tables
    - `content_placements`
      - Links content (destinations, news, trips) to templates
      - Stores placement configuration and field mappings
      - Enables "write once, deploy everywhere" approach
    
    - `template_field_mappings`
      - Defines how content fields map to template elements
      - Reusable mapping configurations per template
    
    - `ai_content_generations`
      - Tracks AI-generated content
      - Monitors usage and costs
      - Enables caching and analytics

  2. Security
    - Enable RLS on all new tables
    - Brands can only access their own placements
    - Operators can view all for monitoring

  3. Features
    - Multi-template content deployment
    - Template-agnostic content management
    - AI generation tracking
    - Field mapping flexibility
*/

-- Content Placements Table
CREATE TABLE IF NOT EXISTS content_placements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid REFERENCES brands(id) ON DELETE CASCADE NOT NULL,
  content_type text NOT NULL CHECK (content_type IN ('destination', 'news', 'trip', 'page')),
  content_id uuid NOT NULL,
  template_type text NOT NULL CHECK (template_type IN ('wordpress', 'external_builder', 'custom')),
  template_id uuid,
  page_id uuid REFERENCES website_pages(id) ON DELETE CASCADE,
  placement_config jsonb NOT NULL DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_content_placements_brand ON content_placements(brand_id);
CREATE INDEX IF NOT EXISTS idx_content_placements_content ON content_placements(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_content_placements_template ON content_placements(template_type, template_id);

-- Template Field Mappings (reusable mapping configs)
CREATE TABLE IF NOT EXISTS template_field_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid REFERENCES brands(id) ON DELETE CASCADE,
  template_type text NOT NULL,
  template_id uuid,
  content_type text NOT NULL,
  mapping_name text NOT NULL,
  field_mappings jsonb NOT NULL,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_template_mappings_brand ON template_field_mappings(brand_id);
CREATE INDEX IF NOT EXISTS idx_template_mappings_template ON template_field_mappings(template_type, template_id);

-- AI Content Generations tracking
CREATE TABLE IF NOT EXISTS ai_content_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid REFERENCES brands(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id),
  content_type text NOT NULL,
  content_id uuid,
  prompt_settings jsonb NOT NULL DEFAULT '{}',
  generated_content jsonb,
  tokens_used int DEFAULT 0,
  cost_usd decimal(10,4) DEFAULT 0,
  status text DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
  error_message text,
  generated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_generations_brand ON ai_content_generations(brand_id);
CREATE INDEX IF NOT EXISTS idx_ai_generations_user ON ai_content_generations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_generations_content ON ai_content_generations(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_ai_generations_date ON ai_content_generations(generated_at);

-- AI Content Cache (save costs by reusing similar queries)
CREATE TABLE IF NOT EXISTS ai_content_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type text NOT NULL,
  cache_key text NOT NULL,
  prompt_hash text NOT NULL,
  generated_content jsonb NOT NULL,
  usage_count int DEFAULT 1,
  last_used_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '30 days')
);

CREATE INDEX IF NOT EXISTS idx_ai_cache_key ON ai_content_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_ai_cache_hash ON ai_content_cache(prompt_hash);
CREATE INDEX IF NOT EXISTS idx_ai_cache_expires ON ai_content_cache(expires_at);

-- Enable RLS
ALTER TABLE content_placements ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_field_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_content_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_content_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policies for content_placements
CREATE POLICY "Brands can view own placements"
  ON content_placements FOR SELECT
  TO authenticated
  USING (brand_id IN (SELECT brand_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Brands can insert own placements"
  ON content_placements FOR INSERT
  TO authenticated
  WITH CHECK (brand_id IN (SELECT brand_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Brands can update own placements"
  ON content_placements FOR UPDATE
  TO authenticated
  USING (brand_id IN (SELECT brand_id FROM users WHERE id = auth.uid()))
  WITH CHECK (brand_id IN (SELECT brand_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Brands can delete own placements"
  ON content_placements FOR DELETE
  TO authenticated
  USING (brand_id IN (SELECT brand_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Operators can view all placements"
  ON content_placements FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'operator'));

-- RLS Policies for template_field_mappings
CREATE POLICY "Brands can view own mappings"
  ON template_field_mappings FOR SELECT
  TO authenticated
  USING (
    brand_id IN (SELECT brand_id FROM users WHERE id = auth.uid())
    OR brand_id IS NULL
  );

CREATE POLICY "Brands can insert own mappings"
  ON template_field_mappings FOR INSERT
  TO authenticated
  WITH CHECK (brand_id IN (SELECT brand_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Brands can update own mappings"
  ON template_field_mappings FOR UPDATE
  TO authenticated
  USING (brand_id IN (SELECT brand_id FROM users WHERE id = auth.uid()))
  WITH CHECK (brand_id IN (SELECT brand_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Operators can manage all mappings"
  ON template_field_mappings FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'operator'))
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'operator'));

-- RLS Policies for ai_content_generations
CREATE POLICY "Brands can view own generations"
  ON ai_content_generations FOR SELECT
  TO authenticated
  USING (brand_id IN (SELECT brand_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Brands can insert own generations"
  ON ai_content_generations FOR INSERT
  TO authenticated
  WITH CHECK (brand_id IN (SELECT brand_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Operators can view all generations"
  ON ai_content_generations FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'operator'));

-- RLS Policies for ai_content_cache (public read for efficiency)
CREATE POLICY "Anyone can read cache"
  ON ai_content_cache FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can manage cache"
  ON ai_content_cache FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_content_placements_updated_at ON content_placements;
CREATE TRIGGER update_content_placements_updated_at
  BEFORE UPDATE ON content_placements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_template_mappings_updated_at ON template_field_mappings;
CREATE TRIGGER update_template_mappings_updated_at
  BEFORE UPDATE ON template_field_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to increment cache usage
CREATE OR REPLACE FUNCTION increment_cache_usage(cache_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE ai_content_cache
  SET usage_count = usage_count + 1,
      last_used_at = now()
  WHERE id = cache_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cleanup function for expired cache
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM ai_content_cache WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;