/*
  # Create WhatsApp Messages Table
  
  1. New Tables
    - `travel_whatsapp_messages`
      - `id` (uuid, primary key)
      - `phone_number` (text) - WhatsApp phone number
      - `message` (text) - Message content
      - `direction` (text) - 'inbound' or 'outbound'
      - `whatsapp_number` (text) - Twilio WhatsApp number
      - `media_url` (text, optional) - Media attachment URL
      - `created_at` (timestamp)
      
  2. Security
    - Enable RLS on table
    - Add policies for operators to view messages
*/

CREATE TABLE IF NOT EXISTS travel_whatsapp_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text NOT NULL,
  message text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  whatsapp_number text,
  media_url text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE travel_whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- Operators can view all messages
CREATE POLICY "Operators can view all messages"
  ON travel_whatsapp_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'operator'
    )
  );

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_phone ON travel_whatsapp_messages(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_created ON travel_whatsapp_messages(created_at DESC);
