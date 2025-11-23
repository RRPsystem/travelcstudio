/*
  # Add font_family column to brands table

  1. Changes
    - Add `font_family` column to brands table with default value
    - Column is optional (nullable) to not break existing brands

  2. Purpose
    - Allows brands to customize the font family used in their websites
    - Default font is 'Inter' which is a modern, readable font
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'brands' AND column_name = 'font_family'
  ) THEN
    ALTER TABLE brands ADD COLUMN font_family text DEFAULT 'Inter';
  END IF;
END $$;
