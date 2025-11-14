/*
  # Add WhatsApp Templates Table

  1. New Tables
    - `whatsapp_templates`
      - `id` (uuid, primary key)
      - `brand_id` (uuid, nullable for system templates)
      - `name` (text) - Template naam
      - `template_sid` (text) - Twilio Content SID
      - `description` (text) - Beschrijving van template
      - `variables` (jsonb) - Template variabelen configuratie
      - `is_active` (boolean) - Of template actief is
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `whatsapp_templates` table
    - System templates (brand_id = null) readable by all authenticated users
    - Brand-specific templates only accessible by brand members
    - Operators can manage all templates
*/

CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid REFERENCES brands(id) ON DELETE CASCADE,
  name text NOT NULL,
  template_sid text NOT NULL,
  description text,
  variables jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE whatsapp_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System templates readable by authenticated users"
  ON whatsapp_templates FOR SELECT
  TO authenticated
  USING (brand_id IS NULL);

CREATE POLICY "Brand templates readable by brand members"
  ON whatsapp_templates FOR SELECT
  TO authenticated
  USING (
    brand_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.brand_id = whatsapp_templates.brand_id
    )
  );

CREATE POLICY "Operators can manage all templates"
  ON whatsapp_templates FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'operator'
    )
  );

CREATE POLICY "Brands can manage their own templates"
  ON whatsapp_templates FOR ALL
  TO authenticated
  USING (
    brand_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.brand_id = whatsapp_templates.brand_id
    )
  );

CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_brand_id ON whatsapp_templates(brand_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_is_active ON whatsapp_templates(is_active);