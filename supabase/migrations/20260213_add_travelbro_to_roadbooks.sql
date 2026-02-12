-- Add TravelBro link columns to travel_roadbooks
ALTER TABLE travel_roadbooks
ADD COLUMN IF NOT EXISTS travelbro_trip_id uuid REFERENCES travel_trips(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS travelbro_share_token text;

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_travel_roadbooks_travelbro_trip_id
ON travel_roadbooks(travelbro_trip_id) WHERE travelbro_trip_id IS NOT NULL;
