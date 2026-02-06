/*
  # TravelC Reizen Module
  
  Nieuwe tabellen voor het beheren van reizen vanuit TravelCStudio,
  geïmporteerd van Travel Compositor.
  
  ## Tabellen
  
  1. **travelc_travels** - Centrale reizen (geïmporteerd van TC)
  2. **travelc_travel_brand_assignments** - Brand-specifieke instellingen per reis
  
  ## Flow
  1. Admin/Brand importeert reis via TC ID
  2. Reis data wordt opgeslagen in travelc_travels
  3. Brand activeert reis en past instellingen aan
  4. WordPress plugin haalt actieve reizen op via API
*/

-- Centrale reizen tabel (geïmporteerd van Travel Compositor)
CREATE TABLE IF NOT EXISTS travelc_travels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Travel Compositor identificatie
  travel_compositor_id TEXT UNIQUE NOT NULL,
  
  -- Basis informatie
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  intro_text TEXT,
  
  -- Reis details
  number_of_nights INTEGER,
  number_of_days INTEGER,
  price_per_person DECIMAL(10,2),
  price_description TEXT,
  
  -- Locaties
  destinations JSONB DEFAULT '[]',
  -- Format: [{ "name": "Dublin", "country": "Ierland", "nights": 3, "imageUrls": [...] }]
  
  countries JSONB DEFAULT '[]',
  -- Format: ["Ierland", "Noord-Ierland"]
  
  -- Hotels
  hotels JSONB DEFAULT '[]',
  -- Format: [{ "name": "Hotel X", "stars": 4, "location": "Dublin", "imageUrl": "..." }]
  
  -- Media
  images JSONB DEFAULT '[]',
  hero_image TEXT,
  hero_video_url TEXT,
  route_map_url TEXT,
  
  -- Reis programma
  itinerary JSONB DEFAULT '[]',
  -- Format: [{ "day": 1, "title": "Aankomst Dublin", "description": "...", "activities": [...] }]
  
  -- Inclusief/Exclusief
  included JSONB DEFAULT '[]',
  excluded JSONB DEFAULT '[]',
  
  -- Extra informatie
  highlights JSONB DEFAULT '[]',
  practical_info JSONB DEFAULT '{}',
  
  -- Ruwe TC data (voor backup/debug)
  raw_tc_data JSONB,
  
  -- Metadata
  author_type TEXT DEFAULT 'admin',
  author_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Brand-specifieke instellingen per reis
CREATE TABLE IF NOT EXISTS travelc_travel_brand_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relaties
  travel_id UUID NOT NULL REFERENCES travelc_travels(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  
  -- Activatie
  is_active BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  
  -- Display opties
  show_hotels BOOLEAN DEFAULT true,
  show_prices BOOLEAN DEFAULT true,
  show_itinerary BOOLEAN DEFAULT true,
  header_type TEXT DEFAULT 'image' CHECK (header_type IN ('image', 'video', 'slideshow')),
  
  -- Custom overrides (optioneel - als NULL, gebruik origineel)
  custom_title TEXT,
  custom_description TEXT,
  custom_intro_text TEXT,
  custom_price DECIMAL(10,2),
  custom_hero_image TEXT,
  custom_hero_video_url TEXT,
  
  -- Volgorde op listing page
  display_order INTEGER DEFAULT 0,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  
  -- Metadata
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Unieke combinatie
  UNIQUE(travel_id, brand_id)
);

-- Indexes voor performance
CREATE INDEX IF NOT EXISTS idx_travelc_travels_tc_id ON travelc_travels(travel_compositor_id);
CREATE INDEX IF NOT EXISTS idx_travelc_travels_slug ON travelc_travels(slug);
CREATE INDEX IF NOT EXISTS idx_travelc_travels_created_at ON travelc_travels(created_at);

CREATE INDEX IF NOT EXISTS idx_travelc_travel_assignments_travel_id ON travelc_travel_brand_assignments(travel_id);
CREATE INDEX IF NOT EXISTS idx_travelc_travel_assignments_brand_id ON travelc_travel_brand_assignments(brand_id);
CREATE INDEX IF NOT EXISTS idx_travelc_travel_assignments_active ON travelc_travel_brand_assignments(is_active);
CREATE INDEX IF NOT EXISTS idx_travelc_travel_assignments_featured ON travelc_travel_brand_assignments(is_featured);

-- Enable RLS
ALTER TABLE travelc_travels ENABLE ROW LEVEL SECURITY;
ALTER TABLE travelc_travel_brand_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies voor travelc_travels

-- Iedereen kan reizen lezen (voor WordPress API)
CREATE POLICY "Public read access for travels"
  ON travelc_travels FOR SELECT
  TO anon, authenticated
  USING (true);

-- Alleen admins kunnen reizen aanmaken/bewerken
CREATE POLICY "Admins can insert travels"
  ON travelc_travels FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can update travels"
  ON travelc_travels FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can delete travels"
  ON travelc_travels FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- RLS Policies voor travelc_travel_brand_assignments

-- Brands kunnen hun eigen assignments lezen
CREATE POLICY "Users can view their brand assignments"
  ON travelc_travel_brand_assignments FOR SELECT
  TO authenticated
  USING (
    brand_id IN (
      SELECT brand_id FROM users WHERE id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- Anon kan actieve assignments lezen (voor WordPress API)
CREATE POLICY "Public read access for active assignments"
  ON travelc_travel_brand_assignments FOR SELECT
  TO anon
  USING (is_active = true);

-- Admins kunnen assignments aanmaken
CREATE POLICY "Admins can insert assignments"
  ON travelc_travel_brand_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- Brands kunnen hun eigen assignments bewerken
CREATE POLICY "Users can update their brand assignments"
  ON travelc_travel_brand_assignments FOR UPDATE
  TO authenticated
  USING (
    brand_id IN (
      SELECT brand_id FROM users WHERE id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- Admins kunnen assignments verwijderen
CREATE POLICY "Admins can delete assignments"
  ON travelc_travel_brand_assignments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- Trigger voor updated_at
CREATE OR REPLACE FUNCTION update_travelc_travels_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER travelc_travels_updated_at
  BEFORE UPDATE ON travelc_travels
  FOR EACH ROW
  EXECUTE FUNCTION update_travelc_travels_updated_at();

CREATE TRIGGER travelc_travel_assignments_updated_at
  BEFORE UPDATE ON travelc_travel_brand_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_travelc_travels_updated_at();
