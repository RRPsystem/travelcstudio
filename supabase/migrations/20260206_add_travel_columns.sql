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

-- New columns for categories, themes, hero style
ALTER TABLE travelc_travels ADD COLUMN IF NOT EXISTS categories JSONB DEFAULT '[]';
ALTER TABLE travelc_travels ADD COLUMN IF NOT EXISTS themes JSONB DEFAULT '[]';
ALTER TABLE travelc_travels ADD COLUMN IF NOT EXISTS hero_style TEXT DEFAULT 'slideshow';
ALTER TABLE travelc_travels ADD COLUMN IF NOT EXISTS continents JSONB DEFAULT '[]';
ALTER TABLE travelc_travels ADD COLUMN IF NOT EXISTS video_start_time INTEGER DEFAULT 0;
ALTER TABLE travelc_travels ADD COLUMN IF NOT EXISTS video_end_time INTEGER;
