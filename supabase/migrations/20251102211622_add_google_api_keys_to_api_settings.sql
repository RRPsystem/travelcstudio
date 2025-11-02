/*
  # Add Google API keys to api_settings

  1. Changes
    - Add `google_places_api_key` column for Google Places API
    - Add `google_search_api_key` column for Google Custom Search API
    - Add `google_search_engine_id` column for Custom Search Engine ID
  
  2. Security
    - All columns are encrypted text fields
    - No RLS changes needed
*/

-- Add Google API key columns
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'api_settings' AND column_name = 'google_places_api_key'
  ) THEN
    ALTER TABLE api_settings ADD COLUMN google_places_api_key text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'api_settings' AND column_name = 'google_search_api_key'
  ) THEN
    ALTER TABLE api_settings ADD COLUMN google_search_api_key text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'api_settings' AND column_name = 'google_search_engine_id'
  ) THEN
    ALTER TABLE api_settings ADD COLUMN google_search_engine_id text;
  END IF;
END $$;