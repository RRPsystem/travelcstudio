-- Add source_microsite column to track which TC microsite a travel was imported from
-- This enables touroperator logo display and filtering by source
ALTER TABLE travelc_travels ADD COLUMN IF NOT EXISTS source_microsite TEXT;
CREATE INDEX IF NOT EXISTS idx_travelc_travels_source_microsite ON travelc_travels(source_microsite);
