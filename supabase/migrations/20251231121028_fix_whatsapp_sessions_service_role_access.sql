/*
  # Fix WhatsApp Sessions Service Role Access
  
  1. Problem
    - Migration 20251024214234 dropped the service role policy but didn't recreate it
    - send-whatsapp function can't create sessions anymore
    - This breaks the entire WhatsApp invitation flow
  
  2. Solution
    - Recreate the service role full access policy
    - Ensure webhook and send-whatsapp functions can manage sessions
  
  3. Security
    - Service role needs full access (INSERT, UPDATE, DELETE, SELECT)
    - Brands and operators keep their existing SELECT-only policies
*/

-- Drop and recreate service role policy to ensure it exists
DROP POLICY IF EXISTS "Service role can manage WhatsApp sessions" ON travel_whatsapp_sessions;

CREATE POLICY "Service role can manage WhatsApp sessions"
  ON travel_whatsapp_sessions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
