/*
  # Fix Trip Participants Foreign Key
  
  1. Changes
    - Drop existing foreign key constraint
    - Add correct foreign key to `travel_trips` table
  
  2. Notes
    - Previous migration referenced wrong table name `trips` instead of `travel_trips`
*/

-- Drop the table and recreate with correct foreign key
DROP TABLE IF EXISTS trip_participants CASCADE;

CREATE TABLE trip_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES travel_trips(id) ON DELETE CASCADE,
  brand_id uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  
  phone_number text NOT NULL,
  participant_name text,
  participant_role text DEFAULT 'traveler',
  is_primary_contact boolean DEFAULT false,
  
  whatsapp_conversation_id text,
  last_message_at timestamptz,
  conversation_state text DEFAULT 'active',
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(trip_id, phone_number)
);

ALTER TABLE trip_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brands can manage trip participants"
  ON trip_participants FOR ALL
  TO authenticated
  USING (
    brand_id IN (
      SELECT brand_id FROM users WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    brand_id IN (
      SELECT brand_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Service role has full access to trip participants"
  ON trip_participants FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX idx_trip_participants_trip_id ON trip_participants(trip_id);
CREATE INDEX idx_trip_participants_phone ON trip_participants(phone_number);
CREATE INDEX idx_trip_participants_brand_id ON trip_participants(brand_id);

CREATE OR REPLACE FUNCTION update_trip_participants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trip_participants_updated_at
  BEFORE UPDATE ON trip_participants
  FOR EACH ROW
  EXECUTE FUNCTION update_trip_participants_updated_at();
