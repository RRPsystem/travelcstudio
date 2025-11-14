/*
  # Create Scheduled WhatsApp Messages System

  1. New Tables
    - `scheduled_whatsapp_messages`
      - `id` (uuid, primary key)
      - `trip_id` (uuid, foreign key to travel_trips)
      - `brand_id` (uuid, foreign key to brands)
      - `message_content` (text) - De message die verstuurd moet worden
      - `scheduled_date` (date) - De datum waarop verstuurd moet worden
      - `scheduled_time` (time) - De tijd waarop verstuurd moet worden
      - `timezone` (text) - Timezone van de bestemming (bijv. 'Europe/Amsterdam', 'Asia/Bangkok')
      - `message_type` (text) - Type bericht (bijv. 'route_description', 'hotel_checkin', 'flight_reminder', 'custom')
      - `is_sent` (boolean, default false) - Of het bericht al verstuurd is
      - `sent_at` (timestamptz) - Wanneer het daadwerkelijk verstuurd is
      - `recipient_phone` (text) - Telefoonnummer om naar te sturen (optional, kan ook via sessions)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `scheduled_whatsapp_messages` table
    - Add policies for brands to manage their own scheduled messages

  3. Indexes
    - Index on trip_id for quick lookups
    - Index on scheduled_date + is_sent for processing scheduled messages
*/

CREATE TABLE IF NOT EXISTS scheduled_whatsapp_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES travel_trips(id) ON DELETE CASCADE,
  brand_id uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  message_content text NOT NULL,
  scheduled_date date NOT NULL,
  scheduled_time time NOT NULL,
  timezone text NOT NULL DEFAULT 'Europe/Amsterdam',
  message_type text NOT NULL DEFAULT 'custom',
  is_sent boolean DEFAULT false,
  sent_at timestamptz,
  recipient_phone text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_messages_trip ON scheduled_whatsapp_messages(trip_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_processing ON scheduled_whatsapp_messages(scheduled_date, is_sent) WHERE is_sent = false;
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_brand ON scheduled_whatsapp_messages(brand_id);

ALTER TABLE scheduled_whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brands can view own scheduled messages"
  ON scheduled_whatsapp_messages
  FOR SELECT
  TO authenticated
  USING (
    brand_id IN (
      SELECT brand_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Brands can insert own scheduled messages"
  ON scheduled_whatsapp_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    brand_id IN (
      SELECT brand_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Brands can update own scheduled messages"
  ON scheduled_whatsapp_messages
  FOR UPDATE
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

CREATE POLICY "Brands can delete own scheduled messages"
  ON scheduled_whatsapp_messages
  FOR DELETE
  TO authenticated
  USING (
    brand_id IN (
      SELECT brand_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Service role can read all scheduled messages"
  ON scheduled_whatsapp_messages
  FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "Service role can update scheduled messages"
  ON scheduled_whatsapp_messages
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);