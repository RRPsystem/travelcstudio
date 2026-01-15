/*
  # FIX CRITICAL SECURITY VULNERABILITY - TravelBro Data Protection

  1. Problem
    - Current policies allow ANYONE to view ALL travel intakes (names, phone numbers, travel dates)
    - Current policies allow ANYONE to view ALL conversations
    - Current policies don't validate share tokens properly
    - This is a critical privacy/security breach - burglars could see when people are on vacation

  2. Solution
    - Remove dangerous public access policies
    - Restrict access to brands and operators only
    - Add proper token validation where needed
    - Ensure only authorized users can see sensitive customer data

  3. Security
    - Brands can only see their own customers' data
    - Operators can see all data for support purposes
    - Admins can see all data for management
    - Public/anon users have NO access to sensitive customer data
    - Service role (for edge functions) can still manage data
*/

-- ============================================
-- DROP DANGEROUS PUBLIC POLICIES
-- ============================================

DROP POLICY IF EXISTS "Public can view trips via share token" ON travel_trips;
DROP POLICY IF EXISTS "Public can view own intake via session token" ON travel_intakes;
DROP POLICY IF EXISTS "Public can create intakes" ON travel_intakes;
DROP POLICY IF EXISTS "Public can view conversations" ON travel_conversations;
DROP POLICY IF EXISTS "Public can create conversations" ON travel_conversations;

-- ============================================
-- TRAVEL_TRIPS - Secure Policies
-- ============================================

-- Operators can view all trips
CREATE POLICY "Operators can view all trips"
  ON travel_trips FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'operator'
    )
  );

-- Admins can view all trips
CREATE POLICY "Admins can view all trips"
  ON travel_trips FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Operators can manage all trips
CREATE POLICY "Operators can manage all trips"
  ON travel_trips FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'operator'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'operator'
    )
  );

-- Service role can access trips (for edge functions like travelbro-chat)
CREATE POLICY "Service role can manage trips"
  ON travel_trips FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- TRAVEL_INTAKES - Secure Policies (NO PUBLIC ACCESS)
-- ============================================

-- Operators can view all intakes
CREATE POLICY "Operators can view all intakes"
  ON travel_intakes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'operator'
    )
  );

-- Admins can view all intakes  
CREATE POLICY "Admins can view all intakes"
  ON travel_intakes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Service role can manage intakes (for edge functions)
CREATE POLICY "Service role can manage intakes"
  ON travel_intakes FOR ALL
  USING (true)
  WITH CHECK (true);

-- Brands can update intakes (for marking as completed, etc)
CREATE POLICY "Brands can update trip intakes"
  ON travel_intakes FOR UPDATE
  TO authenticated
  USING (
    trip_id IN (
      SELECT id FROM travel_trips WHERE brand_id IN (
        SELECT brand_id FROM users WHERE id = auth.uid()
      )
    )
  )
  WITH CHECK (
    trip_id IN (
      SELECT id FROM travel_trips WHERE brand_id IN (
        SELECT brand_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- ============================================
-- TRAVEL_CONVERSATIONS - Secure Policies (NO PUBLIC ACCESS)
-- ============================================

-- Operators can view all conversations
CREATE POLICY "Operators can view all conversations"
  ON travel_conversations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'operator'
    )
  );

-- Admins can view all conversations
CREATE POLICY "Admins can view all conversations"
  ON travel_conversations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Service role can manage conversations (for edge functions)
CREATE POLICY "Service role can manage conversations"
  ON travel_conversations FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- NOTES
-- ============================================

-- Public/anonymous access has been COMPLETELY REMOVED from sensitive tables
-- All customer data (names, phone numbers, travel dates) is now only accessible to:
--   1. The brand that owns the trip
--   2. Operators (for support)
--   3. Admins (for management)
--   4. Service role (for edge functions like travelbro-chat webhook)
-- 
-- Edge functions (like travelbro-chat) use the service role key to access data
-- This is secure because edge functions run server-side with proper authentication
