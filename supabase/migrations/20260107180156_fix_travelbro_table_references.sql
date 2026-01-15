/*
  # Fix TravelBro table references
  
  1. Changes
    - Update check_bro_expiry function to use travel_trips instead of trips
    - This fixes the WhatsApp "kan je bericht momenteel niet verwerken" error
  
  2. Why
    - The travelbro-chat Edge Function looks up trips in travel_trips table
    - But check_bro_expiry was looking in the trips table (catalog)
    - This caused a mismatch and trips couldn't be found
*/

-- Drop and recreate the check_bro_expiry function with correct table reference
CREATE OR REPLACE FUNCTION public.check_bro_expiry(trip_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
trip_record record;
expire_date date;
BEGIN
-- FIXED: Changed FROM trips to FROM travel_trips
SELECT trip_end_date, auto_expire_days, bro_status
INTO trip_record
FROM travel_trips
WHERE id = trip_id;

-- If not found or already stopped/expired, return false
IF NOT FOUND OR trip_record.bro_status != 'active' THEN
RETURN false;
END IF;

-- If no end date set, can't expire
IF trip_record.trip_end_date IS NULL THEN
RETURN false;
END IF;

-- Calculate expiry date
expire_date := trip_record.trip_end_date + trip_record.auto_expire_days;

-- Check if expired
IF CURRENT_DATE > expire_date THEN
-- Auto-expire the trip
-- FIXED: Changed UPDATE trips to UPDATE travel_trips
UPDATE travel_trips
SET bro_status = 'expired',
stopped_at = now(),
stopped_reason = 'Automatisch gestopt: ' || trip_record.auto_expire_days || ' dagen na terugkomst'
WHERE id = trip_id;

RETURN true;
END IF;

RETURN false;
END;
$function$;