/*
  # Add WhatsApp Support to TravelBRO

  1. Changes to travel_trips
    - Add `whatsapp_number` column to link trip to specific WhatsApp number
    - Add `whatsapp_enabled` boolean flag
    - Add `whatsapp_welcome_message` for customizable greeting

  2. New Table: travel_whatsapp_sessions
    - Track WhatsApp conversations per phone number
    - Link to trip_id and session_token (for intake data)
    - Store last interaction timestamp

  3. Purpose
    - Allow customers to communicate with TravelBRO via WhatsApp
    - Automatic session management based on phone number
    - Support multiple concurrent WhatsApp conversations per trip
*/

-- Add WhatsApp fields to travel_trips
ALTER TABLE travel_trips 
ADD COLUMN IF NOT EXISTS whatsapp_number text,
ADD COLUMN IF NOT EXISTS whatsapp_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS whatsapp_welcome_message text DEFAULT 'Hoi! Ik ben je TravelBRO assistent. Stel me gerust je vragen over de reis!';

-- Create travel_whatsapp_sessions table
CREATE TABLE IF NOT EXISTS travel_whatsapp_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid REFERENCES travel_trips(id) ON DELETE CASCADE NOT NULL,
  phone_number text NOT NULL,
  session_token text REFERENCES travel_intakes(session_token) ON DELETE SET NULL,
  last_message_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(trip_id, phone_number)
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_phone ON travel_whatsapp_sessions(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_trip ON travel_whatsapp_sessions(trip_id);

-- Enable RLS
ALTER TABLE travel_whatsapp_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for travel_whatsapp_sessions
CREATE POLICY "Brands can view own trip WhatsApp sessions"
  ON travel_whatsapp_sessions FOR SELECT
  TO authenticated
  USING (
    trip_id IN (
      SELECT id FROM travel_trips WHERE brand_id IN (
        SELECT brand_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- Service role can manage sessions (for webhook)
CREATE POLICY "Service role can manage WhatsApp sessions"
  ON travel_whatsapp_sessions FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add index on travel_trips.whatsapp_number for faster lookups
CREATE INDEX IF NOT EXISTS idx_travel_trips_whatsapp_number ON travel_trips(whatsapp_number) WHERE whatsapp_number IS NOT NULL;
