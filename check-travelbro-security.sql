-- ============================================
-- TRAVELBRO SECURITY CHECK
-- Run deze query in Supabase SQL Editor om te checken of de beveiliging goed staat
-- ============================================

-- Controleer alle policies op travel_intakes
SELECT
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual as "using_expression",
  with_check as "with_check_expression"
FROM pg_policies
WHERE tablename = 'travel_intakes'
ORDER BY policyname;

-- Controleer alle policies op travel_conversations
SELECT
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual as "using_expression",
  with_check as "with_check_expression"
FROM pg_policies
WHERE tablename = 'travel_conversations'
ORDER BY policyname;

-- Controleer alle policies op travel_trips
SELECT
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual as "using_expression",
  with_check as "with_check_expression"
FROM pg_policies
WHERE tablename = 'travel_trips'
ORDER BY policyname;

-- Controleer alle policies op travel_whatsapp_sessions
SELECT
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual as "using_expression",
  with_check as "with_check_expression"
FROM pg_policies
WHERE tablename = 'travel_whatsapp_sessions'
ORDER BY policyname;

-- ============================================
-- WAT JE MOET ZIEN:
-- ============================================
-- ✅ GEEN policies met roles = '{anon}' voor gevoelige data
-- ✅ WEL policies met roles = '{authenticated}' die checken op operator/admin/brand
-- ✅ WEL policies met roles = '{authenticator}' (dat is service role, dat is OK)
--
-- ❌ GEVAARLIJK: policies met qual = 'true' voor anon role
-- ❌ GEVAARLIJK: policies die NIET checken op auth.uid() of role
