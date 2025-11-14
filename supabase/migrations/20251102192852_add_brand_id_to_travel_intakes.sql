/*
  # Add brand_id to travel_intakes table

  1. Changes
    - Add `brand_id` column to `travel_intakes` table
    - Set foreign key constraint to brands table
    - Backfill existing records with brand_id from related trip
    - Make column NOT NULL after backfill
  
  2. Security
    - No changes to RLS policies needed
*/

-- Add brand_id column as nullable first
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'travel_intakes' AND column_name = 'brand_id'
  ) THEN
    ALTER TABLE travel_intakes ADD COLUMN brand_id uuid;
  END IF;
END $$;

-- Backfill brand_id from travel_trips
UPDATE travel_intakes 
SET brand_id = travel_trips.brand_id
FROM travel_trips
WHERE travel_intakes.trip_id = travel_trips.id
AND travel_intakes.brand_id IS NULL;

-- Make it NOT NULL and add foreign key
ALTER TABLE travel_intakes 
  ALTER COLUMN brand_id SET NOT NULL;

ALTER TABLE travel_intakes 
  DROP CONSTRAINT IF EXISTS travel_intakes_brand_id_fkey;

ALTER TABLE travel_intakes 
  ADD CONSTRAINT travel_intakes_brand_id_fkey 
  FOREIGN KEY (brand_id) 
  REFERENCES brands(id) 
  ON DELETE CASCADE;