-- ============================================
-- TravelBro Complete Health Check
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Check if all required tables exist
SELECT
  '1️⃣ Tables Check' as step,
  table_name,
  CASE WHEN table_name IS NOT NULL THEN '✅' ELSE '❌' END as status
FROM (
  VALUES
    ('travel_trips'),
    ('travel_intakes'),
    ('travel_conversations'),
    ('travel_whatsapp_sessions')
) AS required_tables(table_name)
LEFT JOIN information_schema.tables t
  ON t.table_name = required_tables.table_name
  AND t.table_schema = 'public';

-- 2. Check if RLS is enabled
SELECT
  '2️⃣ RLS Security' as step,
  tablename,
  CASE WHEN rowsecurity THEN '✅ Enabled' ELSE '❌ DISABLED' END as status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('travel_trips', 'travel_intakes', 'travel_conversations', 'travel_whatsapp_sessions')
ORDER BY tablename;

-- 3. Check active trips
SELECT
  '3️⃣ Active Trips' as step,
  COUNT(*) as count,
  CASE WHEN COUNT(*) > 0 THEN '✅ Trips available' ELSE '❌ NO ACTIVE TRIPS' END as status
FROM travel_trips
WHERE is_active = true;

-- 4. Show active trips details
SELECT
  '3️⃣ Trip Details' as step,
  id,
  name,
  share_token,
  is_active,
  whatsapp_enabled,
  brand_id,
  created_at
FROM travel_trips
WHERE is_active = true
ORDER BY created_at DESC
LIMIT 5;

-- 5. Check API Settings for OpenAI
SELECT
  '4️⃣ API Settings' as step,
  provider,
  service_name,
  is_active,
  CASE WHEN api_key IS NOT NULL AND LENGTH(api_key) > 10
    THEN '✅ API Key Set (' || LENGTH(api_key) || ' chars)'
    ELSE '❌ NO API KEY'
  END as key_status,
  created_at
FROM api_settings
WHERE provider IN ('OpenAI', 'Google')
   OR service_name = 'Twilio WhatsApp'
ORDER BY provider, service_name;

-- 6. Check anonymous access policies (crucial for public access)
SELECT
  '5️⃣ Public Access Policies' as step,
  schemaname,
  tablename,
  policyname,
  cmd as operation,
  CASE WHEN 'anon' = ANY(roles) THEN '✅ Anon access' ELSE '⚠️ No anon' END as anon_access
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('travel_trips', 'travel_intakes', 'travel_conversations')
AND 'anon' = ANY(roles)
ORDER BY tablename, policyname;

-- 7. Check recent activity
SELECT
  '6️⃣ Recent Activity' as step,
  'Intakes' as type,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE completed_at IS NOT NULL) as completed,
  MAX(created_at) as last_activity
FROM travel_intakes

UNION ALL

SELECT
  '6️⃣ Recent Activity' as step,
  'Conversations' as type,
  COUNT(*) as total,
  NULL as completed,
  MAX(created_at) as last_activity
FROM travel_conversations

UNION ALL

SELECT
  '6️⃣ Recent Activity' as step,
  'WhatsApp Sessions' as type,
  COUNT(*) as total,
  NULL as completed,
  MAX(created_at) as last_activity
FROM travel_whatsapp_sessions;

-- 8. Test if we can create a session (dry run - will rollback)
DO $$
DECLARE
  test_trip_id uuid;
  test_session_id uuid;
  result_message text;
BEGIN
  -- Get first active trip
  SELECT id INTO test_trip_id
  FROM travel_trips
  WHERE is_active = true
  LIMIT 1;

  IF test_trip_id IS NULL THEN
    RAISE NOTICE '❌ No active trips found for testing';
  ELSE
    -- Try to create a test session
    BEGIN
      INSERT INTO travel_whatsapp_sessions (trip_id, phone_number)
      VALUES (test_trip_id, 'test_' || gen_random_uuid())
      RETURNING id INTO test_session_id;

      IF test_session_id IS NOT NULL THEN
        RAISE NOTICE '✅ Session creation test: SUCCESS';
        -- Cleanup test data
        DELETE FROM travel_whatsapp_sessions WHERE id = test_session_id;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '❌ Session creation test: FAILED - %', SQLERRM;
    END;
  END IF;
END $$;

-- ============================================
-- SUMMARY
-- ============================================
SELECT
  '🏁 SUMMARY' as step,
  (SELECT COUNT(*) FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_name IN ('travel_trips', 'travel_intakes', 'travel_conversations', 'travel_whatsapp_sessions')
  ) || '/4 tables' as tables_status,

  (SELECT COUNT(*) FROM travel_trips WHERE is_active = true) || ' active trips' as trips_status,

  (SELECT COUNT(*) FROM api_settings
   WHERE provider = 'OpenAI' AND is_active = true AND api_key IS NOT NULL
  ) || ' OpenAI keys' as api_status,

  (SELECT COUNT(*) FROM pg_policies
   WHERE tablename IN ('travel_trips', 'travel_intakes', 'travel_conversations')
   AND 'anon' = ANY(roles)
  ) || ' anon policies' as security_status;

-- ============================================
-- EXPECTED RESULTS FOR HEALTHY SYSTEM:
-- ============================================
-- Tables: 4/4 ✅
-- RLS: All enabled ✅
-- Active Trips: > 0 ✅
-- API Settings: OpenAI key present ✅
-- Anon Policies: At least 3 (for travel_trips, travel_intakes, travel_conversations) ✅
-- Session Test: SUCCESS ✅
-- ============================================
