/*
  # Domain Linking System for Brand Websites
  
  ## Overview
  Enables brands to link custom domains to their published websites with DNS verification.
  
  ## New Tables
  
  ### `brand_domains`
  Stores custom domain configurations for brands
  - `id` (uuid, primary key) - Unique domain configuration ID
  - `brand_id` (uuid, foreign key) - Links to brands table
  - `domain` (text, unique) - Custom domain (e.g., reisbureau-amsterdam.nl)
  - `status` (text) - Verification status: pending, verified, failed
  - `dns_verified_at` (timestamptz) - When DNS verification succeeded
  - `verification_token` (text) - Unique token for DNS TXT record verification
  - `ssl_enabled` (boolean) - Whether HTTPS is enabled
  - `is_primary` (boolean) - Primary domain for this brand
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp
  
  ## Security
  - RLS enabled on all tables
  - Brands can only manage their own domains
  - Operators can view and manage all domains
  
  ## DNS Verification Process
  1. Brand adds domain → system generates verification_token
  2. Brand adds TXT record: _bolt-verify.domain.nl → {verification_token}
  3. System checks DNS record → updates status to 'verified'
  4. SSL certificate is automatically issued
*/

-- Create brand_domains table
CREATE TABLE IF NOT EXISTS brand_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  domain text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'failed', 'expired')),
  dns_verified_at timestamptz,
  verification_token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  ssl_enabled boolean DEFAULT false,
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_domain CHECK (domain ~* '^[a-z0-9]([a-z0-9\-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9\-]{0,61}[a-z0-9])?)*$')
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_brand_domains_brand_id ON brand_domains(brand_id);
CREATE INDEX IF NOT EXISTS idx_brand_domains_domain ON brand_domains(domain);
CREATE INDEX IF NOT EXISTS idx_brand_domains_status ON brand_domains(status);

-- Enable RLS
ALTER TABLE brand_domains ENABLE ROW LEVEL SECURITY;

-- RLS Policies for brand_domains

-- Brands can view their own domains
CREATE POLICY "Brands can view own domains"
  ON brand_domains
  FOR SELECT
  TO authenticated
  USING (
    brand_id IN (
      SELECT brand_id FROM users WHERE id = auth.uid()
    )
  );

-- Brands can insert their own domains
CREATE POLICY "Brands can add own domains"
  ON brand_domains
  FOR INSERT
  TO authenticated
  WITH CHECK (
    brand_id IN (
      SELECT brand_id FROM users WHERE id = auth.uid()
    )
  );

-- Brands can update their own domains
CREATE POLICY "Brands can update own domains"
  ON brand_domains
  FOR UPDATE
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

-- Brands can delete their own domains
CREATE POLICY "Brands can delete own domains"
  ON brand_domains
  FOR DELETE
  TO authenticated
  USING (
    brand_id IN (
      SELECT brand_id FROM users WHERE id = auth.uid()
    )
  );

-- Operators can view all domains
CREATE POLICY "Operators can view all domains"
  ON brand_domains
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'operator'
    )
  );

-- Operators can manage all domains
CREATE POLICY "Operators can manage all domains"
  ON brand_domains
  FOR ALL
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

-- Function to ensure only one primary domain per brand
CREATE OR REPLACE FUNCTION ensure_single_primary_domain()
RETURNS TRIGGER AS $$
BEGIN
  -- If setting this domain as primary, unset others
  IF NEW.is_primary = true THEN
    UPDATE brand_domains
    SET is_primary = false
    WHERE brand_id = NEW.brand_id
    AND id != NEW.id
    AND is_primary = true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for primary domain enforcement
DROP TRIGGER IF EXISTS trigger_ensure_single_primary_domain ON brand_domains;
CREATE TRIGGER trigger_ensure_single_primary_domain
  BEFORE INSERT OR UPDATE ON brand_domains
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_primary_domain();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_brand_domains_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS trigger_update_brand_domains_updated_at ON brand_domains;
CREATE TRIGGER trigger_update_brand_domains_updated_at
  BEFORE UPDATE ON brand_domains
  FOR EACH ROW
  EXECUTE FUNCTION update_brand_domains_updated_at();
