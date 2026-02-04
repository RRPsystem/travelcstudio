-- Add page_id column to travel_trips for linking roadbook templates
ALTER TABLE travel_trips 
ADD COLUMN IF NOT EXISTS page_id uuid REFERENCES pages(id) ON DELETE SET NULL;

-- Add comment
COMMENT ON COLUMN travel_trips.page_id IS 'Optional link to a roadbook page from the builder';

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_travel_trips_page_id ON travel_trips(page_id) WHERE page_id IS NOT NULL;
