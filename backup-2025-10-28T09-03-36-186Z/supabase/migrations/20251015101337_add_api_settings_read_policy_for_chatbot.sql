/*
  # Allow authenticated users to read OpenAI API key for chatbot

  1. Changes
    - Add SELECT policy for all authenticated users to read api_settings
    - This enables the HelpBot chatbot to fetch the OpenAI key
    - Only READ access, all write operations remain operator-only

  2. Security
    - Policy allows SELECT for all authenticated users
    - Insert/Update/Delete remain restricted to operators only
*/

-- Drop the existing operator-only SELECT policy
DROP POLICY IF EXISTS "Only operators can view API settings" ON api_settings;

-- Create new SELECT policy for all authenticated users (read-only for chatbot)
CREATE POLICY "Authenticated users can view API settings"
  ON api_settings
  FOR SELECT
  TO authenticated
  USING (true);
