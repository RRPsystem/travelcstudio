-- ============================================
-- RUN THIS IN SUPABASE DASHBOARD > SQL EDITOR
-- ============================================
-- Migration: TC Microsites van 1-op-1 brand naar many-to-many matrix
-- Microsites zijn nu globaal (operator beheert), brands krijgen toegang via koppeltabel

-- Stap 1: Verwijder brand_id constraint van tc_microsites (credentials worden globaal)
ALTER TABLE tc_microsites DROP CONSTRAINT IF EXISTS tc_microsites_brand_id_fkey;
ALTER TABLE tc_microsites ALTER COLUMN brand_id DROP NOT NULL;

-- Stap 2: Maak koppeltabel voor brand ↔ microsite toegang
CREATE TABLE IF NOT EXISTS tc_microsite_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  microsite_id UUID NOT NULL REFERENCES tc_microsites(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(brand_id, microsite_id)
);

CREATE INDEX IF NOT EXISTS idx_tc_microsite_access_brand ON tc_microsite_access(brand_id);
CREATE INDEX IF NOT EXISTS idx_tc_microsite_access_microsite ON tc_microsite_access(microsite_id);

-- Stap 3: RLS voor koppeltabel
ALTER TABLE tc_microsite_access ENABLE ROW LEVEL SECURITY;

-- Alleen admins/operators mogen de matrix beheren
DROP POLICY IF EXISTS "Admins can manage tc_microsite_access" ON tc_microsite_access;
CREATE POLICY "Admins can manage tc_microsite_access" ON tc_microsite_access
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'operator'))
  );

-- Brands mogen hun eigen koppelingen LEZEN (niet wijzigen)
DROP POLICY IF EXISTS "Brands can read own tc_microsite_access" ON tc_microsite_access;
CREATE POLICY "Brands can read own tc_microsite_access" ON tc_microsite_access
  FOR SELECT USING (
    brand_id IN (SELECT brand_id FROM users WHERE users.id = auth.uid())
  );

-- Stap 4: Update RLS op tc_microsites - brands mogen NIET meer direct bij credentials
-- Verwijder oude brand-gebaseerde policy
DROP POLICY IF EXISTS "Brand users can manage own tc_microsites" ON tc_microsites;

-- Brands mogen alleen microsites LEZEN waar ze toegang toe hebben (via koppeltabel)
-- Ze zien GEEN credentials (username/password) - dat gaat via Edge Functions
DROP POLICY IF EXISTS "Brands can read accessible tc_microsites" ON tc_microsites;
CREATE POLICY "Brands can read accessible tc_microsites" ON tc_microsites
  FOR SELECT USING (
    id IN (
      SELECT microsite_id FROM tc_microsite_access 
      WHERE brand_id IN (SELECT brand_id FROM users WHERE users.id = auth.uid())
    )
  );

-- Stap 5: Migreer bestaande data - als er microsites met brand_id zijn, maak koppelingen aan
INSERT INTO tc_microsite_access (brand_id, microsite_id)
SELECT brand_id, id FROM tc_microsites 
WHERE brand_id IS NOT NULL
ON CONFLICT (brand_id, microsite_id) DO NOTHING;

-- Stap 6: Voeg last_test_status kolom toe voor verbindingstest resultaat
ALTER TABLE tc_microsites ADD COLUMN IF NOT EXISTS last_test_status TEXT;
ALTER TABLE tc_microsites ADD COLUMN IF NOT EXISTS last_test_message TEXT;
