/*
  # Add metadata to trips table
  
  1. Changes
    - Add `metadata` jsonb column to trips table for storing WordPress data
    - Can store: wp_post_id, continent, country, preview_url, thumbnail, etc.
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trips' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE trips ADD COLUMN metadata jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;
