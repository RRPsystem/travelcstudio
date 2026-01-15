/*
  # Rollback Trip Catalog System
  
  Deze migratie draait de onnodige trip catalog kolommen terug.
  Het bestaande systeem met trip_brand_assignments is al voldoende.
  
  ## Changes
  - Drop policies eerst (om dependencies te verwijderen)
  - Verwijder catalog gerelateerde kolommen van trips tabel
  - Herstel originele RLS policies
*/

-- Drop policies first to remove dependencies
DROP POLICY IF EXISTS "Users can view trips for their brand or admin trips" ON trips;
DROP POLICY IF EXISTS "Users can update trips for their brand" ON trips;
DROP POLICY IF EXISTS "Operators can submit trips to catalog" ON trips;

-- Drop indexes
DROP INDEX IF EXISTS idx_trips_submit_to_catalog;
DROP INDEX IF EXISTS idx_trips_catalog_status;
DROP INDEX IF EXISTS idx_trips_catalog_submitted_at;

-- Drop columns
ALTER TABLE trips DROP COLUMN IF EXISTS submit_to_catalog;
ALTER TABLE trips DROP COLUMN IF EXISTS catalog_status;
ALTER TABLE trips DROP COLUMN IF EXISTS catalog_submitted_at;
ALTER TABLE trips DROP COLUMN IF EXISTS catalog_reviewed_at;
ALTER TABLE trips DROP COLUMN IF EXISTS catalog_reviewed_by;
ALTER TABLE trips DROP COLUMN IF EXISTS catalog_notes;

-- Recreate original select policy
CREATE POLICY "Users can view trips for their brand or admin trips"
  ON trips FOR SELECT
  TO authenticated
  USING (
    brand_id IN (
      SELECT brand_id FROM users WHERE id = auth.uid()
    )
    OR author_type = 'admin'
    OR brand_id = '00000000-0000-0000-0000-000000000999'
  );

-- Recreate original update policy
CREATE POLICY "Users can update trips for their brand"
  ON trips FOR UPDATE
  TO authenticated
  USING (
    brand_id IN (
      SELECT brand_id FROM users WHERE id = auth.uid()
    )
    OR (author_type = 'admin' AND author_id = auth.uid())
  )
  WITH CHECK (
    brand_id IN (
      SELECT brand_id FROM users WHERE id = auth.uid()
    )
    OR (author_type = 'admin' AND author_id = auth.uid())
  );
