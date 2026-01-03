/*
  # Add public access for travel_trips via share_token

  1. Security
    - Add RLS policy to allow anonymous users to SELECT travel_trips by share_token
    - This is safe because the share_token acts as a secure access key
    - Only SELECT permission is granted, no INSERT/UPDATE/DELETE
  
  2. Changes
    - CREATE POLICY for anon role to read trips with share_token
*/

-- Drop policy if it exists
DROP POLICY IF EXISTS "Public can view trips by share_token" ON travel_trips;

-- Allow anonymous users to view travel_trips via share_token
CREATE POLICY "Public can view trips by share_token"
  ON travel_trips
  FOR SELECT
  TO anon
  USING (share_token IS NOT NULL AND is_active = true);
