/*
  # Trip Type System voor Roadbooks, Offertes en andere reis-types
  
  1. Nieuwe Velden
    - `trip_type`: Type reis (roadbook, offerte, wordpress, catalog, etc)
    - `share_token`: Unieke token voor het delen van roadbooks/offertes
    - `share_domain`: Optioneel custom domain voor deze reis
    - `share_settings`: JSONB met share instellingen (password, expiry, etc)
    
  2. Updates
    - Bestaande trips krijgen type 'catalog' (default)
    - Test 6 Afrika krijgt type 'roadbook'
    
  3. Indexes
    - Index op trip_type voor snelle filtering
    - Index op share_token voor snelle lookups
    
  4. RLS
    - Share tokens zijn publiek toegankelijk
    - Alleen brand owners kunnen trips aanmaken/bewerken
*/

-- 1. Voeg trip_type enum toe
DO $$ BEGIN
  CREATE TYPE trip_type_enum AS ENUM (
    'catalog',      -- Standaard reis in de catalogus
    'roadbook',     -- Roadbook gemaakt voor specifieke klant
    'offerte',      -- Offerte/quote voor klant
    'wordpress',    -- Geïmporteerd uit WordPress
    'custom'        -- Custom type
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Voeg nieuwe kolommen toe aan trips
ALTER TABLE trips 
  ADD COLUMN IF NOT EXISTS trip_type trip_type_enum DEFAULT 'catalog',
  ADD COLUMN IF NOT EXISTS share_token text UNIQUE,
  ADD COLUMN IF NOT EXISTS share_domain text,
  ADD COLUMN IF NOT EXISTS share_settings jsonb DEFAULT '{
    "password_protected": false,
    "password": null,
    "expires_at": null,
    "view_count": 0,
    "max_views": null,
    "show_price": true,
    "show_contact": true,
    "custom_message": null
  }'::jsonb;

-- 3. Genereer share tokens voor bestaande trips
UPDATE trips 
SET share_token = gen_random_uuid()::text
WHERE share_token IS NULL;

-- 4. Maak Test 6 Afrika een roadbook
UPDATE trips
SET 
  trip_type = 'roadbook',
  share_settings = jsonb_set(
    share_settings,
    '{custom_message}',
    '"Dit is jouw persoonlijke roadbook voor de reis naar Afrika"'
  )
WHERE title = 'Test 6 Afrika'
AND brand_id = 'b150cb6c-7623-4471-a304-9db0fa6f70a4';

-- 5. Indexes voor performance
CREATE INDEX IF NOT EXISTS idx_trips_trip_type ON trips(trip_type);
CREATE INDEX IF NOT EXISTS idx_trips_share_token ON trips(share_token);
CREATE INDEX IF NOT EXISTS idx_trips_brand_type ON trips(brand_id, trip_type);

-- 6. Functie om share URL te genereren
CREATE OR REPLACE FUNCTION get_trip_share_url(trip_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_token text;
  v_domain text;
  v_brand_id uuid;
  v_subdomain text;
BEGIN
  -- Haal trip info op
  SELECT share_token, share_domain, t.brand_id
  INTO v_token, v_domain, v_brand_id
  FROM trips t
  WHERE t.id = trip_id;
  
  IF v_token IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Als er een custom domain is, gebruik die
  IF v_domain IS NOT NULL THEN
    RETURN 'https://' || v_domain || '/trip/' || v_token;
  END IF;
  
  -- Anders gebruik het brand subdomain
  SELECT subdomain INTO v_subdomain
  FROM brand_domains
  WHERE brand_id = v_brand_id
  AND verified = true
  LIMIT 1;
  
  IF v_subdomain IS NOT NULL THEN
    RETURN 'https://' || v_subdomain || '.ai-travelstudio.nl/trip/' || v_token;
  END IF;
  
  -- Fallback naar main domain
  RETURN 'https://www.ai-travelstudio.nl/trip/' || v_token;
END;
$$;

-- 7. RLS policies voor publieke toegang tot gedeelde trips
CREATE POLICY "Publieke toegang tot gedeelde trips via share_token"
  ON trips FOR SELECT
  USING (
    share_token IS NOT NULL
    AND (
      -- Altijd toegang voor brand owners
      brand_id IN (
        SELECT brand_id FROM users WHERE id = auth.uid()
      )
      OR
      -- Publieke toegang als token bekend is (wordt gecheckt in de app)
      true
    )
  );

-- 8. View voor eenvoudige trip lijst met type
CREATE OR REPLACE VIEW trips_with_share_url AS
SELECT 
  t.*,
  get_trip_share_url(t.id) as share_url,
  b.name as brand_name,
  CASE 
    WHEN t.trip_type = 'roadbook' THEN '📚 Roadbook'
    WHEN t.trip_type = 'offerte' THEN '💰 Offerte'
    WHEN t.trip_type = 'wordpress' THEN '📝 WordPress'
    WHEN t.trip_type = 'catalog' THEN '📖 Catalogus'
    ELSE '🎯 Custom'
  END as type_label
FROM trips t
LEFT JOIN brands b ON b.id = t.brand_id;

-- 9. Grants
GRANT SELECT ON trips_with_share_url TO authenticated, anon;
