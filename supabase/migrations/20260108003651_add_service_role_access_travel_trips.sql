/*
  # Add Service Role Access to Travel Trips

  1. Problem
    - travelbro-chat edge function uses service_role to query travel_trips
    - But there's NO service_role policy on travel_trips table
    - This blocks TravelBro from loading trip data
    - WhatsApp users get "Sorry, ik kan je bericht momenteel niet verwerken"
    
  2. Solution
    - Add service_role policy for all operations on travel_trips
    - This allows edge functions to query trips

  3. Security
    - Service role is only used by edge functions (secure)
    - All authenticated user policies remain unchanged
*/

-- Add service role policy for travel_trips
CREATE POLICY "Service role can manage trips"
  ON travel_trips
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- FIX SUMMARY
-- ============================================
-- ✅ Service role can now query travel_trips
-- ✅ TravelBro edge function will work
-- ✅ WhatsApp photo messages should work now
-- ============================================
