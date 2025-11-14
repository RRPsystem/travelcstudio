/*
  # Add page_id columns to destinations and trips
  
  ## Overview
  Links destinations and trips to their corresponding pages in the website builder.
  
  ## Changes
  - Add `page_id` column to `destinations` table
  - Add `page_id` column to `trips` table
  - Add indexes for faster lookups
  
  ## Purpose
  This enables the "Edit in Builder" functionality where clicking edit on a destination
  or trip opens the corresponding page in the website builder.
*/

-- Add page_id to destinations if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'destinations' AND column_name = 'page_id'
  ) THEN
    ALTER TABLE destinations ADD COLUMN page_id uuid;
    CREATE INDEX IF NOT EXISTS idx_destinations_page_id ON destinations(page_id);
  END IF;
END $$;

-- Add page_id to trips if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'page_id'
  ) THEN
    ALTER TABLE trips ADD COLUMN page_id uuid;
    CREATE INDEX IF NOT EXISTS idx_trips_page_id ON trips(page_id);
  END IF;
END $$;
