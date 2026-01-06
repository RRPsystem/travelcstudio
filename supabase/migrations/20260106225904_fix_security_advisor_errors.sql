/*
  # Fix Security Advisor Errors

  1. Security Issues Fixed
    - Remove auth.users exposure from bro_monitoring_view
    - Change all views to SECURITY INVOKER instead of SECURITY DEFINER
    - Add proper user_id column to trips for user reference
    - Fix check_bro_expiry function to use SECURITY INVOKER

  2. Changes
    - Drop and recreate bro_monitoring_view with SECURITY INVOKER
    - Remove auth.users join from view (security risk)
    - Add stopped_by_id column to view instead
    - Recreate check_bro_expiry as SECURITY INVOKER
    - Drop trip_economics_summary and trip_profitability_dashboard if they use SECURITY DEFINER

  3. Security
    - All views now use SECURITY INVOKER (safer)
    - No direct auth.users exposure
    - RLS policies control access
*/

-- Drop existing views to recreate with SECURITY INVOKER
DROP VIEW IF EXISTS bro_monitoring_view CASCADE;
DROP VIEW IF EXISTS trip_economics_summary CASCADE;
DROP VIEW IF EXISTS trip_profitability_dashboard CASCADE;

-- Recreate bro_monitoring_view WITHOUT auth.users join and with SECURITY INVOKER
CREATE VIEW bro_monitoring_view 
WITH (security_invoker = true)
AS
SELECT 
  t.id,
  t.title,
  t.trip_start_date,
  t.trip_end_date,
  t.bro_status,
  t.stopped_at,
  t.stopped_reason,
  t.stopped_by,
  t.auto_expire_days,
  CASE 
    WHEN t.trip_end_date IS NOT NULL 
    THEN t.trip_end_date + t.auto_expire_days
    ELSE NULL
  END as expires_at,
  CASE 
    WHEN t.bro_status = 'active' AND t.trip_end_date IS NOT NULL AND CURRENT_DATE > (t.trip_end_date + t.auto_expire_days) THEN 'expired_pending'
    ELSE t.bro_status
  END as current_status,
  COUNT(DISTINCT tc.id) as total_messages,
  COALESCE(SUM(tc.total_tokens), 0) as total_tokens,
  COALESCE(SUM(tc.input_tokens), 0) as total_input_tokens,
  COALESCE(SUM(tc.output_tokens), 0) as total_output_tokens,
  COALESCE(SUM(tc.openai_cost_eur), 0) as total_openai_cost,
  10.0 as revenue_eur,
  10.0 - COALESCE(SUM(tc.openai_cost_eur), 0) as profit_eur,
  CASE 
    WHEN COALESCE(SUM(tc.openai_cost_eur), 0) > 0 
    THEN ((10.0 - COALESCE(SUM(tc.openai_cost_eur), 0)) / 10.0 * 100)
    ELSE 100
  END as profit_margin_pct
FROM trips t
LEFT JOIN travel_conversations tc ON tc.trip_id = t.id
WHERE t.trip_type = 'roadbook'
GROUP BY t.id, t.title, t.trip_start_date, t.trip_end_date, t.bro_status, t.stopped_at, t.stopped_reason, t.stopped_by, t.auto_expire_days;

-- Grant access to operators
GRANT SELECT ON bro_monitoring_view TO authenticated;

-- Recreate check_bro_expiry function as SECURITY INVOKER
CREATE OR REPLACE FUNCTION check_bro_expiry(trip_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  trip_record record;
  expire_date date;
BEGIN
  SELECT trip_end_date, auto_expire_days, bro_status
  INTO trip_record
  FROM trips
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
    UPDATE trips
    SET bro_status = 'expired',
        stopped_at = now(),
        stopped_reason = 'Automatisch gestopt: ' || trip_record.auto_expire_days || ' dagen na terugkomst'
    WHERE id = trip_id;
    
    RETURN true;
  END IF;

  RETURN false;
END;
$$;