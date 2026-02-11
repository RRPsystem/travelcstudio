-- ============================================
-- RUN THIS IN SUPABASE DASHBOARD > SQL EDITOR
-- ============================================

-- Travel Offertes table
CREATE TABLE IF NOT EXISTS travel_offertes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES users(id) ON DELETE SET NULL,
  travel_compositor_id TEXT,
  
  client_name TEXT NOT NULL DEFAULT '',
  client_email TEXT,
  client_phone TEXT,
  
  title TEXT NOT NULL DEFAULT 'Nieuwe Offerte',
  subtitle TEXT,
  intro_text TEXT,
  hero_image_url TEXT,
  hero_video_url TEXT,
  
  destinations JSONB DEFAULT '[]'::jsonb,
  items JSONB DEFAULT '[]'::jsonb,
  extra_costs JSONB DEFAULT '[]'::jsonb,
  
  total_price NUMERIC(10,2) DEFAULT 0,
  price_per_person NUMERIC(10,2) DEFAULT 0,
  number_of_travelers INTEGER DEFAULT 2,
  currency TEXT DEFAULT 'EUR',
  
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'accepted', 'revised', 'expired')),
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  valid_until DATE,
  
  internal_notes TEXT,
  terms_conditions TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_travel_offertes_brand_id ON travel_offertes(brand_id);
CREATE INDEX IF NOT EXISTS idx_travel_offertes_agent_id ON travel_offertes(agent_id);
CREATE INDEX IF NOT EXISTS idx_travel_offertes_status ON travel_offertes(status);

ALTER TABLE travel_offertes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (safe re-run)
DROP POLICY IF EXISTS "Admins can manage all offertes" ON travel_offertes;
DROP POLICY IF EXISTS "Brands can manage own offertes" ON travel_offertes;
DROP POLICY IF EXISTS "Agents can manage own offertes" ON travel_offertes;

CREATE POLICY "Admins can manage all offertes" ON travel_offertes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'operator'))
  );

CREATE POLICY "Brands can manage own offertes" ON travel_offertes
  FOR ALL USING (
    brand_id IN (SELECT brand_id FROM users WHERE users.id = auth.uid())
  );

CREATE POLICY "Agents can manage own offertes" ON travel_offertes
  FOR ALL USING (
    agent_id = auth.uid()
  );

CREATE OR REPLACE FUNCTION update_travel_offertes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_travel_offertes_updated_at ON travel_offertes;
CREATE TRIGGER trigger_update_travel_offertes_updated_at
  BEFORE UPDATE ON travel_offertes
  FOR EACH ROW
  EXECUTE FUNCTION update_travel_offertes_updated_at();
