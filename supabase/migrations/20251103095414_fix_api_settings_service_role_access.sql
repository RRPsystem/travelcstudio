/*
  # Fix API Settings Access for Service Role and Edge Functions
  
  1. Changes
    - Add service_role bypass policy for api_settings table
    - This allows Edge Functions to read API keys using the service role key
    - Critical for travelbro-chat, helpbot-chat, and other functions that need API keys
  
  2. Security
    - Service role has full access (needed for Edge Functions)
    - Regular users still protected by existing RLS policies
*/

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Service role has full access to api_settings" ON api_settings;

-- Add service role bypass for api_settings (Edge Functions need this)
CREATE POLICY "Service role has full access to api_settings"
  ON api_settings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
