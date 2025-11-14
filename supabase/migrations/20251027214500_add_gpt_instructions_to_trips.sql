/*
  # Add GPT Instructions to Travel Trips

  1. Changes
    - Add `gpt_instructions` column to `travel_trips` table
      - Stores custom AI instructions per trip
      - Allows agents to personalize AI behavior per trip
      - Examples: "This couple is on their honeymoon", "Budget travel for students"

  2. Details
    - Column type: text (allows long-form instructions)
    - Nullable: true (uses default from operator settings if empty)
    - Default: empty string
*/

-- Add gpt_instructions column to travel_trips
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'travel_trips' AND column_name = 'gpt_instructions'
  ) THEN
    ALTER TABLE travel_trips ADD COLUMN gpt_instructions text DEFAULT '';
  END IF;
END $$;
