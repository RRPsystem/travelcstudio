-- ============================================
-- TravelBro Conversation Setup Check
-- Verifies that conversation storage is working
-- ============================================

-- 1. Check if travel_conversations table exists
SELECT
  '1️⃣ Table Check' as step,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_name = 'travel_conversations'
    ) THEN '✅ Table exists'
    ELSE '❌ Table missing - CREATE IT!'
  END as status;

-- 2. Check table structure
SELECT
  '2️⃣ Table Structure' as step,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'travel_conversations'
ORDER BY ordinal_position;

-- 3. Check indexes
SELECT
  '3️⃣ Indexes' as step,
  indexname as index_name,
  indexdef as definition
FROM pg_indexes
WHERE tablename = 'travel_conversations';

-- 4. Check if RLS is enabled
SELECT
  '4️⃣ RLS Status' as step,
  CASE
    WHEN relrowsecurity THEN '✅ RLS Enabled'
    ELSE '⚠️ RLS Disabled'
  END as status
FROM pg_class
WHERE relname = 'travel_conversations';

-- 5. Check RLS policies
SELECT
  '5️⃣ RLS Policies' as step,
  policyname as policy_name,
  cmd as command,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE tablename = 'travel_conversations';

-- 6. Count conversations per session
SELECT
  '6️⃣ Conversation Stats' as step,
  session_token,
  COUNT(*) as message_count,
  MIN(created_at) as first_message,
  MAX(created_at) as last_message,
  COUNT(CASE WHEN role = 'user' THEN 1 END) as user_messages,
  COUNT(CASE WHEN role = 'assistant' THEN 1 END) as assistant_messages
FROM travel_conversations
GROUP BY session_token
ORDER BY last_message DESC
LIMIT 10;

-- 7. Recent conversations preview
SELECT
  '7️⃣ Recent Messages' as step,
  session_token,
  role,
  LEFT(message, 100) as message_preview,
  created_at
FROM travel_conversations
ORDER BY created_at DESC
LIMIT 20;

-- 8. Check for orphaned conversations (no matching trip)
SELECT
  '8️⃣ Data Quality' as step,
  COUNT(*) as orphaned_conversations
FROM travel_conversations c
WHERE NOT EXISTS (
  SELECT 1 FROM travel_trips t
  WHERE t.id = c.trip_id
);

-- ============================================
-- DIAGNOSTIC SUMMARY
-- ============================================
WITH stats AS (
  SELECT
    COUNT(*) as total_messages,
    COUNT(DISTINCT session_token) as unique_sessions,
    COUNT(CASE WHEN role = 'user' THEN 1 END) as user_count,
    COUNT(CASE WHEN role = 'assistant' THEN 1 END) as assistant_count,
    MIN(created_at) as oldest_message,
    MAX(created_at) as newest_message
  FROM travel_conversations
)
SELECT
  '🏁 SUMMARY' as summary,
  total_messages,
  unique_sessions,
  user_count,
  assistant_count,
  CASE
    WHEN total_messages = 0 THEN '❌ NO CONVERSATIONS - Not saving messages!'
    WHEN user_count != assistant_count THEN '⚠️ Unbalanced - Missing responses?'
    WHEN newest_message < NOW() - INTERVAL '1 hour' THEN '⚠️ Old data - No recent activity'
    ELSE '✅ Looking good!'
  END as health_status,
  oldest_message,
  newest_message,
  EXTRACT(EPOCH FROM (newest_message - oldest_message)) / 3600 as hours_of_history
FROM stats;

-- ============================================
-- FIXES IF NEEDED
-- ============================================

-- If table doesn't exist, create it:
/*
CREATE TABLE IF NOT EXISTS travel_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token text NOT NULL,
  trip_id uuid REFERENCES travel_trips(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversations_session
  ON travel_conversations(session_token);

CREATE INDEX IF NOT EXISTS idx_conversations_session_created
  ON travel_conversations(session_token, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversations_trip
  ON travel_conversations(trip_id);

ALTER TABLE travel_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read conversations"
  ON travel_conversations FOR SELECT
  USING (true);

CREATE POLICY "Service role can insert conversations"
  ON travel_conversations FOR INSERT
  WITH CHECK (true);
*/

-- If no messages are being saved, check:
-- 1. Is the edge function deployed?
-- 2. Are there errors in edge function logs?
-- 3. Does the function have permission to write?

-- To test manually:
/*
INSERT INTO travel_conversations (session_token, trip_id, role, message)
VALUES
  ('test-token', (SELECT id FROM travel_trips LIMIT 1), 'user', 'Test message'),
  ('test-token', (SELECT id FROM travel_trips LIMIT 1), 'assistant', 'Test response');

SELECT * FROM travel_conversations WHERE session_token = 'test-token';
*/
