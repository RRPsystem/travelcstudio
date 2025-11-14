/*
  # Replace RRP ID with 3 Recommended Trip IDs

  1. Changes to `agents` table
    - Remove `rrp_id` field
    - Add `recommended_trip_1` (text)
    - Add `recommended_trip_2` (text)
    - Add `recommended_trip_3` (text)
  
  2. Purpose
    - Allow agents to showcase 3 recommended trips
    - These IDs will be used to fetch trip details from website pages
*/

-- Remove old rrp_id field
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agents' AND column_name = 'rrp_id'
  ) THEN
    ALTER TABLE agents DROP COLUMN rrp_id;
  END IF;
END $$;

-- Add 3 recommended trip ID fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agents' AND column_name = 'recommended_trip_1'
  ) THEN
    ALTER TABLE agents ADD COLUMN recommended_trip_1 text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agents' AND column_name = 'recommended_trip_2'
  ) THEN
    ALTER TABLE agents ADD COLUMN recommended_trip_2 text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agents' AND column_name = 'recommended_trip_3'
  ) THEN
    ALTER TABLE agents ADD COLUMN recommended_trip_3 text;
  END IF;
END $$;