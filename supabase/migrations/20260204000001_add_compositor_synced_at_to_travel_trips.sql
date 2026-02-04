-- Add compositor_synced_at and raw_text columns to travel_trips for TravelBro sync
ALTER TABLE travel_trips 
ADD COLUMN IF NOT EXISTS compositor_synced_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS raw_text TEXT;

-- Add comment
COMMENT ON COLUMN travel_trips.compositor_synced_at IS 'Timestamp of last Travel Compositor sync';
COMMENT ON COLUMN travel_trips.raw_text IS 'Human-readable trip summary for AI context';
