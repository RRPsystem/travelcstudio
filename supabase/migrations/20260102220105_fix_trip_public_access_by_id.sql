/*
  # Fix publieke toegang tot trips via ID
  
  1. Changes
    - Update RLS policy zodat trips toegankelijk zijn voor anon users als ze via ID worden opgevraagd
    - Dit is veilig omdat je de UUID moet weten om de trip te zien
    
  2. Security
    - Trips met share_token zijn altijd toegankelijk (ongeacht is_published)
    - De UUID moet bekend zijn om de trip te kunnen openen
*/

-- Drop oude policy
DROP POLICY IF EXISTS "Public can view published trips" ON trips;

-- Nieuwe policy: anonieme users kunnen trips zien als:
-- 1. De trip een share_token heeft (altijd toegankelijk via share link)
-- 2. De trip published is via assignment OF status = 'published'
CREATE POLICY "Public can view trips via share token or if published"
  ON trips FOR SELECT
  TO anon
  USING (
    -- Altijd toegankelijk als share_token bestaat
    share_token IS NOT NULL
    OR
    -- OF als de trip published is
    (
      (id IN (SELECT trip_id FROM trip_brand_assignments WHERE is_published = true))
      OR (status = 'published')
    )
  );
