/*
  # Update Roadmap Status Values to Dutch

  1. Changes
    - Migrate existing status values to new Dutch travel-themed statuses
    - Update status constraint to use Dutch statuses:
      - nieuw_idee (Nieuw Idee)
      - pre_flight_check (Pre-Flight Check)
      - take_off (Take Off)
      - in_progress (In Progress)
      - test_fase (Test Fase)
      - afgerond (Afgerond)
      - afgekeurd (Afgekeurd)
    
  2. Migration Mapping
    - submitted -> nieuw_idee
    - under_review -> pre_flight_check
    - planned -> take_off
    - in_progress -> in_progress (unchanged)
    - testing -> test_fase
    - completed -> afgerond
    - rejected -> afgekeurd
    
  3. Notes
    - Travel theme fits perfectly with the travel agency context
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'roadmap_items' AND constraint_name = 'roadmap_items_status_check'
  ) THEN
    ALTER TABLE roadmap_items DROP CONSTRAINT roadmap_items_status_check;
  END IF;
END $$;

UPDATE roadmap_items SET status = 'nieuw_idee' WHERE status = 'submitted';
UPDATE roadmap_items SET status = 'pre_flight_check' WHERE status = 'under_review';
UPDATE roadmap_items SET status = 'take_off' WHERE status = 'planned';
UPDATE roadmap_items SET status = 'test_fase' WHERE status = 'testing';
UPDATE roadmap_items SET status = 'afgerond' WHERE status = 'completed';
UPDATE roadmap_items SET status = 'afgekeurd' WHERE status = 'rejected';

ALTER TABLE roadmap_items 
  ADD CONSTRAINT roadmap_items_status_check 
  CHECK (status IN ('nieuw_idee', 'pre_flight_check', 'take_off', 'in_progress', 'test_fase', 'afgerond', 'afgekeurd'));