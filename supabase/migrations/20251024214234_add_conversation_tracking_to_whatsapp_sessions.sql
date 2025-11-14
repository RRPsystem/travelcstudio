/*
  # Add Conversation Tracking to WhatsApp Sessions

  1. Changes
    - Add `trip_id` to `travel_whatsapp_sessions` to link conversations to specific trips
    - Add `brand_id` to `travel_whatsapp_sessions` for easier querying
    - Add indexes for performance
    - Add RLS policies so brands can only see their own conversations

  2. Security
    - Brands can only view conversations for their own trips
    - Operators can view all conversations
*/

-- Add trip_id and brand_id to sessions table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'travel_whatsapp_sessions' AND column_name = 'trip_id'
  ) THEN
    ALTER TABLE travel_whatsapp_sessions ADD COLUMN trip_id uuid REFERENCES travel_trips(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'travel_whatsapp_sessions' AND column_name = 'brand_id'
  ) THEN
    ALTER TABLE travel_whatsapp_sessions ADD COLUMN brand_id uuid REFERENCES brands(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_trip_id ON travel_whatsapp_sessions(trip_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_brand_id ON travel_whatsapp_sessions(brand_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_phone_number ON travel_whatsapp_sessions(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_created_at ON travel_whatsapp_sessions(created_at DESC);

-- Drop existing policies if they exist
DO $$
BEGIN
  DROP POLICY IF EXISTS "Brands can view own whatsapp sessions" ON travel_whatsapp_sessions;
  DROP POLICY IF EXISTS "Operators can view all whatsapp sessions" ON travel_whatsapp_sessions;
END $$;

-- Add RLS policy for brands to view their own conversations
CREATE POLICY "Brands can view own whatsapp sessions"
  ON travel_whatsapp_sessions FOR SELECT
  TO authenticated
  USING (
    brand_id IN (
      SELECT brand_id FROM users WHERE id = auth.uid()
    )
  );

-- Add RLS policy for operators to view all conversations
CREATE POLICY "Operators can view all whatsapp sessions"
  ON travel_whatsapp_sessions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'operator'
    )
  );