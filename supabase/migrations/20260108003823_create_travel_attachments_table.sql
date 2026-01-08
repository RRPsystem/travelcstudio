/*
  # Create Travel Attachments Table

  1. Problem
    - travelbro-chat tries to insert into travel_attachments table
    - But this table doesn't exist (only travel_message_attachments exists)
    - This causes INSERT errors when users send photos via WhatsApp
    
  2. Solution
    - Create travel_attachments table with correct structure
    - Add service_role policy for edge function access
    - Link to trips and sessions

  3. Security
    - Service role has full access (for edge functions)
    - Users can view attachments for their own trips
*/

-- Create travel_attachments table
CREATE TABLE IF NOT EXISTS travel_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES travel_trips(id) ON DELETE CASCADE,
  session_token text NOT NULL,
  file_url text NOT NULL,
  file_type text NOT NULL,
  storage_path text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE travel_attachments ENABLE ROW LEVEL SECURITY;

-- Service role has full access
CREATE POLICY "Service role can manage attachments"
  ON travel_attachments
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Brands can view attachments for their trips
CREATE POLICY "Brands can view own trip attachments"
  ON travel_attachments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM travel_trips
      WHERE travel_trips.id = travel_attachments.trip_id
      AND travel_trips.brand_id IN (
        SELECT brand_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_travel_attachments_trip_id 
  ON travel_attachments(trip_id);

CREATE INDEX IF NOT EXISTS idx_travel_attachments_session_token 
  ON travel_attachments(session_token);

-- ============================================
-- FIX SUMMARY
-- ============================================
-- ✅ travel_attachments table created
-- ✅ Service role has full access
-- ✅ TravelBro can now save photo attachments
-- ✅ WhatsApp photo messages should work!
-- ============================================
