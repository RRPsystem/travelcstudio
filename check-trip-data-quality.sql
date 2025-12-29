-- ============================================
-- TravelBro Trip Data Quality Check
-- Check what data is available for a specific trip
-- ============================================

-- Replace this with your actual trip_id or share_token
\set trip_identifier 'YOUR_SHARE_TOKEN_HERE'

-- 1. Find the trip
SELECT
  '1️⃣ Trip Basic Info' as step,
  id,
  name,
  share_token,
  is_active,
  whatsapp_enabled,
  brand_id,
  created_at
FROM travel_trips
WHERE share_token = :'trip_identifier' OR id::text = :'trip_identifier';

-- 2. Check parsed_data structure
SELECT
  '2️⃣ Parsed Data Structure' as step,
  CASE
    WHEN parsed_data IS NULL THEN '❌ NO DATA'
    WHEN parsed_data::text = '{}'::text THEN '⚠️ EMPTY OBJECT'
    WHEN parsed_data ? 'error' THEN '❌ ERROR: ' || (parsed_data->>'error')
    WHEN parsed_data ? 'accommodations' THEN '✅ Has accommodations'
    ELSE '⚠️ Unknown structure'
  END as data_status,
  jsonb_typeof(parsed_data) as data_type,
  jsonb_object_keys(parsed_data) as available_keys
FROM travel_trips
WHERE share_token = :'trip_identifier' OR id::text = :'trip_identifier';

-- 3. Check accommodations detail
SELECT
  '3️⃣ Accommodations Detail' as step,
  jsonb_array_length(parsed_data->'accommodations') as accommodation_count,
  elem->>'name' as hotel_name,
  elem->>'hotel_name' as alt_hotel_name,
  elem->>'location' as location,
  elem->>'city' as city,
  elem->>'check_in' as check_in,
  elem->>'nights' as nights,
  elem->>'amenities' as amenities
FROM travel_trips,
     jsonb_array_elements(parsed_data->'accommodations') as elem
WHERE (share_token = :'trip_identifier' OR id::text = :'trip_identifier')
  AND parsed_data ? 'accommodations';

-- 4. Check itinerary detail
SELECT
  '4️⃣ Itinerary Detail' as step,
  jsonb_array_length(parsed_data->'itinerary') as day_count,
  elem->>'day' as day_number,
  elem->>'title' as day_title,
  elem->>'location' as location,
  elem->>'accommodation' as accommodation
FROM travel_trips,
     jsonb_array_elements(parsed_data->'itinerary') as elem
WHERE (share_token = :'trip_identifier' OR id::text = :'trip_identifier')
  AND parsed_data ? 'itinerary'
LIMIT 10;

-- 5. Check activities
SELECT
  '5️⃣ Activities' as step,
  jsonb_array_length(parsed_data->'activities') as activities_count,
  elem->>'name' as activity_name,
  elem->>'location' as location,
  elem->>'included' as included
FROM travel_trips,
     jsonb_array_elements(parsed_data->'activities') as elem
WHERE (share_token = :'trip_identifier' OR id::text = :'trip_identifier')
  AND parsed_data ? 'activities'
LIMIT 10;

-- 6. Check highlights
SELECT
  '6️⃣ Highlights' as step,
  elem as highlight
FROM travel_trips,
     jsonb_array_elements_text(parsed_data->'highlights') as elem
WHERE (share_token = :'trip_identifier' OR id::text = :'trip_identifier')
  AND parsed_data ? 'highlights';

-- 7. Full parsed_data dump (for debugging)
SELECT
  '7️⃣ Full Data Dump' as step,
  jsonb_pretty(parsed_data) as full_parsed_data
FROM travel_trips
WHERE share_token = :'trip_identifier' OR id::text = :'trip_identifier';

-- ============================================
-- DIAGNOSTIC SUMMARY
-- ============================================
WITH trip_data AS (
  SELECT
    parsed_data,
    CASE
      WHEN parsed_data IS NULL THEN 'NO_DATA'
      WHEN parsed_data::text = '{}'::text THEN 'EMPTY'
      WHEN parsed_data ? 'error' THEN 'ERROR'
      WHEN parsed_data ? 'accommodations' THEN 'STRUCTURED'
      ELSE 'UNSTRUCTURED'
    END as data_quality
  FROM travel_trips
  WHERE share_token = :'trip_identifier' OR id::text = :'trip_identifier'
)
SELECT
  '🏁 DIAGNOSTIC SUMMARY' as summary,
  data_quality,
  CASE data_quality
    WHEN 'NO_DATA' THEN '❌ Critical: No parsed data available. Upload PDF or add source URLs.'
    WHEN 'EMPTY' THEN '❌ Critical: Parsed data is empty. Re-parse trip data.'
    WHEN 'ERROR' THEN '❌ Error during parsing. Check error message in full dump.'
    WHEN 'UNSTRUCTURED' THEN '⚠️ Warning: Data exists but not well structured. Consider re-parsing.'
    WHEN 'STRUCTURED' THEN '✅ Good: Data is properly structured with accommodations.'
    ELSE '⚠️ Unknown data quality'
  END as recommendation,
  (SELECT COUNT(*) FROM jsonb_object_keys(parsed_data)) as field_count,
  CASE
    WHEN parsed_data ? 'accommodations' THEN jsonb_array_length(parsed_data->'accommodations')
    ELSE 0
  END as accommodation_count,
  CASE
    WHEN parsed_data ? 'itinerary' THEN jsonb_array_length(parsed_data->'itinerary')
    ELSE 0
  END as day_count,
  CASE
    WHEN parsed_data ? 'activities' THEN jsonb_array_length(parsed_data->'activities')
    ELSE 0
  END as activity_count
FROM trip_data;

-- ============================================
-- QUICK FIXES
-- ============================================

-- If data is empty or bad, you can manually add structured data:
/*
UPDATE travel_trips
SET parsed_data = jsonb_build_object(
  'accommodations', jsonb_build_array(
    jsonb_build_object(
      'name', 'Hotel Name Here',
      'location', 'Johannesburg, South Africa',
      'check_in', '2024-01-01',
      'check_out', '2024-01-03',
      'nights', 2,
      'amenities', jsonb_build_array('WiFi', 'Pool', 'Restaurant')
    )
  ),
  'itinerary', jsonb_build_array(
    jsonb_build_object(
      'day', 1,
      'title', 'Arrival in Johannesburg',
      'location', 'Johannesburg',
      'description', 'Check in at hotel and explore the city'
    )
  )
)
WHERE share_token = 'YOUR_SHARE_TOKEN';
*/
