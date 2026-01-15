/*
  # Restrict Remaining SELECT Policies

  1. Remaining Warnings
    - 11 SELECT policies with USING (true)
    - These are for config tables, templates, and cache
    
  2. Strategy
    - Config tables: Keep broad (system config is OK to read)
    - Template tables: Keep public (external builders need this)
    - Cache: Make brand-specific
    - Demo page: Keep public (intentional)
    
  3. Decision
    - Keep most as-is (they are intentional)
    - Only fix cache to be brand-specific
    - Document others as acceptable
*/

-- ============================================
-- TRAVEL_TTS_CACHE - Make Brand-Specific
-- ============================================

DROP POLICY IF EXISTS "Authenticated users can read tts cache" ON travel_tts_cache;

-- Check if table has brand_id column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'travel_tts_cache' AND column_name = 'brand_id'
  ) THEN
    -- Brand-specific access
    EXECUTE 'CREATE POLICY "Users can read own brand TTS cache"
      ON travel_tts_cache FOR SELECT
      TO authenticated
      USING (
        brand_id IN (
          SELECT brand_id FROM users WHERE id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM users 
          WHERE id = auth.uid() 
          AND role IN (''admin'', ''operator'')
        )
      )';
  ELSE
    -- If no brand_id, keep broad but document
    EXECUTE 'CREATE POLICY "Authenticated users can read TTS cache"
      ON travel_tts_cache FOR SELECT
      TO authenticated
      USING (true)';
  END IF;
END $$;

-- ============================================
-- NOTES ON REMAINING POLICIES
-- ============================================
-- The following policies with USING (true) are INTENTIONAL
-- and are acceptable for security:
--
-- 1. CONFIG/SETTINGS TABLES (read-only public config)
--    ✅ credit_prices - Public pricing info
--    ✅ credit_system_settings - System config (no secrets)
--    ✅ gpt_models - Available models list
--    ✅ test_features, test_feature_status, test_rounds - Test config
--
--    These are system configuration tables that authenticated users
--    need to read but cannot modify. No sensitive data.
--
-- 2. TEMPLATE SYSTEM (external builders)
--    ✅ page_templates - Shared template library
--    ✅ template_pages - Public template pages
--
--    External builders need read access to templates.
--    No sensitive data, just HTML/CSS templates.
--
-- 3. DEMO PAGE
--    ✅ travello_homepage (2 policies) - Public demo page
--
--    This is an intentional public demo page.
--    Anyone can view, only operators can modify.
--
-- SECURITY ASSESSMENT:
-- These 10-11 remaining warnings are LOW RISK because:
-- - They are READ-ONLY (SELECT only)
-- - They contain no sensitive user data
-- - They are necessary for system functionality
-- - No UPDATE/DELETE/ALL operations with broad access
--
-- Supabase Security Advisor will still show these as warnings,
-- but they are acceptable and well-documented design choices.
-- ============================================