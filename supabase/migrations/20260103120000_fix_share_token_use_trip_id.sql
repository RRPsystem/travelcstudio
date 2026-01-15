/*
  # Fix Share Token to Use Trip ID

  1. Updates
    - Wijzig trigger om trip ID als share_token te gebruiken (niet random UUID)
    - Update bestaande trips om share_token = id te maken

  2. Reasoning
    - Share URL moet het trip ID bevatten voor consistentie
    - TripViewer checkt eerst op trip ID, dan op share_token
    - Door share_token = id te maken werken beide lookups
*/

-- 1. Update trigger functie om trip ID te gebruiken als share_token
CREATE OR REPLACE FUNCTION generate_trip_share_token()
RETURNS TRIGGER AS $$
BEGIN
  -- Als share_token NULL is, gebruik dan het trip ID
  IF NEW.share_token IS NULL THEN
    NEW.share_token = NEW.id::text;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public;

-- 2. Update alle bestaande trips om share_token = id te maken
UPDATE trips
SET share_token = id::text
WHERE share_token IS NULL OR share_token != id::text;
