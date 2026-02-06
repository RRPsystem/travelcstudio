-- Add missing columns to travelc_travels table
-- These columns store additional data from the Travel Compositor API

ALTER TABLE travelc_travels ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'EUR';
ALTER TABLE travelc_travels ADD COLUMN IF NOT EXISTS flights JSONB DEFAULT '[]';
ALTER TABLE travelc_travels ADD COLUMN IF NOT EXISTS transports JSONB DEFAULT '[]';
ALTER TABLE travelc_travels ADD COLUMN IF NOT EXISTS car_rentals JSONB DEFAULT '[]';
ALTER TABLE travelc_travels ADD COLUMN IF NOT EXISTS activities JSONB DEFAULT '[]';
ALTER TABLE travelc_travels ADD COLUMN IF NOT EXISTS selling_points JSONB DEFAULT '[]';
ALTER TABLE travelc_travels ADD COLUMN IF NOT EXISTS price_breakdown JSONB DEFAULT '{}';
ALTER TABLE travelc_travels ADD COLUMN IF NOT EXISTS travelers JSONB DEFAULT '{}';
ALTER TABLE travelc_travels ADD COLUMN IF NOT EXISTS ai_summary TEXT;
ALTER TABLE travelc_travels ADD COLUMN IF NOT EXISTS all_texts JSONB DEFAULT '{}';
