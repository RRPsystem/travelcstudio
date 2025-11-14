/*
  # Create Brand Layouts Table

  Creates a single table to store all layout data (header, footer, menu) per brand.

  ## New Tables
    - `brand_layouts`
      - `brand_id` (uuid, primary key, references brands)
      - `header_json` (jsonb) - header configuration
      - `header_html` (text) - published header HTML
      - `footer_json` (jsonb) - footer configuration
      - `footer_html` (text) - published footer HTML
      - `menu_json` (jsonb) - menu structure
      - `status` (text) - draft or published
      - `version` (integer) - increments on publish
      - `updated_at` (timestamptz) - last update timestamp
      - `created_at` (timestamptz) - creation timestamp

  ## Security
    - Enable RLS on `brand_layouts` table
    - Service role can read/write (for Functions)
    - Public can read published layouts (for renderer)
    - Brand users can read their own layouts

  ## Notes
    - Single record per brand (brand_id is PK)
    - Version increments on each publish
    - Renderer reads published layouts via public endpoint
*/

CREATE TABLE IF NOT EXISTS brand_layouts (
  brand_id uuid PRIMARY KEY REFERENCES brands(id) ON DELETE CASCADE,
  header_json jsonb DEFAULT '{}'::jsonb,
  header_html text DEFAULT '',
  footer_json jsonb DEFAULT '{}'::jsonb,
  footer_html text DEFAULT '',
  menu_json jsonb DEFAULT '[]'::jsonb,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  version integer DEFAULT 1,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE brand_layouts ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (for Functions)
CREATE POLICY "Service role can manage all layouts"
  ON brand_layouts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Public can read published layouts (for renderer)
CREATE POLICY "Public can read published layouts"
  ON brand_layouts
  FOR SELECT
  TO anon, authenticated
  USING (status = 'published');

-- Brand users can read their own layouts
CREATE POLICY "Brand users can read own layouts"
  ON brand_layouts
  FOR SELECT
  TO authenticated
  USING (
    brand_id IN (
      SELECT brand_id FROM users WHERE id = auth.uid()
    )
  );

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_brand_layouts_status ON brand_layouts(status);
CREATE INDEX IF NOT EXISTS idx_brand_layouts_updated_at ON brand_layouts(updated_at DESC);

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_brand_layouts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER brand_layouts_updated_at
  BEFORE UPDATE ON brand_layouts
  FOR EACH ROW
  EXECUTE FUNCTION update_brand_layouts_updated_at();