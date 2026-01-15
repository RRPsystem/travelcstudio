/*
  # Fix Travel Conversations RLS for Service Role
  
  1. Changes
    - Drop old public policy
    - Add proper service role policy
    - Ensure anonymous users can insert/read via service role
  
  2. Security
    - Service role has full access (needed for edge functions)
    - Brands and operators maintain existing read access
*/

-- Drop the incorrect public policy
DROP POLICY IF EXISTS "Service role can manage conversations" ON travel_conversations;

-- Allow service role full access (edge functions use this)
CREATE POLICY "Service role full access to conversations"
  ON travel_conversations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow anon users to insert (for initial intake)
CREATE POLICY "Allow anon insert conversations"
  ON travel_conversations
  FOR INSERT
  TO anon
  WITH CHECK (true);
