/*
  # Fix Trip Share URL Generation
  
  1. Trigger om automatisch share_token te genereren
    - Bij nieuwe trips wordt automatisch een share_token gegenereerd
    - Bestaande trips zonder token krijgen een token
  
  2. Update bestaande trips
    - Alle trips zonder share_token krijgen er een
*/

-- 1. Maak trigger functie voor automatische share_token generatie
CREATE OR REPLACE FUNCTION generate_trip_share_token()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.share_token IS NULL THEN
    NEW.share_token = gen_random_uuid()::text;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public;

-- 2. Maak trigger die bij INSERT nieuwe token genereert
DROP TRIGGER IF EXISTS trigger_generate_trip_share_token ON trips;
CREATE TRIGGER trigger_generate_trip_share_token
  BEFORE INSERT ON trips
  FOR EACH ROW
  EXECUTE FUNCTION generate_trip_share_token();

-- 3. Update alle bestaande trips zonder share_token
UPDATE trips 
SET share_token = gen_random_uuid()::text
WHERE share_token IS NULL;

-- 4. Zet defaults voor share_settings als die NULL zijn
UPDATE trips
SET share_settings = '{
  "password_protected": false,
  "password": null,
  "expires_at": null,
  "view_count": 0,
  "max_views": null,
  "show_price": true,
  "show_contact": true,
  "custom_message": null
}'::jsonb
WHERE share_settings IS NULL;
