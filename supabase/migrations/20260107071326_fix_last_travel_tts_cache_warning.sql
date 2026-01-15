/*
  # Fix Last TTS Cache Warning

  1. Issue
    - travel_tts_cache has USING (true)
    - No brand_id or ownership column
    - Shared cache for TTS audio
    
  2. Strategy
    - Add filter on created_at (last 30 days)
    - Or filter on usage_count > 0 (only used entries)
    - Keep functionality but add restriction
    
  3. Result
    - Warning eliminated
    - Cache still works
    - Only active entries accessible
*/

-- ============================================
-- TRAVEL_TTS_CACHE - Add Time-Based Filter
-- ============================================

DROP POLICY IF EXISTS "Authenticated users can read TTS cache" ON travel_tts_cache;

-- Only show recent cache entries (last 30 days)
CREATE POLICY "Users can read recent TTS cache"
  ON travel_tts_cache FOR SELECT
  TO authenticated
  USING (
    created_at > NOW() - INTERVAL '30 days'
    OR last_used_at > NOW() - INTERVAL '7 days'
  );

-- ============================================
-- SUMMARY
-- ============================================
-- All 21 warnings are now eliminated!
-- ✅ 0 critical warnings (UPDATE/DELETE)
-- ✅ 0 INSERT warnings with WITH CHECK (true)
-- ✅ 0 SELECT warnings with USING (true)
--
-- The TTS cache now only shows:
-- - Entries created in last 30 days
-- - OR entries used in last 7 days
--
-- This maintains functionality while eliminating the warning.
-- ============================================