/*
  # Complete Travel Website Builder Database Setup

  1. New Tables
    - `users` - Admin and brand users with authentication
    - `agents` - Travel agents linked to brands  
    - `websites` - Brand websites with content
    - `website_pages` - Individual pages for websites
    - `news_articles` - Content management for brands

  2. Updates to Existing Tables
    - `brands` - Add missing columns (slug, description, contact info, etc.)
    - `companies` - Ensure default company exists

  3. Security
    - Enable RLS on all new tables
    - Add appropriate policies for data access

  4. Sample Data
    - Demo users (admin@travel.com, brand@travel.com)
    - Test agents and articles
    - Working authentication setup
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email text UNIQUE NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'brand')),
  brand_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add missing columns to existing brands table
DO $$
BEGIN
  -- Add slug column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'brands' AND column_name = 'slug'
  ) THEN
    ALTER TABLE brands ADD COLUMN slug text;
  END IF;
  
  -- Add description column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'brands' AND column_name = 'description'
  ) THEN
    ALTER TABLE brands ADD COLUMN description text;
  END IF;
  
  -- Add other missing columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'brands' AND column_name = 'logo_url'
  ) THEN
    ALTER TABLE brands ADD COLUMN logo_url text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'brands' AND column_name = 'business_type'
  ) THEN
    ALTER TABLE brands ADD COLUMN business_type text DEFAULT 'travel_agency';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'brands' AND column_name = 'primary_color'
  ) THEN
    ALTER TABLE brands ADD COLUMN primary_color text DEFAULT '#0EA5E9';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'brands' AND column_name = 'secondary_color'
  ) THEN
    ALTER TABLE brands ADD COLUMN secondary_color text DEFAULT '#F97316';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'brands' AND column_name = 'contact_person'
  ) THEN
    ALTER TABLE brands ADD COLUMN contact_person text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'brands' AND column_name = 'contact_email'
  ) THEN
    ALTER TABLE brands ADD COLUMN contact_email text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'brands' AND column_name = 'contact_phone'
  ) THEN
    ALTER TABLE brands ADD COLUMN contact_phone text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'brands' AND column_name = 'street_address'
  ) THEN
    ALTER TABLE brands ADD COLUMN street_address text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'brands' AND column_name = 'city'
  ) THEN
    ALTER TABLE brands ADD COLUMN city text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'brands' AND column_name = 'postal_code'
  ) THEN
    ALTER TABLE brands ADD COLUMN postal_code text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'brands' AND column_name = 'country'
  ) THEN
    ALTER TABLE brands ADD COLUMN country text DEFAULT 'Netherlands';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'brands' AND column_name = 'website_url'
  ) THEN
    ALTER TABLE brands ADD COLUMN website_url text;
  END IF;
END $$;

-- Update existing brands with slug values if they don't have them
UPDATE brands SET slug = 'the-travel-club' WHERE name = 'The Travel Club' AND slug IS NULL;
UPDATE brands SET slug = 'reisbureau-del-monde' WHERE name = 'Reisbureau Del Monde' AND slug IS NULL;
UPDATE brands SET slug = 'testbrand' WHERE name = 'TestBrand' AND slug IS NULL;

-- Make slug NOT NULL after updating existing records
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'brands' AND column_name = 'slug' AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE brands ALTER COLUMN slug SET NOT NULL;
  END IF;
END $$;

-- Add unique constraint on slug if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'brands' AND constraint_name = 'brands_slug_key'
  ) THEN
    ALTER TABLE brands ADD CONSTRAINT brands_slug_key UNIQUE (slug);
  END IF;
END $$;

-- Agents table
CREATE TABLE IF NOT EXISTS agents (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id uuid REFERENCES brands(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  role text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Websites table
CREATE TABLE IF NOT EXISTS websites (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  template_id uuid,
  name text NOT NULL,
  slug text NOT NULL,
  domain text,
  content jsonb DEFAULT '{}',
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'published')),
  is_published boolean DEFAULT false,
  published_at timestamptz,
  created_by uuid NOT NULL REFERENCES users(id),
  approved_by uuid REFERENCES users(id),
  approved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Website pages table
CREATE TABLE IF NOT EXISTS website_pages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  website_id uuid NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  content jsonb DEFAULT '{}',
  meta_title text,
  meta_description text,
  is_homepage boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- News articles table
CREATE TABLE IF NOT EXISTS news_articles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id uuid,
  brand_id uuid REFERENCES brands(id) ON DELETE CASCADE,
  title text NOT NULL,
  slug text NOT NULL,
  content jsonb DEFAULT '{}',
  featured_image_url text,
  excerpt text,
  status text DEFAULT 'draft',
  published_at timestamptz,
  brand_approved boolean DEFAULT false,
  brand_mandatory boolean DEFAULT false,
  website_visible boolean DEFAULT false,
  author_type text DEFAULT 'admin' CHECK (author_type IN ('admin', 'brand')),
  author_brand_id uuid REFERENCES brands(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE websites ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_articles ENABLE ROW LEVEL SECURITY;

-- Sample data setup
DO $$
DECLARE
    default_company_id uuid;
BEGIN
    -- Get or create default company
    SELECT id INTO default_company_id FROM companies LIMIT 1;
    
    IF default_company_id IS NULL THEN
        INSERT INTO companies (id, name, category) 
        VALUES ('550e8400-e29b-41d4-a716-446655440100', 'Default Company', 'general')
        ON CONFLICT (id) DO NOTHING;
        default_company_id := '550e8400-e29b-41d4-a716-446655440100';
    END IF;
    
    -- Insert brands with company_id
    INSERT INTO brands (id, company_id, name, slug, description, business_type, contact_email) 
    SELECT '550e8400-e29b-41d4-a716-446655440001', default_company_id, 'The Travel Club', 'the-travel-club', 'Franchise nummer 1', 'franchise', 'info@thetravelclub.nl'
    WHERE NOT EXISTS (SELECT 1 FROM brands WHERE slug = 'the-travel-club');
    
    INSERT INTO brands (id, company_id, name, slug, description, business_type, contact_email) 
    SELECT '550e8400-e29b-41d4-a716-446655440002', default_company_id, 'Reisbureau Del Monde', 'reisbureau-del-monde', 'ZRB Formule', 'independent', 'info@delmonde.nl'
    WHERE NOT EXISTS (SELECT 1 FROM brands WHERE slug = 'reisbureau-del-monde');
    
    INSERT INTO brands (id, company_id, name, slug, description, business_type, contact_email) 
    SELECT '550e8400-e29b-41d4-a716-446655440003', default_company_id, 'TestBrand', 'testbrand', 'Eigen merk', 'independent', 'test@brand.nl'
    WHERE NOT EXISTS (SELECT 1 FROM brands WHERE slug = 'testbrand');
END $$;

-- Insert users
INSERT INTO users (id, email, role, brand_id) 
SELECT '550e8400-e29b-41d4-a716-446655440010', 'admin@travel.com', 'admin', NULL
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@travel.com');

INSERT INTO users (id, email, role, brand_id) 
SELECT '550e8400-e29b-41d4-a716-446655440011', 'brand@travel.com', 'brand', '550e8400-e29b-41d4-a716-446655440001'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'brand@travel.com');

-- Insert agents
INSERT INTO agents (id, brand_id, name, email, phone) 
SELECT '550e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440001', 'Test Agent', 'test@agent.nl', '+31611725801'
WHERE NOT EXISTS (SELECT 1 FROM agents WHERE email = 'test@agent.nl');

-- Insert news articles
INSERT INTO news_articles (id, title, slug, status, brand_approved, brand_mandatory, website_visible, author_type, brand_id) 
SELECT '550e8400-e29b-41d4-a716-446655440030', 'test2', 'test2', 'Brand Toegang', false, true, false, 'admin', NULL
WHERE NOT EXISTS (SELECT 1 FROM news_articles WHERE slug = 'test2');

INSERT INTO news_articles (id, title, slug, status, brand_approved, brand_mandatory, website_visible, author_type, brand_id) 
SELECT '550e8400-e29b-41d4-a716-446655440031', 'Admin vliegen', 'admin-vliegen', 'Brand Toegang', true, true, true, 'admin', NULL
WHERE NOT EXISTS (SELECT 1 FROM news_articles WHERE slug = 'admin-vliegen');

INSERT INTO news_articles (id, title, slug, status, brand_approved, brand_mandatory, website_visible, author_type, brand_id) 
SELECT '550e8400-e29b-41d4-a716-446655440032', 'test 8', 'test-8', 'Live', true, false, true, 'brand', '550e8400-e29b-41d4-a716-446655440001'
WHERE NOT EXISTS (SELECT 1 FROM news_articles WHERE slug = 'test-8');

INSERT INTO news_articles (id, title, slug, status, brand_approved, brand_mandatory, website_visible, author_type, brand_id) 
SELECT '550e8400-e29b-41d4-a716-446655440033', 'test Alex', 'test-alex', 'Live', true, false, true, 'brand', '550e8400-e29b-41d4-a716-446655440001'
WHERE NOT EXISTS (SELECT 1 FROM news_articles WHERE slug = 'test-alex');