/*
  # Fix kritieke beveiligingsproblemen met ANON toegang

  ## Overzicht
  Deze migratie verwijdert alle onveilige policies die anonieme gebruikers onbeperkte toegang gaven tot gevoelige data.

  ## Problemen die worden opgelost:
  
  1. **brands** - Was volledig open, nu alleen toegankelijk voor ingelogde brand-medewerkers
  2. **news_items** - Was volledig open, nu alleen toegankelijk voor brand-medewerkers
  3. **template_drafts** - Was volledig open voor ALLE operaties, nu alleen voor operators
  4. **travel_intakes** - Klantdata was volledig zichtbaar en aanpasbaar, nu strict beveiligd
  5. **travel_whatsapp_sessions** - Alle gesprekken waren zichtbaar, nu strict beveiligd
  6. **websites** - Was volledig open voor ALLE operaties, nu alleen voor brand-medewerkers
  
  ## Security verbetering:
  - Alle policies vereisen nu `authenticated` users
  - Data is beperkt tot de eigen brand van de gebruiker
  - Operators behouden volledige toegang
  - Anonymous users hebben GEEN toegang meer tot gevoelige data
*/

-- 1. FIX BRANDS TABLE
-- Drop de gevaarlijke policy
DROP POLICY IF EXISTS "Allow all anon read on brands" ON brands;

-- Brands policy blijft hetzelfde voor authenticated users (al correct ingesteld)
-- Geen nieuwe policy nodig, bestaande authenticated policies zijn veilig


-- 2. FIX NEWS_ITEMS TABLE
-- Drop de gevaarlijke policy
DROP POLICY IF EXISTS "Anonymous can read news_items for builder" ON news_items;

-- Geen nieuwe policy nodig, authenticated users kunnen al nieuws zien via bestaande policies


-- 3. FIX TEMPLATE_DRAFTS TABLE
-- Drop de ZEER gevaarlijke policy die ALL operations toestond
DROP POLICY IF EXISTS "Allow all anon operations on template_drafts" ON template_drafts;

-- Operators kunnen drafts beheren
CREATE POLICY "Operators can manage template drafts"
  ON template_drafts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'operator'
    )
  );


-- 4. FIX TRAVEL_INTAKES TABLE
-- Drop alle gevaarlijke anon policies
DROP POLICY IF EXISTS "Anonymous can read intakes" ON travel_intakes;
DROP POLICY IF EXISTS "Anonymous can update own intakes" ON travel_intakes;

-- Brand medewerkers kunnen hun eigen intakes zien
CREATE POLICY "Brand users can view own brand intakes"
  ON travel_intakes
  FOR SELECT
  TO authenticated
  USING (
    brand_id IN (
      SELECT brand_id FROM users
      WHERE users.id = auth.uid()
    )
  );

-- Brand medewerkers kunnen hun eigen intakes updaten
CREATE POLICY "Brand users can update own brand intakes"
  ON travel_intakes
  FOR UPDATE
  TO authenticated
  USING (
    brand_id IN (
      SELECT brand_id FROM users
      WHERE users.id = auth.uid()
    )
  )
  WITH CHECK (
    brand_id IN (
      SELECT brand_id FROM users
      WHERE users.id = auth.uid()
    )
  );


-- 5. FIX TRAVEL_WHATSAPP_SESSIONS TABLE
-- Drop de gevaarlijke policy
DROP POLICY IF EXISTS "Anonymous can read WhatsApp sessions" ON travel_whatsapp_sessions;

-- Brand medewerkers kunnen hun eigen sessies zien
CREATE POLICY "Brand users can view own brand sessions"
  ON travel_whatsapp_sessions
  FOR SELECT
  TO authenticated
  USING (
    brand_id IN (
      SELECT brand_id FROM users
      WHERE users.id = auth.uid()
    )
  );

-- Brand medewerkers kunnen hun eigen sessies updaten
CREATE POLICY "Brand users can update own brand sessions"
  ON travel_whatsapp_sessions
  FOR UPDATE
  TO authenticated
  USING (
    brand_id IN (
      SELECT brand_id FROM users
      WHERE users.id = auth.uid()
    )
  )
  WITH CHECK (
    brand_id IN (
      SELECT brand_id FROM users
      WHERE users.id = auth.uid()
    )
  );


-- 6. FIX WEBSITES TABLE
-- Drop de ZEER gevaarlijke policy die ALL operations toestond
DROP POLICY IF EXISTS "Allow all anon operations on websites" ON websites;

-- Brand medewerkers kunnen hun eigen websites beheren
CREATE POLICY "Brand users can manage own websites"
  ON websites
  FOR ALL
  TO authenticated
  USING (
    brand_id IN (
      SELECT brand_id FROM users
      WHERE users.id = auth.uid()
    )
  )
  WITH CHECK (
    brand_id IN (
      SELECT brand_id FROM users
      WHERE users.id = auth.uid()
    )
  );
