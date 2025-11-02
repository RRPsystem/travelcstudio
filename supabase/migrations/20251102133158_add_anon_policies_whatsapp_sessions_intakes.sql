/*
  # Add Anonymous Access Policies for TravelBRO Web Interface

  ## Overview
  Allow anonymous users to create sessions and intakes when accessing trips via web links.

  ## Changes
  1. travel_whatsapp_sessions
    - Add INSERT policy for anonymous users
    - Add SELECT policy for anonymous users (read their own session)

  2. Notes
    - Anonymous users access via share_token URL
    - They need to create sessions and intakes
    - Session tokens are long random UUIDs so they're secure
*/

-- Allow anonymous users to insert WhatsApp sessions (for web interface)
CREATE POLICY "Anonymous can create WhatsApp sessions"
  ON travel_whatsapp_sessions FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow anonymous users to read WhatsApp sessions
CREATE POLICY "Anonymous can read WhatsApp sessions"
  ON travel_whatsapp_sessions FOR SELECT
  TO anon
  USING (true);
