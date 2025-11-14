/*
  # Add Featured Trips Functionality

  1. Changes
    - Add `is_featured` column to `trip_brand_assignments` table
    - Add `priority` column to `trip_brand_assignments` table
    - Add indexes for performance optimization

  2. Purpose
    - Allows brands to mark specific trips as "featured" for prominent display
    - Priority system (1-999) controls the order of featured trips
    - Lower priority number = higher in the list (1 is highest priority)
    - Default priority is 999 (lowest)

  3. Usage
    - Featured trips with lower priority numbers appear first
    - Non-featured trips appear after all featured trips
    - This data is exposed via trips-api endpoint for website display
*/

-- Add is_featured column (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trip_brand_assignments' AND column_name = 'is_featured'
  ) THEN
    ALTER TABLE trip_brand_assignments
    ADD COLUMN is_featured BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Add priority column (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trip_brand_assignments' AND column_name = 'priority'
  ) THEN
    ALTER TABLE trip_brand_assignments
    ADD COLUMN priority INTEGER DEFAULT 999;
  END IF;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_trip_brand_assignments_featured
ON trip_brand_assignments(is_featured);

CREATE INDEX IF NOT EXISTS idx_trip_brand_assignments_priority
ON trip_brand_assignments(priority);

-- Composite index for featured + priority sorting
CREATE INDEX IF NOT EXISTS idx_trip_brand_assignments_featured_priority
ON trip_brand_assignments(brand_id, is_featured DESC, priority ASC)
WHERE is_featured = TRUE;
