/*
  # Fix Remaining Security Warnings
  
  1. Security Changes
    - Drop materialized view security_events_summary if it exists (replace with regular view)
    - Create regular view with RLS instead
    
  Note: Leaked Password Protection must be enabled via Supabase Dashboard:
    Authentication > Providers > Email > Enable "Password leak detection"
*/

-- Drop materialized view if it exists
DROP MATERIALIZED VIEW IF EXISTS public.security_events_summary CASCADE;

-- Create regular view instead (which supports RLS better)
CREATE OR REPLACE VIEW public.security_events_summary AS
SELECT 
  date_trunc('hour', created_at) as time_bucket,
  event_type,
  COUNT(*) as event_count,
  COUNT(DISTINCT user_id) as unique_users
FROM public.security_events
GROUP BY date_trunc('hour', created_at), event_type;

-- Enable RLS on the view
ALTER VIEW public.security_events_summary SET (security_invoker = true);

-- Note: The underlying security_events table already has proper RLS,
-- so this view will inherit those security policies
