/*
  # Add Intake Template Field

  1. Changes
    - Add `intake_template` column to `travel_trips` table
      - Stores pre-filled intake questions and default values
      - Agents can pre-populate traveler information
      - Clients can view and update their own information
    
  2. Notes
    - Template is JSONB for flexibility
    - Contains default travelers data and custom questions
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'travel_trips' AND column_name = 'intake_template'
  ) THEN
    ALTER TABLE travel_trips ADD COLUMN intake_template jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;