/*
  # Create Website Templates System
  
  1. New Tables
    - `website_templates`
      - `id` (uuid, primary key)
      - `title` (text) - Template naam
      - `description` (text) - Beschrijving van de template
      - `template_type` (text) - 'wordpress' of 'external_builder'
      - `category` (text) - Voor wordpress: category name, voor builder: tag/category
      - `preview_image_url` (text) - Preview afbeelding
      - `page_ids` (jsonb) - Array van page IDs die bij deze template horen
      - `is_active` (boolean) - Of template beschikbaar is
      - `sort_order` (integer) - Volgorde in lijst
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS
    - Brands can read active templates
    - Operators can manage all templates
*/

CREATE TABLE IF NOT EXISTS website_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  template_type text NOT NULL CHECK (template_type IN ('wordpress', 'external_builder')),
  category text,
  preview_image_url text,
  page_ids jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE website_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brands can read active website templates"
  ON website_templates
  FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Operators can read all website templates"
  ON website_templates
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'operator'
    )
  );

CREATE POLICY "Operators can insert website templates"
  ON website_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'operator'
    )
  );

CREATE POLICY "Operators can update website templates"
  ON website_templates
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'operator'
    )
  );

CREATE POLICY "Operators can delete website templates"
  ON website_templates
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'operator'
    )
  );

CREATE INDEX IF NOT EXISTS idx_website_templates_active ON website_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_website_templates_type ON website_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_website_templates_sort ON website_templates(sort_order);