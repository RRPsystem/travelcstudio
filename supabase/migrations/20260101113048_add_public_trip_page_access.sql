/*
  # Publieke toegang tot trip paginas

  1. Changes
    - Voeg RLS policy toe voor anonieme gebruikers om pages te lezen die gekoppeld zijn aan gedeelde trips
    - Dit is nodig zodat reizigers de HTML van een gedeelde trip kunnen zien via de TripViewer

  2. Security
    - Alleen SELECT toegang voor anonieme gebruikers
    - Alleen toegang tot pages die gekoppeld zijn aan trips met een share_token
*/

-- Add policy for anonymous users to view pages linked to shared trips
CREATE POLICY "Anonymous users can view pages linked to shared trips"
  ON pages FOR SELECT
  TO anon
  USING (
    -- Allow access to pages that are linked to trips with a share_token
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.page_id = pages.id
      AND trips.share_token IS NOT NULL
    )
  );
